import { authConfigured, getUser, requireUser } from "../server/auth.js";
import { all } from "../server/db.js";
import { clientIp, handler, json, query, rateLimit, readBody, siteUrl } from "../server/http.js";
import { applyMembershipCheckout, buyInput, buyMembership, getPass, listPlans, passesForUser, usablePasses } from "../server/memberships.js";
import { getSessionRow } from "../server/sessions.js";
import { stripe, stripeConfigured } from "../server/stripe.js";
import { nowIso } from "../server/time.js";

/**
 * GET /api/memberships
 *   -> { plans, authConfigured }                       for everyone
 *   -> + { me, passes, bookings }                      when logged in (Authorization: Bearer <supabase token>)
 *   -> + { usable }  with ?sessionId=<id>              passes that can pay for that session
 *   ?pass=<id> right after Stripe: checks the payment if the webhook hasn't arrived yet.
 */
export const GET = handler(async (req) => {
  rateLimit(`memberships:${clientIp(req)}`, 120, 10 * 60_000);
  const q = query(req);
  const plans = await listPlans(true);
  const user = await getUser(req);
  if (!user) return json({ ok: true, plans, authConfigured: authConfigured() });

  const passId = q.get("pass");
  if (passId && stripeConfigured()) {
    const p = await getPass(passId);
    if (p && p.status === "pending" && p.user_id === user.id && p.stripe_checkout_id) {
      try {
        await applyMembershipCheckout(await stripe().checkout.sessions.retrieve(p.stripe_checkout_id), siteUrl(req));
      } catch (err) {
        console.error("[stripe] membership sync failed", err);
      }
    }
  }

  const bookings = await all<{ ref: string; token: string; status: string; seats: number; title_nl: string; title_en: string; starts_at: string; is_online: number; credits_used: number }>(
    `SELECT b.ref, b.token, b.status, b.seats, b.credits_used, s.title_nl, s.title_en, s.starts_at, s.is_online
     FROM bookings b JOIN sessions s ON s.id = b.session_id
     WHERE (b.user_id = ? OR b.email = ?) AND b.status = 'confirmed' AND s.starts_at > ?
     ORDER BY s.starts_at ASC LIMIT 50`,
    [user.id, user.email, nowIso()],
  );

  const sessionId = q.get("sessionId");
  const session = sessionId ? await getSessionRow(sessionId) : undefined;
  return json({
    ok: true,
    plans,
    authConfigured: true,
    me: user,
    passes: await passesForUser(user),
    bookings: bookings.map((b) => ({
      ref: b.ref,
      token: b.token,
      status: b.status,
      seats: b.seats,
      creditsUsed: b.credits_used,
      title: { nl: b.title_nl, en: b.title_en || b.title_nl },
      startsAt: b.starts_at,
      isOnline: !!b.is_online,
    })),
    ...(session ? { usable: await usablePasses(user, session) } : {}),
  });
});

/** POST /api/memberships { planId, couponCode?, name?, lang, acceptTerms } -> Stripe Checkout URL (login required). */
export const POST = handler(async (req) => {
  rateLimit(`membership-buy:${clientIp(req)}`, 10, 10 * 60_000);
  const user = await requireUser(req);
  const input = await readBody(req, buyInput);
  return json({ ok: true, ...(await buyMembership(user, input, siteUrl(req))) });
});
