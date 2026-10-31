import { getUser } from "../server/auth.js";
import { checkoutInput, createWebBooking } from "../server/bookings.js";
import { clientIp, handler, json, rateLimit, readBody, siteUrl } from "../server/http.js";

/**
 * POST /api/checkout -> reserves the places and returns a Stripe Checkout URL, or a confirmed booking
 * (free, fully discounted, or paid with membership credits; the latter needs the customer's login token).
 */
export const POST = handler(async (req) => {
  rateLimit(`checkout:${clientIp(req)}`, 12, 10 * 60_000);
  const input = await readBody(req, checkoutInput);
  const user = await getUser(req);
  const result = await createWebBooking(input, siteUrl(req), user);
  return json({ ok: true, ...result });
});
