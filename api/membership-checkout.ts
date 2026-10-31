import { requireUser } from "../server/auth.js";
import { clientIp, handler, json, rateLimit, readBody, siteUrl } from "../server/http.js";
import { purchaseInput, startPurchase } from "../server/memberships.js";

/** POST /api/membership-checkout (logged in) -> Stripe Checkout URL, or { ref, free } for a fully discounted card. */
export const POST = handler(async (req) => {
  rateLimit(`mcheckout:${clientIp(req)}`, 10, 10 * 60_000);
  const user = await requireUser(req);
  const input = await readBody(req, purchaseInput);
  return json({ ok: true, ...(await startPurchase(user, input, siteUrl(req))) });
});
