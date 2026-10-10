import { checkoutInput, createWebBooking } from "../server/bookings.js";
import { clientIp, handler, json, rateLimit, readBody, siteUrl } from "../server/http.js";

/** POST /api/checkout -> reserves the places and returns a Stripe Checkout URL (or a confirmed free booking). */
export const POST = handler(async (req) => {
  rateLimit(`checkout:${clientIp(req)}`, 12, 10 * 60_000);
  const input = await readBody(req, checkoutInput);
  const result = await createWebBooking(input, siteUrl(req));
  return json({ ok: true, ...result });
});
