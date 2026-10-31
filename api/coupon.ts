import { z } from "zod";
import { sectionOf } from "../shared/catalog.js";
import { evaluateCoupon } from "../server/coupons.js";
import { clientIp, handler, HttpError, json, rateLimit, readBody } from "../server/http.js";
import { getPlan } from "../server/memberships.js";
import { getSessionRow } from "../server/sessions.js";

const body = z.object({
  code: z.string().trim().min(1).max(40),
  sessionId: z.string().max(64).optional(),
  seats: z.number().int().min(1).max(50).default(1),
  planId: z.string().max(64).optional(),
  email: z.string().trim().toLowerCase().max(200).optional(),
});

/** POST /api/coupon -> checks a discount code for a session or membership and returns the new total. */
export const POST = handler(async (req) => {
  // Low limit: stops people from guessing codes.
  rateLimit(`coupon:${clientIp(req)}`, 20, 10 * 60_000);
  const input = await readBody(req, body);
  const email = input.email && z.string().email().safeParse(input.email).success ? input.email : undefined;

  if (input.planId) {
    const plan = await getPlan(input.planId);
    if (!plan || plan.status !== "active") throw new HttpError(404, "not_found");
    const r = await evaluateCoupon(input.code, { kind: "membership" }, plan.price_cents, email);
    return json({ ok: true, code: r.coupon.code, discountCents: r.discountCents, totalCents: plan.price_cents - r.discountCents });
  }
  const s = input.sessionId ? await getSessionRow(input.sessionId) : undefined;
  if (!s || s.status !== "published") throw new HttpError(404, "not_found");
  const gross = s.price_cents * input.seats;
  const r = await evaluateCoupon(input.code, { kind: "session", section: sectionOf({ category: s.category, isOnline: !!s.is_online }) }, gross, email);
  return json({ ok: true, code: r.coupon.code, discountCents: r.discountCents, totalCents: gross - r.discountCents });
});
