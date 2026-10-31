import { checkoutInput, createWebBooking } from "../server/bookings.js";
import { getUser } from "../server/auth.js";
import { clientIp, handler, json, rateLimit, readBody, siteUrl } from "../server/http.js";

/** POST /api/checkout -> reserves the places and returns a Stripe Checkout URL (or a confirmed free / membership booking). */
export const POST = handler(async (req) => {
  rateLimit(`checkout:${clientIp(req)}`, 12, 10 * 60_000);
  const input = await readBody(req, checkoutInput);
  // Login is only needed to pay with a membership; a broken login must not block normal bookings.
  const user = input.membershipId ? await getUser(req) : await getUser(req).catch(() => null);
  const result = await createWebBooking(input, siteUrl(req), user);
  return json({ ok: true, ...result });
});
