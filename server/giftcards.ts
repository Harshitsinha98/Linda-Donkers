/**
 * Gift cards (cadeaubonnen): a stored euro balance with a code.
 *
 * - Bought online (Stripe) by anyone, or added by Linda (paid cash). Valid for 1 year.
 * - The code can pay (part of) a session or a class card. What is not used stays on the card:
 *   a €100 card used for a €90 class card keeps €10 for next time, and a €20 session can then be
 *   paid €10 from the card + €10 via Stripe.
 * - Every balance change is one atomic UPDATE plus a ledger row, so a balance can never go below
 *   zero, even when two checkouts use the same code at the same moment.
 * - Money taken for a checkout that is never paid goes back to the card ("release"); refunds of a
 *   cancelled booking return the gift card part to the card ("refund").
 */
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { all, get, run } from "./db.js";
import { sendGiftCard } from "./email.js";
import { HttpError, newId, newToken, safeEqual } from "./http.js";
import { Stripe, stripe, stripeConfigured } from "./stripe.js";
import { formatEuro, nowIso } from "./time.js";

export type GiftCardRow = {
  id: string;
  ref: string;
  token: string;
  code: string;
  code_key: string;
  initial_cents: number;
  balance_cents: number;
  buyer_name: string;
  buyer_email: string;
  recipient_name: string;
  recipient_email: string;
  message: string;
  lang: string;
  source: "web" | "manual";
  status: "pending" | "active" | "expired" | "cancelled";
  expires_at: string | null;
  amount_paid_cents: number;
  refunded_cents: number;
  stripe_checkout_id: string | null;
  stripe_payment_intent: string | null;
  created_at: string;
  activated_at: string | null;
  cancelled_at: string | null;
};

export const GIFT_MIN_CENTS = 1000;
export const GIFT_MAX_CENTS = 100_000;
const VALID_DAYS = 365;

/** Codes look like GIFT-7K3F-9QXM (no 0/O/1/I). Customers may type them with or without dashes. */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function newCode(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `GIFT-${out.slice(0, 4)}-${out.slice(4)}`;
}
export const codeKey = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^GIFT/, "");

const fail = (code: string, message: string, status = 400) => new HttpError(status, code, message);

const effectiveStatus = (g: GiftCardRow) =>
  g.status === "active" && g.expires_at && Date.parse(g.expires_at) <= Date.now() ? "expired" : g.status;

export const getGiftCard = (id: string) => get<GiftCardRow>(`SELECT * FROM gift_cards WHERE id = ?`, [id]);

/** A usable card for this code, or a specific error the website translates. */
export async function findUsable(rawCode: string): Promise<GiftCardRow> {
  const key = codeKey(rawCode);
  const g = key.length >= 6 ? await get<GiftCardRow>(`SELECT * FROM gift_cards WHERE code_key = ?`, [key]) : undefined;
  if (!g || g.status === "pending" || g.status === "cancelled") throw fail("gift_invalid", "This gift card code is not valid.");
  if (effectiveStatus(g) === "expired") throw fail("gift_expired", "This gift card has expired.");
  if (g.balance_cents <= 0) throw fail("gift_empty", "This gift card has no balance left.");
  return g;
}

export function giftPublic(g: GiftCardRow) {
  return {
    code: g.code,
    balanceCents: g.balance_cents,
    initialCents: g.initial_cents,
    expiresAt: g.expires_at,
    status: effectiveStatus(g),
  };
}

async function ledger(
  giftId: string,
  kind: "purchase" | "redeem" | "release" | "refund" | "adjust" | "cancel",
  amount: number,
  ref: { bookingId?: string | null; membershipId?: string | null; note?: string } = {},
) {
  const g = await getGiftCard(giftId);
  await run(
    `INSERT INTO gift_card_ledger (id, gift_card_id, kind, amount_cents, balance_after, booking_id, membership_id, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [newId(), giftId, kind, amount, g?.balance_cents ?? 0, ref.bookingId ?? null, ref.membershipId ?? null, ref.note ?? "", nowIso()],
  );
}

/**
 * Takes up to `dueCents` from the card for a purchase and returns how much was taken.
 * The UPDATE only succeeds while the balance is still there, so concurrent use can't overdraw it.
 */
export async function takeFromCard(rawCode: string, dueCents: number): Promise<{ card: GiftCardRow; takenCents: number }> {
  if (dueCents <= 0) throw fail("gift_not_needed", "There is nothing to pay.");
  for (let attempt = 0; attempt < 3; attempt++) {
    const g = await findUsable(rawCode);
    const take = Math.min(g.balance_cents, dueCents);
    const changed = await run(
      `UPDATE gift_cards SET balance_cents = balance_cents - ?
       WHERE id = ? AND status = 'active' AND expires_at > ? AND balance_cents >= ?`,
      [take, g.id, nowIso(), take],
    );
    if (changed) return { card: g, takenCents: take };
  }
  throw fail("gift_empty", "This gift card has no balance left.");
}

/** Records what a taken amount was used for (called once the booking / class card row exists). */
export async function recordRedeem(giftId: string, amount: number, ref: { bookingId?: string; membershipId?: string }) {
  await ledger(giftId, "redeem", -amount, ref);
}

/** Undoes a take that was never recorded (the purchase failed before the booking existed). No history line. */
export async function restoreCard(giftId: string, amount: number) {
  if (amount > 0) await run(`UPDATE gift_cards SET balance_cents = balance_cents + ? WHERE id = ?`, [amount, giftId]);
}

/** Puts money back on a card: a checkout that was never paid ("release") or a refund. */
export async function creditCard(
  giftId: string | null | undefined,
  amount: number,
  kind: "release" | "refund",
  ref: { bookingId?: string | null; membershipId?: string | null; note?: string } = {},
) {
  if (!giftId || amount <= 0) return;
  await run(`UPDATE gift_cards SET balance_cents = balance_cents + ? WHERE id = ?`, [amount, giftId]);
  await ledger(giftId, kind, amount, ref);
}

/* ---------------- buying a gift card ---------------- */

export const giftPurchaseInput = z.object({
  amountCents: z.number().int().min(GIFT_MIN_CENTS).max(GIFT_MAX_CENTS),
  buyerName: z.string().trim().min(1).max(120),
  buyerEmail: z.string().trim().toLowerCase().email().max(200),
  recipientName: z.string().trim().max(120).default(""),
  recipientEmail: z.string().trim().toLowerCase().email().max(200).or(z.literal("")).default(""),
  message: z.string().trim().max(500).default(""),
  lang: z.enum(["nl", "en"]).default("nl"),
  acceptTerms: z.literal(true),
});

async function insertCard(fields: {
  initial: number; buyerName: string; buyerEmail: string; recipientName: string; recipientEmail: string; message: string;
  lang: string; source: "web" | "manual"; status: "pending" | "active"; paid: number;
}) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    const id = newId();
    const ref = `LG-${code.slice(-4)}${randomBytes(2).toString("hex").toUpperCase()}`;
    const now = new Date();
    const active = fields.status === "active";
    try {
      await run(
        `INSERT INTO gift_cards (id, ref, token, code, code_key, initial_cents, balance_cents, buyer_name, buyer_email, recipient_name,
           recipient_email, message, lang, source, status, expires_at, amount_paid_cents, created_at, activated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, ref, newToken(), code, codeKey(code), fields.initial, active ? fields.initial : 0, fields.buyerName, fields.buyerEmail,
          fields.recipientName, fields.recipientEmail, fields.message, fields.lang, fields.source, fields.status,
          active ? new Date(now.getTime() + VALID_DAYS * 86_400_000).toISOString() : null, fields.paid, now.toISOString(),
          active ? now.toISOString() : null,
        ],
      );
      if (active) await ledger(id, "purchase", fields.initial, { note: fields.source === "manual" ? "Added by Linda" : "" });
      return (await getGiftCard(id))!;
    } catch (err) {
      if (!/UNIQUE/i.test(String(err))) throw err; // code collision: try another one
    }
  }
  throw new Error("Could not create a unique gift card code");
}

export async function startGiftPurchase(input: z.infer<typeof giftPurchaseInput>, base: string) {
  if (!stripeConfigured()) throw new HttpError(503, "payments_unavailable");
  const g = await insertCard({
    initial: input.amountCents, buyerName: input.buyerName, buyerEmail: input.buyerEmail, recipientName: input.recipientName,
    recipientEmail: input.recipientEmail, message: input.message, lang: input.lang, source: "web", status: "pending", paid: input.amountCents,
  });
  const en = input.lang === "en";
  try {
    const cs = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: input.amountCents,
              product_data: {
                name: en ? "Gift card Linda Donkers" : "Cadeaubon Linda Donkers",
                description: [
                  en ? "Valid for 1 year" : "1 jaar geldig",
                  input.recipientName ? (en ? `For ${input.recipientName}` : `Voor ${input.recipientName}`) : "",
                ].filter(Boolean).join(" · "),
              },
            },
          },
        ],
        customer_email: input.buyerEmail,
        client_reference_id: g.id,
        metadata: { kind: "giftcard", gift_card_id: g.id, ref: g.ref },
        payment_intent_data: { description: `${g.ref} · gift card`, metadata: { kind: "giftcard", gift_card_id: g.id, ref: g.ref } },
        locale: en ? "en" : "nl",
        expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
        success_url: `${base}/cadeaubon?ref=${g.ref}&t=${g.token}&paid=1`,
        cancel_url: `${base}/cadeaubon?aborted=1`,
      },
      { idempotencyKey: `giftcard-${g.id}` },
    );
    await run(`UPDATE gift_cards SET stripe_checkout_id = ? WHERE id = ?`, [cs.id, g.id]);
    if (!cs.url) throw new Error("Stripe returned no checkout URL");
    return { url: cs.url };
  } catch (err) {
    await run(`UPDATE gift_cards SET status = 'expired' WHERE id = ? AND status = 'pending'`, [g.id]);
    console.error("[stripe] gift card checkout failed", err);
    throw new HttpError(502, "payments_unavailable");
  }
}

/** Marks a bought card paid: balance and validity start now. Idempotent, the email goes out once. */
export async function activateGiftCard(id: string, paymentIntent: string | null, base: string) {
  const now = new Date();
  const changed = await run(
    `UPDATE gift_cards SET status = 'active', balance_cents = initial_cents, activated_at = ?, expires_at = ?,
       stripe_payment_intent = COALESCE(?, stripe_payment_intent)
     WHERE id = ? AND status IN ('pending','expired') AND activated_at IS NULL`,
    [now.toISOString(), new Date(now.getTime() + VALID_DAYS * 86_400_000).toISOString(), paymentIntent, id],
  );
  if (!changed) return;
  await ledger(id, "purchase", (await getGiftCard(id))!.initial_cents);
  await sendGiftCard((await getGiftCard(id))!, base);
}

const intentId = (cs: Stripe.Checkout.Session) =>
  typeof cs.payment_intent === "string" ? cs.payment_intent : (cs.payment_intent?.id ?? null);

export async function applyGiftCheckout(cs: Stripe.Checkout.Session, base: string) {
  const id = cs.metadata?.gift_card_id || cs.client_reference_id;
  if (!id) return;
  if (cs.status === "complete" && cs.payment_status === "paid") await activateGiftCard(id, intentId(cs), base);
  else if (cs.status === "expired") await run(`UPDATE gift_cards SET status = 'expired' WHERE id = ? AND status = 'pending'`, [id]);
}

/** The buyer's view after paying (link with a secret token, also in the email). */
export async function giftStatus(ref: string, token: string, base: string) {
  let g = await get<GiftCardRow>(`SELECT * FROM gift_cards WHERE ref = ?`, [ref]);
  if (!g || !token || !safeEqual(token, g.token)) throw new HttpError(404, "not_found");
  if (g.status === "pending" && g.stripe_checkout_id && stripeConfigured()) {
    try {
      await applyGiftCheckout(await stripe().checkout.sessions.retrieve(g.stripe_checkout_id), base);
      g = (await getGiftCard(g.id))!;
    } catch (err) {
      console.error("[stripe] gift card sync failed", err);
    }
  }
  return {
    ref: g.ref,
    status: effectiveStatus(g),
    code: g.status === "pending" ? "" : g.code,
    initialCents: g.initial_cents,
    balanceCents: g.balance_cents,
    expiresAt: g.expires_at,
    recipientName: g.recipient_name,
    recipientEmail: g.recipient_email,
    buyerEmail: g.buyer_email,
  };
}

/* ---------------- customer account ---------------- */

export async function listForEmail(email: string) {
  const rows = await all<GiftCardRow>(
    `SELECT * FROM gift_cards WHERE (buyer_email = ? OR recipient_email = ?) AND activated_at IS NOT NULL ORDER BY created_at DESC LIMIT 50`,
    [email, email],
  );
  return rows.map((g) => ({
    ...giftPublic(g),
    ref: g.ref,
    role: g.recipient_email === email ? ("received" as const) : ("bought" as const),
    recipientName: g.recipient_name,
    createdAt: g.created_at,
  }));
}

/* ---------------- admin ---------------- */

export const giftGrantInput = z.object({
  amountCents: z.number().int().min(100).max(GIFT_MAX_CENTS),
  buyerName: z.string().trim().min(1).max(120),
  buyerEmail: z.string().trim().toLowerCase().email().max(200),
  recipientName: z.string().trim().max(120).default(""),
  recipientEmail: z.string().trim().toLowerCase().email().max(200).or(z.literal("")).default(""),
  message: z.string().trim().max(500).default(""),
  paidCents: z.number().int().min(0).max(GIFT_MAX_CENTS).default(0),
  lang: z.enum(["nl", "en"]).default("nl"),
  sendEmail: z.boolean().default(true),
});

/** Linda sells a gift card herself (cash, transfer): active straight away. */
export async function grantGiftCard(input: z.infer<typeof giftGrantInput>, base: string) {
  const g = await insertCard({
    initial: input.amountCents, buyerName: input.buyerName, buyerEmail: input.buyerEmail, recipientName: input.recipientName,
    recipientEmail: input.recipientEmail, message: input.message, lang: input.lang, source: "manual", status: "active", paid: input.paidCents,
  });
  if (input.sendEmail) await sendGiftCard(g, base);
  return { ref: g.ref, code: g.code };
}

export const giftAdjustInput = z.object({
  id: z.string().min(1),
  balanceCents: z.number().int().min(0).max(GIFT_MAX_CENTS),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(200).default(""),
});

export async function adjustGiftCard(input: z.infer<typeof giftAdjustInput>) {
  const g = await getGiftCard(input.id);
  if (!g || g.status === "pending" || g.status === "cancelled") throw new HttpError(404, "not_found");
  await run(`UPDATE gift_cards SET balance_cents = ?, expires_at = ?, status = 'active' WHERE id = ?`, [
    input.balanceCents, new Date(`${input.expiresAt}T23:59:59Z`).toISOString(), g.id,
  ]);
  await ledger(g.id, "adjust", input.balanceCents - g.balance_cents, { note: input.note || "Adjusted by Linda" });
}

/** Cancels a card. With `refund`, the unused balance of an online purchase is refunded via Stripe. */
export async function cancelGiftCard(id: string, refund: boolean) {
  const g = await getGiftCard(id);
  if (!g || g.status !== "active") throw new HttpError(409, "not_cancellable", "Only active gift cards can be cancelled.");
  const refundable = Math.min(g.balance_cents, g.amount_paid_cents - g.refunded_cents);
  let refunded = 0;
  if (refund && g.stripe_payment_intent && refundable > 0) {
    try {
      await stripe().refunds.create(
        { payment_intent: g.stripe_payment_intent, amount: refundable, metadata: { gift_card_id: g.id, ref: g.ref } },
        { idempotencyKey: `grefund-${g.id}-${refundable}` },
      );
      refunded = refundable;
    } catch (err) {
      throw new HttpError(502, "refund_failed", `Stripe refund failed: ${(err as Error).message}`);
    }
  }
  const changed = await run(
    `UPDATE gift_cards SET status = 'cancelled', cancelled_at = ?, refunded_cents = refunded_cents + ?, balance_cents = 0
     WHERE id = ? AND status = 'active'`,
    [nowIso(), refunded, g.id],
  );
  if (changed) await ledger(g.id, "cancel", -g.balance_cents, { note: refunded ? `Refunded ${formatEuro(refunded, "en")}` : "" });
  return { refundedCents: refunded };
}

export async function listGiftCardsAdmin() {
  const rows = await all<GiftCardRow>(`SELECT * FROM gift_cards WHERE activated_at IS NOT NULL ORDER BY created_at DESC LIMIT 500`);
  const ledgerRows = await all<{ gift_card_id: string; kind: string; amount_cents: number; balance_after: number; note: string; created_at: string; ref: string | null }>(
    `SELECT l.gift_card_id, l.kind, l.amount_cents, l.balance_after, l.note, l.created_at,
       COALESCE((SELECT ref FROM bookings b WHERE b.id = l.booking_id), (SELECT ref FROM memberships m WHERE m.id = l.membership_id)) AS ref
     FROM gift_card_ledger l ORDER BY l.created_at ASC`,
  );
  return rows.map((g) => ({
    id: g.id,
    ref: g.ref,
    code: g.code,
    initialCents: g.initial_cents,
    balanceCents: g.balance_cents,
    buyerName: g.buyer_name,
    buyerEmail: g.buyer_email,
    recipientName: g.recipient_name,
    recipientEmail: g.recipient_email,
    message: g.message,
    source: g.source,
    status: effectiveStatus(g),
    expiresAt: g.expires_at,
    paidCents: g.amount_paid_cents,
    refundedCents: g.refunded_cents,
    paidOnline: !!g.stripe_payment_intent,
    createdAt: g.created_at,
    history: ledgerRows
      .filter((l) => l.gift_card_id === g.id)
      .map((l) => ({ kind: l.kind, amountCents: l.amount_cents, balanceAfter: l.balance_after, note: l.note, ref: l.ref ?? "", at: l.created_at })),
  }));
}
