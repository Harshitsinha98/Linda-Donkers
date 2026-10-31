import { requireUser } from "../server/auth.js";
import { all } from "../server/db.js";
import { clientIp, handler, json, query, rateLimit, siteUrl } from "../server/http.js";
import { listForUser, membershipView, usableFor } from "../server/memberships.js";
import { getSessionRow, type SessionRow } from "../server/sessions.js";

/**
 * GET /api/account (logged in) -> the customer's memberships and bookings.
 * GET /api/account?sessionId=<id> -> only the memberships that can pay for that session.
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

  const memberships = await listForUser(user, siteUrl(req));
  const bookings = await all<{
    ref: string; token: string; status: string; seats: number; amount_cents: number; membership_id: string | null; preferred: string;
  } & Pick<SessionRow, "title_nl" | "title_en" | "starts_at" | "booking_mode" | "is_online" | "venue">>(
    `SELECT b.ref, b.token, b.status, b.seats, b.amount_cents, b.membership_id, b.preferred,
            s.title_nl, s.title_en, s.starts_at, s.booking_mode, s.is_online, s.venue
     FROM bookings b JOIN sessions s ON s.id = b.session_id
     WHERE (b.user_id = ? OR b.email = ?) AND b.status IN ('confirmed','cancelled')
     ORDER BY s.starts_at DESC LIMIT 50`,
    [user.id, user.email],
  );
  return json({
    ok: true,
    user: { email: user.email, name: user.name },
    memberships,
    bookings: bookings.map((b) => ({
      ref: b.ref,
      manageUrl: `/boeking/${b.ref}?t=${b.token}`,
      status: b.status,
      seats: b.seats,
      amountCents: b.amount_cents,
      paidWithMembership: !!b.membership_id,
      preferred: b.preferred,
      title: { nl: b.title_nl, en: b.title_en || b.title_nl },
      startsAt: b.starts_at,
      bookingMode: b.booking_mode,
      isOnline: !!b.is_online,
      venue: b.venue,
    })),
  });
});
