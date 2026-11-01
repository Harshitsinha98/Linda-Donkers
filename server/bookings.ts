import { z } from "zod";
import { all, get, run } from "./db.js";
import { sendBookingCancelled, sendBookingConfirmed } from "./email.js";
import { HttpError, newId, newRef, newToken, safeEqual } from "./http.js";
import { getSessionRow, getSessionWithTaken, parseAvailability, validateAppointmentSlot, TAKEN_SQL, toPublic, type SessionRow } from "./sessions.js";
import { Stripe, stripe, stripeConfigured } from "./stripe.js";
import type { AuthUser } from "./auth.js";
import { evaluateCoupon, releaseCoupon, reserveCoupon } from "./coupons.js";
import { applyMembershipCheckout, getMembership, returnCredit, usableFor, useCredit } from "./memberships.js";
import { sectionOf } from "../shared/catalog.js";
import { applyGiftCheckout, creditCard, recordRedeem, restoreCard, takeFromCard } from "./giftcards.js";
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
  coupon_code: string;
  discount_cents: number;
  membership_id: string | null;
  user_id: string;
  preferred: string;
  appointment_start_at: string | null;
  appointment_end_at: string | null;
  /** Part of the price paid from a gift card (amount_cents is only the Stripe part). */
  gift_card_id: string | null;
  gift_cents: number;
  gift_refunded_cents: number;
  /** 1 when a class-card session went back on the card after cancelling. */
  credit_returned: number;
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
  const appointmentStart = b.appointment_start_at ?? s.starts_at;
  const allowed = b.status === "confirmed" && Date.parse(appointmentStart) > Date.now();
  const percent = refundPercent(appointmentStart);
  const cents = b.stripe_payment_intent ? Math.max(0, Math.round((b.amount_cents * percent) / 100) - b.refunded_cents) : 0;
  const giftCents = b.gift_card_id ? Math.max(0, Math.round((b.gift_cents * percent) / 100) - b.gift_refunded_cents) : 0;
  return { allowed, percent, cents, giftCents };
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
  couponCode: z.string().trim().max(40).default(""),
  // Gift card code: its balance pays (part of) the price; Stripe pays the rest.
  giftCode: z.string().trim().max(40).default(""),
  // Pay with a membership card (requires login). One session = one place.
  membershipId: z.string().max(64).default(""),
  // "By appointment" sessions: the customer's preferred day and time.
  preferred: z.string().trim().max(300).default(""),
  // Legacy "by appointment" and fixed-date services do not send a selected slot.
  // Accept empty strings explicitly; .default("") alone only handles undefined.
  appointmentDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).default(""),
  appointmentTime: z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.literal("")]).default(""),
});

type NewBooking = Omit<
  BookingRow,
  "refunded_cents" | "stripe_checkout_id" | "stripe_payment_intent" | "cancelled_at" | "cancelled_by" | "gift_card_id" | "gift_cents" | "gift_refunded_cents" | "credit_returned"
> & { gift_card_id?: string | null; gift_cents?: number };

/**
 * Reserves places in one atomic INSERT ... SELECT that only succeeds while enough
 * capacity is left, so the session can never be overbooked by concurrent requests.
 */
async function insertIfCapacity(b: NewBooking) {
  const now = nowIso();
  return run(
    `INSERT INTO bookings (id, ref, token, session_id, name, email, phone, note, seats, amount_cents, lang, source, status, hold_until, created_at, confirmed_at,
       coupon_code, discount_cents, membership_id, user_id, preferred, appointment_start_at, appointment_end_at)
     SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
     WHERE (SELECT CASE WHEN ? IS NOT NULL THEN ? ELSE s.capacity - ${TAKEN_SQL} END FROM sessions s WHERE s.id = ? AND s.status = 'published' AND s.starts_at > ?) >= ?
       AND (
         ? IS NULL OR (
           NOT EXISTS (
             SELECT 1 FROM bookings x
             WHERE x.appointment_start_at IS NOT NULL AND x.appointment_end_at IS NOT NULL
               AND (x.status = 'confirmed' OR (x.status = 'pending' AND x.hold_until > ?))
               AND x.appointment_start_at < ? AND x.appointment_end_at > ?
           )
           AND NOT EXISTS (
             SELECT 1 FROM sessions x
             WHERE x.id <> ? AND x.status = 'published' AND x.booking_mode = 'scheduled'
               AND julianday(x.starts_at) < julianday(?)
               AND julianday(x.starts_at) + (x.duration_min / 1440.0) > julianday(?)
               AND NOT (
                 -- An unbooked occurrence of the same service doesn't block its own slot. A booked one does.
                 NOT EXISTS (SELECT 1 FROM bookings y WHERE y.session_id = x.id AND (y.status = 'confirmed' OR (y.status = 'pending' AND y.hold_until > ?)))
                 AND (
                   (
                     COALESCE(x.offering, '') <> ''
                     AND COALESCE(x.offering, '') = (SELECT COALESCE(target.offering, '') FROM sessions target WHERE target.id = ?)
                   )
                   OR (
                     x.category = (SELECT target.category FROM sessions target WHERE target.id = ?)
                     AND (
                       (trim(x.title_nl) <> '' AND lower(trim(x.title_nl)) = (SELECT lower(trim(target.title_nl)) FROM sessions target WHERE target.id = ?))
                       OR (trim(x.title_en) <> '' AND lower(trim(x.title_en)) = (SELECT lower(trim(target.title_en)) FROM sessions target WHERE target.id = ?))
                     )
                   )
                 )
               )
           )
         )
       )`,
    [
      b.id, b.ref, b.token, b.session_id, b.name, b.email, b.phone, b.note, b.seats, b.amount_cents, b.lang, b.source,
      b.status, b.hold_until, b.created_at, b.confirmed_at, b.coupon_code, b.discount_cents, b.membership_id, b.user_id, b.preferred,
      b.appointment_start_at, b.appointment_end_at,
      b.appointment_start_at, b.seats, now, b.session_id, now, b.seats,
      b.appointment_start_at, now, b.appointment_end_at, b.appointment_start_at,
      b.session_id, b.appointment_end_at, b.appointment_start_at, now, b.session_id, b.session_id, b.session_id, b.session_id,
    ],
  );
}

export async function createWebBooking(input: z.infer<typeof checkoutInput>, base: string, user: AuthUser | null) {
  const s = await getSessionRow(input.sessionId);
  if (!s || s.status !== "published" || Date.parse(s.starts_at) <= Date.now()) {
    throw new HttpError(409, "unavailable");
  }
  if (input.seats > s.max_per_booking) throw new HttpError(400, "too_many_seats");

  const recurringAvailability = s.booking_mode === "appointment" ? parseAvailability(s.availability_rule) : null;
  let appointmentSlot: { startsAt: string; endsAt: string } | null = null;
  let preferred = input.preferred;
  if (s.booking_mode === "appointment" && recurringAvailability) {
    if (!input.appointmentDate || !input.appointmentTime) throw new HttpError(400, "slot_required");
    appointmentSlot = await validateAppointmentSlot(s.id, input.appointmentDate, input.appointmentTime);
    preferred = formatWhen(appointmentSlot.startsAt, input.lang);
  } else if (s.booking_mode === "appointment" && input.preferred.length < 3) {
    throw new HttpError(400, "preferred_required");
  }

  if (input.membershipId) return bookWithMembership(input, s, base, user, appointmentSlot, preferred);

  const gross = s.price_cents * input.seats;
  let amount = gross;
  let discount = 0;
  let couponCode = "";
  if (input.couponCode && gross > 0) {
    const r = await evaluateCoupon(input.couponCode, { kind: "session", section: sectionOf({ category: s.category, isOnline: !!s.is_online }) }, gross, input.email);
    if (!(await reserveCoupon(r.coupon))) throw new HttpError(400, "coupon_used_up", "This code has been used up.");
    discount = r.discountCents;
    couponCode = r.coupon.code;
    amount = gross - discount;
  }
  // Gift card: take what it can pay now (atomic), give it back if anything below fails.
  let gift: { id: string; cents: number } | null = null;
  if (input.giftCode && amount > 0) {
    try {
      const r = await takeFromCard(input.giftCode, amount);
      gift = { id: r.card.id, cents: r.takenCents };
      amount -= r.takenCents;
    } catch (err) {
      await releaseCoupon(couponCode);
      throw err;
    }
  }
  const undo = async () => {
    await releaseCoupon(couponCode);
    if (gift) await restoreCard(gift.id, gift.cents);
  };
  const paid = amount > 0;
  if (paid && !stripeConfigured()) {
    await undo();
    throw new HttpError(503, "payments_unavailable");
  }

  const now = nowIso();
  const booking: NewBooking = {
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
    coupon_code: couponCode,
    discount_cents: discount,
    membership_id: null,
    user_id: user?.id ?? "",
    preferred,
    appointment_start_at: appointmentSlot?.startsAt ?? null,
    appointment_end_at: appointmentSlot?.endsAt ?? null,
  };

  if ((await insertIfCapacity(booking)) === 0) {
    await undo();
    throw new HttpError(409, appointmentSlot ? "slot_unavailable" : "full", appointmentSlot ? "That time has just been booked. Please choose another slot." : undefined);
  }

  if (gift) {
    await run(`UPDATE bookings SET gift_card_id = ?, gift_cents = ? WHERE id = ?`, [gift.id, gift.cents, booking.id]);
    await recordRedeem(gift.id, gift.cents, { bookingId: booking.id });
    booking.gift_card_id = gift.id;
    booking.gift_cents = gift.cents;
  }

  if (!paid) {
    const row = (await getBooking(booking.id))!;
    await sendBookingConfirmed(row, s, base);
    return { ref: booking.ref, token: booking.token };
  }

  try {
    const url = await createCheckout(booking, s, base);
    return { url };
  } catch (err) {
    await expireBooking(booking.id);
    console.error("[stripe] checkout failed", err);
    throw new HttpError(502, "payments_unavailable");
  }
}

/** Books one place paid with a membership card: one credit off the card, nothing to pay. */
async function bookWithMembership(
  input: z.infer<typeof checkoutInput>,
  s: SessionRow,
  base: string,
  user: AuthUser | null,
  appointmentSlot: { startsAt: string; endsAt: string } | null,
  preferred: string,
) {
  if (!user) throw new HttpError(401, "login_required", "Please log in to use your membership.");
  if (input.seats !== 1) throw new HttpError(400, "membership_one_seat", "A membership pays for one place per booking.");
  const m = (await usableFor(user, s)).find(
    (x) => x.id === input.membershipId && (!appointmentSlot || appointmentSlot.startsAt <= x.expires_at!),
  );
  if (!m) throw new HttpError(409, "membership_not_usable", "This membership can't be used for this session.");
  if (!(await useCredit(m))) throw new HttpError(409, "membership_not_usable", "No sessions left on this membership.");

  const now = nowIso();
  const booking: NewBooking = {
    id: newId(),
    ref: newRef(),
    token: newToken(),
    session_id: s.id,
    name: input.name,
    email: user.email,
    phone: input.phone,
    note: input.note,
    seats: 1,
    amount_cents: 0,
    lang: input.lang,
    source: "web",
    status: "confirmed",
    hold_until: null,
    created_at: now,
    confirmed_at: now,
    coupon_code: "",
    discount_cents: 0,
    membership_id: m.id,
    user_id: user.id,
    preferred,
    appointment_start_at: appointmentSlot?.startsAt ?? null,
    appointment_end_at: appointmentSlot?.endsAt ?? null,
  };
  if ((await insertIfCapacity(booking)) === 0) {
    await returnCredit(m.id);
    throw new HttpError(409, appointmentSlot ? "slot_unavailable" : "full", appointmentSlot ? "That time has just been booked. Please choose another slot." : undefined);
  }
  await sendBookingConfirmed((await getBooking(booking.id))!, s, base);
  return { ref: booking.ref, token: booking.token };
}

async function createCheckout(b: NewBooking, s: SessionRow, base: string): Promise<string> {
  const title = b.lang === "en" && s.title_en ? s.title_en : s.title_nl;
  const where = s.is_online ? "Online" : s.venue;
  const when = b.appointment_start_at
    ? formatWhen(b.appointment_start_at, b.lang)
    : s.booking_mode === "appointment" ? (b.lang === "en" ? "By appointment" : "Op afspraak") : formatWhen(s.starts_at, b.lang);
  const description = [when, where].filter(Boolean).join(" · ");
  // With a discount or gift card the rest is charged as one line, so Stripe shows exactly what was agreed.
  const extras = [
    b.discount_cents ? `${b.coupon_code} −${(b.discount_cents / 100).toFixed(2)} EUR` : "",
    b.gift_cents ? `${b.lang === "en" ? "Gift card" : "Cadeaubon"} −${(b.gift_cents / 100).toFixed(2)} EUR` : "",
  ].filter(Boolean);
  const line: Stripe.Checkout.SessionCreateParams.LineItem = extras.length
    ? {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: b.amount_cents,
          product_data: {
            name: b.seats > 1 ? `${title} (${b.seats}×)` : title,
            description: [description, ...extras].join(" · "),
          },
        },
      }
    : { quantity: b.seats, price_data: { currency: "eur", unit_amount: s.price_cents, product_data: { name: title, description } } };
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [line],
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
  const wasExpired = (await getBooking(id))?.status === "expired";
  const changed = await run(
    `UPDATE bookings SET status = 'confirmed', confirmed_at = ?, hold_until = NULL,
       stripe_payment_intent = COALESCE(?, stripe_payment_intent)
     WHERE id = ? AND status IN ('pending','expired')`,
    [nowIso(), paymentIntent, id],
  );
  if (!changed) return;
  const b = (await getBooking(id))!;
  if (wasExpired && b.gift_card_id && b.gift_cents > 0) {
    // The payment came in after the checkout expired; the gift card part had been given back. Take it again.
    const ok = await run(`UPDATE gift_cards SET balance_cents = balance_cents - ? WHERE id = ? AND balance_cents >= ?`, [b.gift_cents, b.gift_card_id, b.gift_cents]);
    if (ok) await recordRedeem(b.gift_card_id, b.gift_cents, { bookingId: b.id });
    else console.warn(`[giftcard] ${b.ref}: late payment, gift card balance already used elsewhere`);
  }
  const s = await getSessionWithTaken(b.session_id);
  if (!s) return;
  await sendBookingConfirmed(b, s, base, { overbooked: s.taken > s.capacity });
}

export async function expireBooking(id: string) {
  const b = await getBooking(id);
  const changed = await run(`UPDATE bookings SET status = 'expired', hold_until = NULL WHERE id = ? AND status = 'pending'`, [id]);
  if (changed && b?.coupon_code) await releaseCoupon(b.coupon_code);
  if (changed && b?.gift_card_id) await creditCard(b.gift_card_id, b.gift_cents, "release", { bookingId: b.id, note: "Checkout not completed" });
}

const intentId = (cs: Stripe.Checkout.Session) =>
  typeof cs.payment_intent === "string" ? cs.payment_intent : (cs.payment_intent?.id ?? null);

/** Applies a Checkout Session's state to its booking (used by the webhook and as a fallback check). */
export async function applyCheckoutSession(cs: Stripe.Checkout.Session, base: string) {
  if (cs.metadata?.kind === "membership") return applyMembershipCheckout(cs, base);
  if (cs.metadata?.kind === "giftcard") return applyGiftCheckout(cs, base);
  const id = cs.metadata?.booking_id || cs.client_reference_id;
  if (!id) return;
  if (cs.status === "complete" && (cs.payment_status === "paid" || cs.payment_status === "no_payment_required")) {
    await confirmBooking(id, intentId(cs), base);
  } else if (cs.status === "complete" && cs.payment_status === "unpaid") {
    // Delayed payment method (e.g. bank transfer): keep the place until the outcome arrives.
    const b = await getBooking(id);
    const s = b && (await getSessionRow(b.session_id));
    if (b && s) await run(`UPDATE bookings SET hold_until = ? WHERE id = ? AND status = 'pending'`, [b.appointment_start_at ?? s.starts_at, id]);
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
  const bookingStartsAt = b.appointment_start_at ?? s.starts_at;
  if (opts.by === "customer" && Date.parse(bookingStartsAt) <= Date.now()) {
    throw new HttpError(409, "too_late", "This session has already started.");
  }

  const percent = opts.mode === "full" ? 100 : opts.mode === "none" ? 0 : refundPercent(bookingStartsAt);
  let refund = Math.max(0, Math.round((b.amount_cents * percent) / 100) - b.refunded_cents);
  if (!b.stripe_payment_intent) refund = 0; // manual / free bookings: nothing to refund online
  // The gift card part follows the same policy and goes back onto the gift card.
  const giftRefund = b.gift_card_id ? Math.max(0, Math.round((b.gift_cents * percent) / 100) - b.gift_refunded_cents) : 0;

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
    `UPDATE bookings SET status = 'cancelled', cancelled_at = ?, cancelled_by = ?, refunded_cents = refunded_cents + ?,
       gift_refunded_cents = gift_refunded_cents + ?
     WHERE id = ? AND status = 'confirmed'`,
    [nowIso(), opts.by, refund, giftRefund, b.id],
  );
  if (changed) {
    if (giftRefund > 0) await creditCard(b.gift_card_id, giftRefund, "refund", { bookingId: b.id, note: `Cancelled ${b.ref}` });
    // A session paid with a membership goes back on the card when it is cancelled in time (full-refund window).
    if (b.membership_id && percent === 100 && (await getMembership(b.membership_id))) {
      await returnCredit(b.membership_id);
      await run(`UPDATE bookings SET credit_returned = 1 WHERE id = ?`, [b.id]);
    }
    const updated = (await getBooking(b.id))!;
    await sendBookingCancelled(updated, s, refund, opts.by, !!opts.sessionCancelled, opts.base);
  }
  return { refundCents: refund, giftRefundCents: giftRefund };
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
  appointmentDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).default(""),
  appointmentTime: z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.literal("")]).default(""),
});

/** For bookings Linda takes herself (WhatsApp, cash, at the door). Still respects capacity. */
export async function createManualBooking(input: z.infer<typeof manualInput>, base: string) {
  const s = await getSessionRow(input.sessionId);
  if (!s) throw new HttpError(404, "not_found");
  const recurringAvailability = s.booking_mode === "appointment" ? parseAvailability(s.availability_rule) : null;
  let appointmentSlot: { startsAt: string; endsAt: string } | null = null;
  let preferred = "";
  if (recurringAvailability) {
    if (!input.appointmentDate || !input.appointmentTime) throw new HttpError(400, "slot_required");
    appointmentSlot = await validateAppointmentSlot(s.id, input.appointmentDate, input.appointmentTime);
    preferred = formatWhen(appointmentSlot.startsAt, "nl");
  }
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
    coupon_code: "",
    discount_cents: 0,
    membership_id: null,
    user_id: "",
    preferred,
    appointment_start_at: appointmentSlot?.startsAt ?? null,
    appointment_end_at: appointmentSlot?.endsAt ?? null,
  };
  if ((await insertIfCapacity(booking)) === 0) {
    throw new HttpError(409, appointmentSlot ? "slot_unavailable" : "full", appointmentSlot ? "That time has just been booked. Please choose another slot." : "Not enough places left (or the session is not published / already past). Increase the capacity first.");
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
    session: b.appointment_start_at
      ? { ...session, startsAt: b.appointment_start_at }
      : session,
    onlineLink: b.status === "confirmed" && s.is_online ? s.online_link : "",
    cancel: refundPreview(b, s),
    couponCode: b.coupon_code,
    discountCents: b.discount_cents,
    paidWithMembership: !!b.membership_id,
    preferred: b.preferred,
    appointmentStartAt: b.appointment_start_at,
    giftCents: b.gift_cents,
    giftRefundedCents: b.gift_refunded_cents,
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
    giftCents: b.gift_cents,
    giftRefundedCents: b.gift_refunded_cents,
    couponCode: b.coupon_code,
    discountCents: b.discount_cents,
    membershipId: b.membership_id,
    preferred: b.preferred,
  };
}
