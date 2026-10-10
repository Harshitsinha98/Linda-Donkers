import { z } from "zod";
import { all, get, run } from "./db.js";
import { sendBookingCancelled, sendBookingConfirmed } from "./email.js";
import { HttpError, newId, newRef, newToken, safeEqual } from "./http.js";
import { getSessionRow, getSessionWithTaken, TAKEN_SQL, toPublic, type SessionRow } from "./sessions.js";
import { Stripe, stripe, stripeConfigured } from "./stripe.js";
import { formatWhen, nowIso } from "./time.js";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "expired";

export type BookingRow = {
  id: string;
  ref: string;
  token: string;
  session_id: string;
  name: string;
  email: string;
  phone: string;
  note: string;
  seats: number;
  amount_cents: number;
  refunded_cents: number;
  lang: string;
  source: "web" | "manual";
  status: BookingStatus;
  hold_until: string | null;
  stripe_checkout_id: string | null;
  stripe_payment_intent: string | null;
  created_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
};

/** Stripe Checkout must stay open at least 30 minutes; the place is held a little longer than that. */
const CHECKOUT_MINUTES = 31;
const HOLD_MS = (CHECKOUT_MINUTES + 4) * 60_000;

/* ---------------- refund policy ---------------- */

/** 48h+ before the start: 100%. 24–48h: 50%. Under 24h: 0%. */
export function refundPercent(startsAt: string, now = Date.now()): 0 | 50 | 100 {
  const hours = (Date.parse(startsAt) - now) / 3_600_000;
  if (hours >= 48) return 100;
  if (hours >= 24) return 50;
  return 0;
}

export function refundPreview(b: BookingRow, s: SessionRow) {
  const allowed = b.status === "confirmed" && Date.parse(s.starts_at) > Date.now();
  const percent = refundPercent(s.starts_at);
  const cents = b.stripe_payment_intent ? Math.max(0, Math.round((b.amount_cents * percent) / 100) - b.refunded_cents) : 0;
  return { allowed, percent, cents };
}

/* ---------------- lookups ---------------- */

export const getBooking = (id: string) => get<BookingRow>(`SELECT * FROM bookings WHERE id = ?`, [id]);

/** Looks up a booking by its reference and verifies the secret token from the customer's link. */
export async function getBookingForCustomer(ref: string, token: string) {
  const b = await get<BookingRow>(`SELECT * FROM bookings WHERE ref = ?`, [ref]);
  if (!b || !token || !safeEqual(token, b.token)) throw new HttpError(404, "not_found");
  return b;
}

/* ---------------- create ---------------- */

export const checkoutInput = z.object({
  sessionId: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().min(6).max(40),
  note: z.string().trim().max(1000).default(""),
  seats: z.number().int().min(1).max(50),
  lang: z.enum(["nl", "en"]).default("nl"),
  acceptTerms: z.literal(true),
});

/**
 * Reserves places in one atomic INSERT ... SELECT that only succeeds while enough
 * capacity is left, so the session can never be overbooked by concurrent requests.
 */
async function insertIfCapacity(b: Omit<BookingRow, "refunded_cents" | "stripe_checkout_id" | "stripe_payment_intent" | "cancelled_at" | "cancelled_by">) {
  const now = nowIso();
  return run(
    `INSERT INTO bookings (id, ref, token, session_id, name, email, phone, note, seats, amount_cents, lang, source, status, hold_until, created_at, confirmed_at)
     SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
     WHERE (SELECT s.capacity - ${TAKEN_SQL} FROM sessions s WHERE s.id = ? AND s.status = 'published' AND s.starts_at > ?) >= ?`,
    [
      b.id, b.ref, b.token, b.session_id, b.name, b.email, b.phone, b.note, b.seats, b.amount_cents, b.lang, b.source,
      b.status, b.hold_until, b.created_at, b.confirmed_at,
      now, b.session_id, now, b.seats,
    ],
  );
}

export async function createWebBooking(input: z.infer<typeof checkoutInput>, base: string) {
  const s = await getSessionRow(input.sessionId);
  if (!s || s.status !== "published" || Date.parse(s.starts_at) <= Date.now()) {
    throw new HttpError(409, "unavailable");
  }
  if (input.seats > s.max_per_booking) throw new HttpError(400, "too_many_seats");

  const amount = s.price_cents * input.seats;
  const paid = amount > 0;
  if (paid && !stripeConfigured()) throw new HttpError(503, "payments_unavailable");

  const now = nowIso();
  const booking = {
    id: newId(),
    ref: newRef(),
    token: newToken(),
    session_id: s.id,
    name: input.name,
    email: input.email,
    phone: input.phone,
    note: input.note,
    seats: input.seats,
    amount_cents: amount,
    lang: input.lang,
    source: "web" as const,
    status: (paid ? "pending" : "confirmed") as BookingStatus,
    hold_until: paid ? new Date(Date.now() + HOLD_MS).toISOString() : null,
    created_at: now,
    confirmed_at: paid ? null : now,
  };

  if ((await insertIfCapacity(booking)) === 0) throw new HttpError(409, "full");

  if (!paid) {
    const row = (await getBooking(booking.id))!;
    await sendBookingConfirmed(row, s, base);
    return { ref: booking.ref, token: booking.token };
  }

  try {
    const url = await createCheckout(booking, s, base);
    return { url };
  } catch (err) {
    await run(`UPDATE bookings SET status = 'expired', hold_until = NULL WHERE id = ? AND status = 'pending'`, [booking.id]);
    console.error("[stripe] checkout failed", err);
    throw new HttpError(502, "payments_unavailable");
  }
}

async function createCheckout(
  b: { id: string; ref: string; token: string; email: string; seats: number; lang: string },
  s: SessionRow,
  base: string,
): Promise<string> {
  const title = b.lang === "en" && s.title_en ? s.title_en : s.title_nl;
  const where = s.is_online ? "Online" : s.venue;
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [
      {
        quantity: b.seats,
        price_data: {
          currency: "eur",
          unit_amount: s.price_cents,
          product_data: { name: title, description: [formatWhen(s.starts_at, b.lang), where].filter(Boolean).join(" · ") },
        },
      },
    ],
    customer_email: b.email,
    client_reference_id: b.id,
    metadata: { booking_id: b.id, ref: b.ref },
    payment_intent_data: { description: `${b.ref} · ${title}`, metadata: { booking_id: b.id, ref: b.ref, session_id: s.id } },
    locale: b.lang === "en" ? "en" : "nl",
    expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_MINUTES * 60,
    success_url: `${base}/boeking/${b.ref}?t=${b.token}&paid=1`,
    cancel_url: `${base}/boeking/${b.ref}?t=${b.token}&aborted=1`,
  };

  let cs: Stripe.Checkout.Session;
  try {
    // Adaptive Pricing: visitors see and pay the price in their own currency; Linda receives EUR.
    cs = await stripe().checkout.sessions.create({ ...params, adaptive_pricing: { enabled: true } }, { idempotencyKey: `checkout-${b.id}` });
  } catch (err) {
    if (!(err instanceof Stripe.errors.StripeInvalidRequestError) || !/adaptive/i.test(err.message)) throw err;
    console.warn("[stripe] Adaptive Pricing unavailable for this account, continuing in EUR only:", err.message);
    cs = await stripe().checkout.sessions.create(params, { idempotencyKey: `checkout-${b.id}-eur` });
  }
  await run(`UPDATE bookings SET stripe_checkout_id = ? WHERE id = ?`, [cs.id, b.id]);
  if (!cs.url) throw new Error("Stripe returned no checkout URL");
  return cs.url;
}

/* ---------------- payment outcome ---------------- */

/** Marks a booking paid. Idempotent: emails go out only the first time. */
export async function confirmBooking(id: string, paymentIntent: string | null, base: string) {
  const changed = await run(
    `UPDATE bookings SET status = 'confirmed', confirmed_at = ?, hold_until = NULL,
       stripe_payment_intent = COALESCE(?, stripe_payment_intent)
     WHERE id = ? AND status IN ('pending','expired')`,
    [nowIso(), paymentIntent, id],
  );
  if (!changed) return;
  const b = (await getBooking(id))!;
  const s = await getSessionWithTaken(b.session_id);
  if (!s) return;
  await sendBookingConfirmed(b, s, base, { overbooked: s.taken > s.capacity });
}

export async function expireBooking(id: string) {
  await run(`UPDATE bookings SET status = 'expired', hold_until = NULL WHERE id = ? AND status = 'pending'`, [id]);
}

const intentId = (cs: Stripe.Checkout.Session) =>
  typeof cs.payment_intent === "string" ? cs.payment_intent : (cs.payment_intent?.id ?? null);

/** Applies a Checkout Session's state to its booking (used by the webhook and as a fallback check). */
export async function applyCheckoutSession(cs: Stripe.Checkout.Session, base: string) {
  const id = cs.metadata?.booking_id || cs.client_reference_id;
  if (!id) return;
  if (cs.status === "complete" && (cs.payment_status === "paid" || cs.payment_status === "no_payment_required")) {
    await confirmBooking(id, intentId(cs), base);
  } else if (cs.status === "complete" && cs.payment_status === "unpaid") {
    // Delayed payment method (e.g. bank transfer): keep the place until the outcome arrives.
    const b = await getBooking(id);
    const s = b && (await getSessionRow(b.session_id));
    if (b && s) await run(`UPDATE bookings SET hold_until = ? WHERE id = ? AND status = 'pending'`, [s.starts_at, id]);
  } else if (cs.status === "expired") {
    await expireBooking(id);
  }
}

/** If the webhook hasn't arrived yet, ask Stripe directly. */
export async function syncPending(b: BookingRow, base: string): Promise<BookingRow> {
  if (b.status !== "pending" || !b.stripe_checkout_id || !stripeConfigured()) return b;
  try {
    const cs = await stripe().checkout.sessions.retrieve(b.stripe_checkout_id);
    await applyCheckoutSession(cs, base);
  } catch (err) {
    console.error("[stripe] sync failed", err);
  }
  return (await getBooking(b.id))!;
}

/** Customer came back from Stripe without paying: release the place straight away. */
export async function abandonBooking(b: BookingRow, base: string) {
  if (b.status !== "pending") return;
  if (b.stripe_checkout_id && stripeConfigured()) {
    try {
      const cs = await stripe().checkout.sessions.retrieve(b.stripe_checkout_id);
      if (cs.status === "open") await stripe().checkout.sessions.expire(cs.id);
      else return applyCheckoutSession(cs, base);
    } catch (err) {
      console.error("[stripe] expire failed", err);
      return;
    }
  }
  await expireBooking(b.id);
}

/* ---------------- cancellation & refunds ---------------- */

export type RefundMode = "policy" | "full" | "none";

export async function cancelBooking(
  b: BookingRow,
  opts: { by: "customer" | "admin"; mode: RefundMode; sessionCancelled?: boolean; base: string },
) {
  if (b.status !== "confirmed") throw new HttpError(409, "not_cancellable", "Only confirmed bookings can be cancelled.");
  const s = await getSessionRow(b.session_id);
  if (!s) throw new HttpError(404, "not_found");
  if (opts.by === "customer" && Date.parse(s.starts_at) <= Date.now()) {
    throw new HttpError(409, "too_late", "This session has already started.");
  }

  const percent = opts.mode === "full" ? 100 : opts.mode === "none" ? 0 : refundPercent(s.starts_at);
  let refund = Math.max(0, Math.round((b.amount_cents * percent) / 100) - b.refunded_cents);
  if (!b.stripe_payment_intent) refund = 0; // manual / free bookings: nothing to refund online

  if (refund > 0) {
    try {
      await stripe().refunds.create(
        { payment_intent: b.stripe_payment_intent!, amount: refund, metadata: { booking_id: b.id, ref: b.ref } },
        { idempotencyKey: `refund-${b.id}-${b.refunded_cents}-${refund}` },
      );
    } catch (err) {
      console.error("[stripe] refund failed", err);
      throw new HttpError(502, "refund_failed", `Stripe refund failed: ${(err as Error).message}`);
    }
  }

  const changed = await run(
    `UPDATE bookings SET status = 'cancelled', cancelled_at = ?, cancelled_by = ?, refunded_cents = refunded_cents + ?
     WHERE id = ? AND status = 'confirmed'`,
    [nowIso(), opts.by, refund, b.id],
  );
  if (changed) {
    const updated = (await getBooking(b.id))!;
    await sendBookingCancelled(updated, s, refund, opts.by, !!opts.sessionCancelled, opts.base);
  }
  return { refundCents: refund };
}

/** Cancels a whole session: releases pending checkouts and fully refunds every confirmed booking. */
export async function cancelSession(sessionId: string, base: string) {
  const s = await getSessionRow(sessionId);
  if (!s) throw new HttpError(404, "not_found");
  await run(`UPDATE sessions SET status = 'cancelled', updated_at = ? WHERE id = ?`, [nowIso(), sessionId]);

  const list = await all<BookingRow>(`SELECT * FROM bookings WHERE session_id = ? AND status IN ('pending','confirmed')`, [sessionId]);
  const failures: string[] = [];
  let refunded = 0;
  for (const b of list) {
    if (b.status === "pending") {
      await abandonBooking(b, base);
      continue;
    }
    try {
      const r = await cancelBooking(b, { by: "admin", mode: "full", sessionCancelled: true, base });
      refunded += r.refundCents;
    } catch (err) {
      failures.push(`${b.ref} (${b.name}): ${(err as Error).message}`);
    }
  }
  return { cancelledBookings: list.filter((b) => b.status === "confirmed").length - failures.length, refundedCents: refunded, failures };
}

/* ---------------- admin: manual bookings ---------------- */

export const manualInput = z.object({
  sessionId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(200).or(z.literal("")).default(""),
  phone: z.string().trim().max(40).default(""),
  note: z.string().trim().max(1000).default(""),
  seats: z.number().int().min(1).max(100),
  amountCents: z.number().int().min(0).max(10_000_000).default(0),
  sendEmail: z.boolean().default(false),
});

/** For bookings Linda takes herself (WhatsApp, cash, at the door). Still respects capacity. */
export async function createManualBooking(input: z.infer<typeof manualInput>, base: string) {
  const s = await getSessionRow(input.sessionId);
  if (!s) throw new HttpError(404, "not_found");
  const now = nowIso();
  const booking = {
    id: newId(),
    ref: newRef(),
    token: newToken(),
    session_id: s.id,
    name: input.name,
    email: input.email,
    phone: input.phone,
    note: input.note,
    seats: input.seats,
    amount_cents: input.amountCents,
    lang: "nl",
    source: "manual" as const,
    status: "confirmed" as BookingStatus,
    hold_until: null,
    created_at: now,
    confirmed_at: now,
  };
  if ((await insertIfCapacity(booking)) === 0) {
    throw new HttpError(409, "full", "Not enough places left (or the session is not published / already past). Increase the capacity first.");
  }
  if (input.sendEmail && input.email) await sendBookingConfirmed((await getBooking(booking.id))!, s, base, { notifyAdmin: false });
  return { ref: booking.ref };
}

/* ---------------- views ---------------- */

export function customerView(b: BookingRow, s: SessionRow) {
  const session = toPublic(s);
  return {
    ref: b.ref,
    status: b.status,
    name: b.name,
    email: b.email,
    seats: b.seats,
    amountCents: b.amount_cents,
    refundedCents: b.refunded_cents,
    lang: b.lang,
    session,
    onlineLink: b.status === "confirmed" && s.is_online ? s.online_link : "",
    cancel: refundPreview(b, s),
  };
}

export function adminView(b: BookingRow) {
  return {
    id: b.id,
    ref: b.ref,
    sessionId: b.session_id,
    name: b.name,
    email: b.email,
    phone: b.phone,
    note: b.note,
    seats: b.seats,
    amountCents: b.amount_cents,
    refundedCents: b.refunded_cents,
    status: b.status,
    source: b.source,
    lang: b.lang,
    createdAt: b.created_at,
    confirmedAt: b.confirmed_at,
    cancelledAt: b.cancelled_at,
    cancelledBy: b.cancelled_by,
    holdUntil: b.hold_until,
    paidOnline: !!b.stripe_payment_intent,
  };
}
