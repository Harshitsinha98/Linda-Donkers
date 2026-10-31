import { requireUser } from "../server/auth.js";
import { clientIp, handler, json, rateLimit, readBody, siteUrl } from "../server/http.js";
import { listPlansPublic, purchaseInput, startPurchase } from "../server/memberships.js";

/** GET /api/memberships -> public membership plans. */
export const GET = handler(async () => json({ ok: true, plans: await listPlansPublic() }));

/**
 * POST /api/membership-checkout -> Stripe Checkout URL, or { ref, free } for a fully discounted card.
 * Vercel rewrites this legacy URL to /api/memberships so both operations share one function.
 */
export const POST = handler(async (req) => {
  rateLimit(`mcheckout:${clientIp(req)}`, 10, 10 * 60_000);
  const user = await requireUser(req);
  const input = await readBody(req, purchaseInput);
  return json({ ok: true, ...(await startPurchase(user, input, siteUrl(req))) });
});
