/**
 * Memberships: class cards and treatment packages ("10 group classes, valid 1 year").
 *
 * - A *plan* is what Linda sells. She creates and edits plans in the admin panel:
 *   name, price, number of credits, how long it's valid and which offers it covers.
 * - A *pass* is one sold plan. The plan's terms are copied onto the pass when it's
 *   bought, so editing a plan later never changes what someone already paid for.
 * - The validity starts when the pass is paid (or added by Linda).
 * - Booking a covered session with a pass uses 1 credit per person instead of paying.
 *
 * Passes belong to an email address, and to the Supabase user that bought them. When a
 * customer logs in with that (verified) email, they see and can use the pass.
 */
import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { AuthUser } from "./auth.js";
import { quoteCoupon } from "./coupons.js";
import { all, get, run } from "./db.js";
import { sendPassActivated } from "./email.js";
import { HttpError, newId } from "./http.js";
import { createCheckoutSession, stripeConfigured, type Stripe } from "./stripe.js";
import { nowIso } from "./time.js";
import { COVER_KEYS, OFFER_KEYS, parseOffers, type OfferKey } from "../shared/catalog.js";

/** Same payment window as session bookings. */
const CHECKOUT_MINUTES = 31;
const HOLD_MS = (CHECKOUT_MINUTES + 4) * 60_000;

/* ---------------- plans ---------------- */

export type PlanRow = {
  id: string;
  name_nl: string;
  name_en: string;
  description_nl: string;
  description_en: string;
  price_cents: number;
  credits: number;
  validity_days: number;
  offers: string;
  cover: string;
  active: number;
  sort: number;
  created_at: string;
  updated_at: string;
};

export const planInput = z.object({
  nameNl: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().max(120).default(""),
  descriptionNl: z.string().trim().max(2000).default(""),
  descriptionEn: z.string().trim().max(2000).default(""),
  priceCents: z.number().int().min(0).max(1_000_000),
  credits: z.number().int().min(1).max(500),
  validityDays: z.number().int().min(1).max(3650),
  offers: z.array(z.enum(OFFER_KEYS)).min(1, "Pick at least one session type.").max(OFFER_KEYS.length),
  cover: z.enum(["", ...COVER_KEYS] as [string, ...string[]]).default(""),
  active: z.boolean().default(true),
  sort: z.number().int().min(0).max(1000).default(0),
});
export type PlanInput = z.infer<typeof planInput>;

export function publicPlan(p: PlanRow) {
  return {
    id: p.id,
    name: { nl: p.name_nl, en: p.name_en || p.name_nl },
    description: { nl: p.description_nl, en: p.description_en || p.description_nl },
    priceCents: p.price_cents,
    credits: p.credits,
    validityDays: p.validity_days,
    offers: parseOffers(p.offers),
    cover: p.cover,
    active: !!p.active,
    sort: p.sort,
  };
}
export type PublicPlan = ReturnType<typeof publicPlan>;

export const listPlans = async (activeOnly: boolean) =>
  (await all<PlanRow>(`SELECT * FROM membership_plans ${activeOnly ? "WHERE active = 1" : ""} ORDER BY sort ASC, created_at ASC`)).map(publicPlan);

const planColumns = (i: PlanInput) => ({
  name_nl: i.nameNl,
  name_en: i.nameEn,
  description_nl: i.descriptionNl,
  description_en: i.descriptionEn,
  price_cents: i.priceCents,
  credits: i.credits,
  validity_days: i.validityDays,
  offers: JSON.stringify(i.offers),
  cover: i.cover,
  active: i.active ? 1 : 0,
  sort: i.sort,
});

export async function createPlan(i: PlanInput) {
  const cols = planColumns(i);
  const keys = Object.keys(cols);
  const id = newId();
  const now = nowIso();
  await run(`INSERT INTO membership_plans (id, ${keys.join(", ")}, created_at, updated_at) VALUES (?, ${keys.map(() => "?").join(", ")}, ?, ?)`, [
    id,
    ...Object.values(cols),
    now,
    now,
  ]);
  return id;
}

export async function updatePlan(id: string, i: PlanInput) {
  const cols = planColumns(i);
  const keys = Object.keys(cols);
  const n = await run(`UPDATE membership_plans SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = ? WHERE id = ?`, [...Object.values(cols), nowIso(), id]);
  if (!n) throw new HttpError(404, "not_found");
}

/** Plans that were sold are hidden instead of deleted, so existing passes keep their link. */
export async function deletePlan(id: string) {
  const sold = await get<{ n: number }>(`SELECT COUNT(*) AS n FROM member_passes WHERE plan_id = ?`, [id]);
  if (sold && sold.n > 0) {
    await run(`UPDATE membership_plans SET active = 0, updated_at = ? WHERE id = ?`, [nowIso(), id]);
    return { deactivated: true };
  }
  await run(`DELETE FROM membership_plans WHERE id = ?`, [id]);
  return { deactivated: false };
}

/* ---------------- passes ---------------- */

export type PassRow = {
  id: string;
  code: string;
  plan_id: string | null;
  name_nl: string;
  name_en: string;
  user_id: string | null;
  email: string;
  buyer_name: string;
  credits_total: number;
  credits_used: number;
  offers: string;
  validity_days: number;
  valid_until: string | null;
  amount_cents: number;
  discount_cents: number;
  coupon_id: string | null;
  lang: string;
  source: "web" | "manual";
  status: "pending" | "active" | "cancelled" | "expired";
  hold_until: string | null;
  stripe_checkout_id: string | null;
  stripe_payment_intent: string | null;
  note: string;
  created_at: string;
  activated_at: string | null;
};

/** Human-friendly pass code, e.g. LDM-4K7Q2X (no 0/O/1/I). */
function newPassCode() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let out = "";
  for (const b of randomBytes(6)) out += alphabet[b % alphabet.length];
  return `LDM-${out}`;
}

export const getPass = (id: string) => get<PassRow>(`SELECT * FROM member_passes WHERE id = ?`, [id]);

/** "active" passes past their end date are reported as expired. */
const effectiveStatus = (p: PassRow) => (p.status === "active" && p.valid_until && Date.parse(p.valid_until) <= Date.now() ? "expired" : p.status);

export function passView(p: PassRow) {
  return {
    id: p.id,
    code: p.code,
    planId: p.plan_id,
    name: { nl: p.name_nl, en: p.name_en || p.name_nl },
    email: p.email,
    buyerName: p.buyer_name,
    creditsTotal: p.credits_total,
    creditsUsed: p.credits_used,
    creditsLeft: p.credits_total - p.credits_used,
    offers: parseOffers(p.offers),
    validityDays: p.validity_days,
    validUntil: p.valid_until,
    amountCents: p.amount_cents,
    discountCents: p.discount_cents,
    source: p.source,
    status: effectiveStatus(p),
    note: p.note,
    createdAt: p.created_at,
    activatedAt: p.activated_at,
  };
}
export type PassView = ReturnType<typeof passView>;

/** Passes a logged-in customer can see: bought with their account, or registered on their email. */
export async function passesForUser(user: AuthUser) {
  const rows = await all<PassRow>(
    `SELECT * FROM member_passes WHERE (user_id = ? OR email = ?) AND status IN ('active','expired','cancelled')
     ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, created_at DESC`,
    [user.id, user.email],
  );
  return rows.map(passView);
}

/** Active passes with credits left that cover this session (and are still valid on its date). */
export async function usablePasses(user: AuthUser, s: { offer: string; starts_at: string }) {
  if (!s.offer) return [];
  const rows = await all<PassRow>(
    `SELECT * FROM member_passes WHERE (user_id = ? OR email = ?) AND status = 'active'
       AND credits_used < credits_total AND valid_until > ? AND valid_until >= ?
     ORDER BY valid_until ASC`,
    [user.id, user.email, nowIso(), s.starts_at],
  );
  return rows.filter((p) => parseOffers(p.offers).includes(s.offer as OfferKey)).map(passView);
}

/**
 * Takes `n` credits from a pass in one atomic UPDATE, so two bookings at the same time
 * can't spend the same last credit. Returns false if the pass can't cover it.
 */
export async function consumeCredits(passId: string, user: AuthUser, n: number, s: { offer: string; starts_at: string }) {
  const p = await getPass(passId);
  if (!p || (p.user_id !== user.id && p.email !== user.email)) throw new HttpError(404, "pass_not_found", "Membership not found.");
  if (!s.offer || !parseOffers(p.offers).includes(s.offer as OfferKey)) {
    throw new HttpError(400, "pass_not_applicable", "Your membership doesn't cover this session.");
  }
  const changed = await run(
    `UPDATE member_passes SET credits_used = credits_used + ?
     WHERE id = ? AND status = 'active' AND credits_used + ? <= credits_total AND valid_until > ? AND valid_until >= ?`,
    [n, passId, n, nowIso(), s.starts_at],
  );
  if (!changed) throw new HttpError(409, "pass_no_credits", "Not enough credits left on your membership, or it has expired.");
  // Link a pass Linda registered on this email to the account that uses it.
  if (!p.user_id) await run(`UPDATE member_passes SET user_id = ? WHERE id = ? AND user_id IS NULL`, [user.id, passId]);
  return p;
}

export async function restoreCredits(passId: string, n: number) {
  if (n <= 0) return;
  await run(`UPDATE member_passes SET credits_used = MAX(0, credits_used - ?) WHERE id = ?`, [n, passId]);
}

/* ---------------- buying ---------------- */

export const buyInput = z.object({
  planId: z.string().min(1).max(64),
  couponCode: z.string().trim().max(40).default(""),
  name: z.string().trim().max(120).default(""),
  lang: z.enum(["nl", "en"]).default("nl"),
  acceptTerms: z.literal(true),
});

export async function buyMembership(user: AuthUser, input: z.infer<typeof buyInput>, base: string) {
  const plan = await get<PlanRow>(`SELECT * FROM membership_plans WHERE id = ? AND active = 1`, [input.planId]);
  if (!plan) throw new HttpError(404, "plan_unavailable", "This membership is no longer available.");

  let discount = 0;
  let couponId: string | null = null;
  if (input.couponCode) {
    const q = await quoteCoupon(input.couponCode, { kind: "membership" }, plan.price_cents, user.email);
    discount = q.discountCents;
    couponId = q.coupon.id;
  }
  const amount = plan.price_cents - discount;
  const paid = amount > 0;
  if (paid && !stripeConfigured()) throw new HttpError(503, "payments_unavailable");

  const id = newId();
  const now = nowIso();
  await run(
    `INSERT INTO member_passes (id, code, plan_id, name_nl, name_en, user_id, email, buyer_name, credits_total, offers, validity_days,
       amount_cents, discount_cents, coupon_id, lang, source, status, hold_until, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'web', 'pending', ?, ?)`,
    [
      id, newPassCode(), plan.id, plan.name_nl, plan.name_en, user.id, user.email, input.name || user.name, plan.credits, plan.offers,
      plan.validity_days, amount, discount, couponId, input.lang, paid ? new Date(Date.now() + HOLD_MS).toISOString() : null, now,
    ],
  );

  if (!paid) {
    await activatePass(id, null, base);
    return { passId: id };
  }

  const name = input.lang === "en" && plan.name_en ? plan.name_en : plan.name_nl;
  const desc =
    input.lang === "en"
      ? `${plan.credits} credits, valid for ${plan.validity_days} days from purchase`
      : `${plan.credits} beurten, ${plan.validity_days} dagen geldig vanaf aankoop`;
  try {
    const cs = await createCheckoutSession(
      {
        mode: "payment",
        line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: amount, product_data: { name, description: desc } } }],
        customer_email: user.email,
        client_reference_id: id,
        metadata: { kind: "membership", pass_id: id },
        payment_intent_data: { description: `Membership · ${plan.name_nl}`, metadata: { kind: "membership", pass_id: id } },
        locale: input.lang === "en" ? "en" : "nl",
        expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_MINUTES * 60,
        success_url: `${base}/account?pass=${id}&paid=1`,
        cancel_url: `${base}/lidmaatschap?aborted=1`,
      },
      `membership-${id}`,
    );
    await run(`UPDATE member_passes SET stripe_checkout_id = ? WHERE id = ?`, [cs.id, id]);
    if (!cs.url) throw new Error("Stripe returned no checkout URL");
    return { url: cs.url };
  } catch (err) {
    await run(`UPDATE member_passes SET status = 'expired', hold_until = NULL WHERE id = ? AND status = 'pending'`, [id]);
    console.error("[stripe] membership checkout failed", err);
    throw new HttpError(502, "payments_unavailable");
  }
}

/** Starts a pass: the validity period begins now. Idempotent, the email goes out once. */
export async function activatePass(id: string, paymentIntent: string | null, base: string) {
  const p = await getPass(id);
  if (!p) return;
  const now = new Date();
  const until = new Date(now.getTime() + p.validity_days * 86_400_000).toISOString();
  const changed = await run(
    `UPDATE member_passes SET status = 'active', activated_at = ?, valid_until = ?, hold_until = NULL,
       stripe_payment_intent = COALESCE(?, stripe_payment_intent)
     WHERE id = ? AND status IN ('pending','expired') AND activated_at IS NULL`,
    [now.toISOString(), until, paymentIntent, id],
  );
  if (changed) await sendPassActivated((await getPass(id))!, base);
}

const intentId = (cs: Stripe.Checkout.Session) =>
  typeof cs.payment_intent === "string" ? cs.payment_intent : (cs.payment_intent?.id ?? null);

/** Applies a membership Checkout Session's outcome (webhook, or fallback check from the account page). */
export async function applyMembershipCheckout(cs: Stripe.Checkout.Session, base: string) {
  const id = cs.metadata?.pass_id || cs.client_reference_id;
  if (!id) return;
  if (cs.status === "complete" && (cs.payment_status === "paid" || cs.payment_status === "no_payment_required")) {
    await activatePass(id, intentId(cs), base);
  } else if (cs.status === "complete" && cs.payment_status === "unpaid") {
    await run(`UPDATE member_passes SET hold_until = ? WHERE id = ? AND status = 'pending'`, [new Date(Date.now() + 14 * 86_400_000).toISOString(), id]);
  } else if (cs.status === "expired") {
    await run(`UPDATE member_passes SET status = 'expired', hold_until = NULL WHERE id = ? AND status = 'pending'`, [id]);
  }
}

/* ---------------- admin ---------------- */

export const manualPassInput = z.object({
  planId: z.string().min(1).max(64),
  email: z.string().trim().toLowerCase().email().max(200),
  buyerName: z.string().trim().max(120).default(""),
  amountCents: z.number().int().min(0).max(1_000_000),
  note: z.string().trim().max(500).default(""),
  sendEmail: z.boolean().default(true),
});

/** For a card Linda sold herself (cash, bank transfer). Starts right away. */
export async function createManualPass(i: z.infer<typeof manualPassInput>, base: string) {
  const plan = await get<PlanRow>(`SELECT * FROM membership_plans WHERE id = ?`, [i.planId]);
  if (!plan) throw new HttpError(404, "not_found");
  const id = newId();
  const now = new Date();
  await run(
    `INSERT INTO member_passes (id, code, plan_id, name_nl, name_en, email, buyer_name, credits_total, offers, validity_days, valid_until,
       amount_cents, lang, source, status, note, created_at, activated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'nl', 'manual', 'active', ?, ?, ?)`,
    [
      id, newPassCode(), plan.id, plan.name_nl, plan.name_en, i.email, i.buyerName, plan.credits, plan.offers, plan.validity_days,
      new Date(now.getTime() + plan.validity_days * 86_400_000).toISOString(), i.amountCents, i.note, now.toISOString(), now.toISOString(),
    ],
  );
  if (i.sendEmail) await sendPassActivated((await getPass(id))!, base, { notifyAdmin: false });
  return { id };
}

export const passUpdateInput = z.object({
  creditsUsed: z.number().int().min(0).max(500),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD"),
  note: z.string().trim().max(500).default(""),
  cancelled: z.boolean().default(false),
});

/** Linda corrects a pass: credits used, end date (e.g. extend after an illness), or cancel it. */
export async function updatePass(id: string, i: z.infer<typeof passUpdateInput>) {
  const p = await getPass(id);
  if (!p) throw new HttpError(404, "not_found");
  if (p.status === "pending") throw new HttpError(409, "pending", "This membership hasn't been paid yet.");
  if (i.creditsUsed > p.credits_total) throw new HttpError(400, "invalid_input", `Credits used can be at most ${p.credits_total}.`);
  await run(`UPDATE member_passes SET credits_used = ?, valid_until = ?, note = ?, status = ? WHERE id = ?`, [
    i.creditsUsed,
    new Date(`${i.validUntil}T23:59:59+01:00`).toISOString(),
    i.note,
    i.cancelled ? "cancelled" : "active",
    id,
  ]);
}

export async function listPassesAdmin() {
  const rows = await all<PassRow & { bookings: number }>(
    `SELECT p.*, (SELECT COUNT(*) FROM bookings b WHERE b.pass_id = p.id AND b.status = 'confirmed') AS bookings
     FROM member_passes p WHERE p.status <> 'pending' OR p.hold_until > ? ORDER BY p.created_at DESC LIMIT 500`,
    [nowIso()],
  );
  return rows.map((r) => ({ ...passView(r), bookings: r.bookings, paidOnline: !!r.stripe_payment_intent }));
}

/* ---------------- starter plans ---------------- */

/** Linda's packages (Oct 2026). Only added when there are no plans yet. */
export const DEFAULT_PLANS: PlanInput[] = [
  {
    nameNl: "10-beurtenkaart Kundalini Yoga",
    nameEn: "10-class card Kundalini Yoga",
    descriptionNl: "Tien groepslessen Kundalini Yoga van 90 minuten. Een jaar geldig vanaf aankoop.",
    descriptionEn: "Ten 90-minute Kundalini Yoga group classes. Valid for one year from purchase.",
    priceCents: 20000,
    credits: 10,
    validityDays: 365,
    offers: ["yoga-group"],
    cover: "happy",
    active: true,
    sort: 1,
  },
  {
    nameNl: "5 × M.E.R. Myo Fascia Energetic Release",
    nameEn: "5 × M.E.R. Myo Fascia Energetic Release",
    descriptionNl: "Vijf therapeutische massages van 90 minuten. Een jaar geldig vanaf aankoop.",
    descriptionEn: "Five 90-minute therapy massages. Valid for one year from purchase.",
    priceCents: 60000,
    credits: 5,
    validityDays: 365,
    offers: ["mer"],
    cover: "lomi3",
    active: true,
    sort: 2,
  },
  {
    nameNl: "5 × Lomi Lomi Nui massage",
    nameEn: "5 × Lomi Lomi Nui massage",
    descriptionNl: "Vijf Hawaiiaanse oliemassages van 90 minuten. Een jaar geldig vanaf aankoop.",
    descriptionEn: "Five 90-minute Hawaiian oil massages. Valid for one year from purchase.",
    priceCents: 60000,
    credits: 5,
    validityDays: 365,
    offers: ["lomi"],
    cover: "lomi1",
    active: true,
    sort: 3,
  },
];

export async function seedPlansIfEmpty() {
  const n = await get<{ n: number }>(`SELECT COUNT(*) AS n FROM membership_plans`);
  if (n && n.n > 0) return 0;
  for (const p of DEFAULT_PLANS) await createPlan(p);
  return DEFAULT_PLANS.length;
}
