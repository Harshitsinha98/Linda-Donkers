import { z } from "zod";
import { quoteForSession } from "../server/bookings.js";
import { quoteCoupon } from "../server/coupons.js";
import { get } from "../server/db.js";
import { clientIp, handler, HttpError, json, rateLimit, readBody } from "../server/http.js";

const body = z.object({
  code: z.string().trim().min(1).max(40),
  sessionId: z.string().max(64).optional(),
  seats: z.number().int().min(1).max(50).default(1),
  planId: z.string().max(64).optional(),
  email: z.string().trim().toLowerCase().max(200).optional(),
});

/** POST /api/coupon { code, sessionId+seats | planId, email? } -> the discount, so the form can show the new total. */
export const POST = handler(async (req) => {
  // Low limit: stops guessing codes.
  rateLimit(`coupon:${clientIp(req)}`, 20, 10 * 60_000);
  const input = await readBody(req, body);
  const email = input.email && /^\S+@\S+\.\S+$/.test(input.email) ? input.email : undefined;
  if (input.sessionId) {
    const q = await quoteForSession(input.sessionId, input.seats, input.code, email);
    return json({ ok: true, code: q.coupon.code, subtotalCents: q.subtotalCents, discountCents: q.discountCents, totalCents: q.totalCents });
  }
  if (input.planId) {
    const plan = await get<{ price_cents: number }>(`SELECT price_cents FROM membership_plans WHERE id = ? AND active = 1`, [input.planId]);
    if (!plan) throw new HttpError(404, "plan_unavailable");
    const q = await quoteCoupon(input.code, { kind: "membership" }, plan.price_cents, email);
    return json({ ok: true, code: q.coupon.code, subtotalCents: plan.price_cents, discountCents: q.discountCents, totalCents: plan.price_cents - q.discountCents });
  }
  throw new HttpError(400, "invalid_input", "sessionId or planId is required.");
});
