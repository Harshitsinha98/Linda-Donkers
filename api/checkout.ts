import { z } from "zod";
import { checkoutInput, createWebBooking } from "../server/bookings.js";
import { getUser } from "../server/auth.js";
import { findUsable, giftPublic, giftPurchaseInput, giftStatus, startGiftPurchase } from "../server/giftcards.js";
import { clientIp, handler, json, query, rateLimit, readBody, siteUrl } from "../server/http.js";

/*
 * Gift cards live in this function too: Vercel Hobby allows 12 functions per deployment and api/ already has 12.
 *   POST /api/checkout                    -> book a session (Stripe URL, or a confirmed free / class card / gift card booking)
 *   POST /api/checkout?giftcard=check     -> balance of a gift card code { code }
 *   POST /api/checkout?giftcard=buy       -> buy a gift card (Stripe URL)
 *   GET  /api/checkout?giftcard=status&ref=…&t=… -> the buyer's view after paying
 */
export const POST = handler(async (req) => {
  const gc = query(req).get("giftcard");
  if (gc === "check") {
    // Low limit: stops people from guessing codes.
    rateLimit(`giftcheck:${clientIp(req)}`, 20, 10 * 60_000);
    const { code } = await readBody(req, z.object({ code: z.string().trim().min(1).max(40) }));
    return json({ ok: true, giftCard: giftPublic(await findUsable(code)) });
  }
  if (gc === "buy") {
    rateLimit(`giftbuy:${clientIp(req)}`, 10, 10 * 60_000);
    return json({ ok: true, ...(await startGiftPurchase(await readBody(req, giftPurchaseInput), siteUrl(req))) });
  }

  rateLimit(`checkout:${clientIp(req)}`, 12, 10 * 60_000);
  const input = await readBody(req, checkoutInput);
  // Login is only needed to pay with a class card; a broken login must not block normal bookings.
  const user = input.membershipId ? await getUser(req) : await getUser(req).catch(() => null);
  const result = await createWebBooking(input, siteUrl(req), user);
  return json({ ok: true, ...result });
});

export const GET = handler(async (req) => {
  rateLimit(`giftstatus:${clientIp(req)}`, 60, 10 * 60_000);
  const q = query(req);
  return json({ ok: true, giftCard: await giftStatus(q.get("ref") ?? "", q.get("t") ?? "", siteUrl(req)) });
});
