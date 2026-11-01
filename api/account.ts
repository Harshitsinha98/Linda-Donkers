import { requireUser } from "../server/auth.js";
import { all } from "../server/db.js";
import { listForEmail } from "../server/giftcards.js";
import { clientIp, handler, json, query, rateLimit, siteUrl } from "../server/http.js";
import { listForUser, membershipView, usableFor } from "../server/memberships.js";
import { getSessionRow, type SessionRow } from "../server/sessions.js";

type Row = {
  ref: string; token: string; status: "confirmed" | "cancelled"; seats: number; amount_cents: number; refunded_cents: number;
  gift_cents: number; gift_refunded_cents: number; credit_returned: number; membership_id: string | null; preferred: string;
  appointment_start_at: string | null; cancelled_at: string | null; cancelled_by: string | null;
} & Pick<SessionRow, "title_nl" | "title_en" | "starts_at" | "duration_min" | "booking_mode" | "is_online" | "venue" | "status">;

/**
 * GET /api/account (logged in) -> the customer's class cards, bookings (upcoming / completed / cancelled),
 *   refunds and gift cards.
 * GET /api/account?sessionId=<id> -> only the class cards that can pay for that session.
 */
export const GET = handler(async (req) => {
  rateLimit(`account:${clientIp(req)}`, 120, 10 * 60_000);
  const user = await requireUser(req);
  const sessionId = query(req).get("sessionId");
  if (sessionId) {
    const s = await getSessionRow(sessionId);
    const usable = s ? await usableFor(user, s) : [];
    return json({ ok: true, memberships: usable.map((m) => membershipView(m)) });
  }

  const base = siteUrl(req);
  const [memberships, giftCards, rows] = await Promise.all([
    listForUser(user, base),
    listForEmail(user.email),
    all<Row>(
      `SELECT b.ref, b.token, b.status, b.seats, b.amount_cents, b.refunded_cents, b.gift_cents, b.gift_refunded_cents, b.credit_returned,
              b.membership_id, b.preferred, b.appointment_start_at, b.cancelled_at, b.cancelled_by,
              s.title_nl, s.title_en, s.starts_at, s.duration_min, s.booking_mode, s.is_online, s.venue, s.status
       FROM bookings b JOIN sessions s ON s.id = b.session_id
       WHERE (b.user_id = ? OR b.email = ?) AND b.status IN ('confirmed','cancelled')
       ORDER BY COALESCE(b.appointment_start_at, s.starts_at) DESC LIMIT 200`,
      [user.id, user.email],
    ),
  ]);

  const now = Date.now();
  const bookings = rows.map((b) => {
    const startsAt = b.appointment_start_at ?? b.starts_at;
    // A "by appointment" booking without a chosen slot has no real date: it stays upcoming until cancelled.
    const undated = b.booking_mode === "appointment" && !b.appointment_start_at;
    const ended = !undated && Date.parse(startsAt) + b.duration_min * 60_000 <= now;
    const group = b.status === "cancelled" ? "cancelled" : ended ? "completed" : "upcoming";
    return {
      ref: b.ref,
      manageUrl: `/boeking/${b.ref}?t=${b.token}`,
      group,
      status: b.status,
      seats: b.seats,
      amountCents: b.amount_cents,
      giftCents: b.gift_cents,
      paidWithMembership: !!b.membership_id,
      preferred: b.preferred,
      title: { nl: b.title_nl, en: b.title_en || b.title_nl },
      startsAt,
      undated,
      bookingMode: b.booking_mode,
      isOnline: !!b.is_online,
      venue: b.venue,
      cancelledAt: b.cancelled_at,
      cancelledBy: b.cancelled_by,
      refundedCents: b.refunded_cents,
      giftRefundedCents: b.gift_refunded_cents,
      creditReturned: !!b.credit_returned,
    };
  });
  // Upcoming soonest first; completed and cancelled most recent first.
  bookings.sort((a, b) => (a.group === "upcoming" && b.group === "upcoming" ? Date.parse(a.startsAt) - Date.parse(b.startsAt) : 0));

  // Refunds: money back to the card, to a gift card, or a session back on a class card.
  const refunds = [
    ...bookings
      .filter((b) => b.refundedCents > 0 || b.giftRefundedCents > 0 || b.creditReturned)
      .map((b) => ({
        kind: "booking" as const,
        ref: b.ref,
        title: b.title,
        date: b.cancelledAt,
        toCardCents: b.refundedCents,
        toGiftCardCents: b.giftRefundedCents,
        creditReturned: b.creditReturned,
        manageUrl: b.manageUrl,
      })),
    ...memberships
      .filter((m) => m.refundedCents > 0 || m.giftRefundedCents > 0)
      .map((m) => ({
        kind: "membership" as const,
        ref: m.ref,
        title: m.name,
        date: m.cancelledAt,
        toCardCents: m.refundedCents,
        toGiftCardCents: m.giftRefundedCents,
        creditReturned: false,
        manageUrl: "",
      })),
  ].sort((a, b) => Date.parse(b.date ?? "") - Date.parse(a.date ?? ""));

  return json({ ok: true, user: { email: user.email, name: user.name }, memberships, bookings, refunds, giftCards });
});
