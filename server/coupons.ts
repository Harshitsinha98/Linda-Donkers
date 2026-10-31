/**
 * Discount codes Linda creates in the admin panel. A code can be a percentage or a fixed
 * amount, limited to a section (yoga / massage / online), to memberships, to a date range,
 * to a total number of uses and to a number of uses per email address.
 *
 * A use is reserved atomically when a checkout starts and released again if that payment
 * never completes, so a "first 10 people" code can't be used 11 times.
 */
import { z } from "zod";
import { all, get, run } from "./db.js";
import { HttpError, newId } from "./http.js";
import { nowIso, todayBE } from "./time.js";

export const APPLIES_TO = ["all", "sessions", "yoga", "massage", "online", "memberships"] as const;
export type AppliesTo = (typeof APPLIES_TO)[number];

export type CouponRow = {
  id: string;
  code: string;
  description: string;
  kind: "percent" | "fixed";
  value: number;
  applies_to: AppliesTo;
  min_amount_cents: number;
  max_uses: number;
  max_uses_per_email: number;
  used_count: number;
  valid_from: string;
  valid_until: string;
  active: number;
  created_at: string;
  updated_at: string;
};

export type CouponTarget = { kind: "session"; section: string } | { kind: "membership" };

export const normalizeCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, "");

const fail = (code: string, message: string) => new HttpError(400, code, message);

function applies(c: CouponRow, target: CouponTarget): boolean {
  if (c.applies_to === "all") return true;
  if (target.kind === "membership") return c.applies_to === "memberships";
  if (c.applies_to === "sessions") return true;
  return c.applies_to === target.section;
}

export function discountFor(c: Pick<CouponRow, "kind" | "value">, amountCents: number): number {
  const d = c.kind === "percent" ? Math.round((amountCents * Math.min(c.value, 100)) / 100) : c.value;
  return Math.max(0, Math.min(d, amountCents));
}

/**
 * Checks a code for this purchase and returns the discount. Throws a 400 with a specific
 * error code (coupon_invalid, coupon_expired, …) the website translates for the visitor.
 */
export async function evaluateCoupon(rawCode: string, target: CouponTarget, amountCents: number, email?: string) {
  const code = normalizeCode(rawCode);
  const c = code ? await get<CouponRow>(`SELECT * FROM coupons WHERE code = ?`, [code]) : undefined;
  if (!c || !c.active) throw fail("coupon_invalid", "This code is not valid.");
  const today = todayBE();
  if ((c.valid_from && today < c.valid_from) || (c.valid_until && today > c.valid_until)) {
    throw fail("coupon_expired", "This code is not valid (anymore).");
  }
  if (!applies(c, target)) throw fail("coupon_not_applicable", "This code can't be used for this.");
  if (c.min_amount_cents && amountCents < c.min_amount_cents) throw fail("coupon_min_amount", "The amount is too low for this code.");
  if (c.max_uses && c.used_count >= c.max_uses) throw fail("coupon_used_up", "This code has been used up.");
  if (email && c.max_uses_per_email) {
    const used = await get<{ n: number }>(
      `SELECT
         (SELECT COUNT(*) FROM bookings WHERE coupon_code = ? AND email = ?
            AND (status = 'confirmed' OR (status = 'pending' AND hold_until > ?)))
       + (SELECT COUNT(*) FROM memberships WHERE coupon_code = ? AND email = ? AND status IN ('active','pending')) AS n`,
      [c.code, email, nowIso(), c.code, email],
    );
    if ((used?.n ?? 0) >= c.max_uses_per_email) throw fail("coupon_already_used", "You have already used this code.");
  }
  return { coupon: c, discountCents: discountFor(c, amountCents) };
}

/** Takes one use of the code. Returns false if it was used up in the meantime. */
export async function reserveCoupon(c: CouponRow): Promise<boolean> {
  const changed = await run(
    `UPDATE coupons SET used_count = used_count + 1 WHERE id = ? AND active = 1 AND (max_uses = 0 OR used_count < max_uses)`,
    [c.id],
  );
  return changed > 0;
}

/** Gives a use back (the checkout it was reserved for never completed). */
export async function releaseCoupon(code: string) {
  if (!code) return;
  await run(`UPDATE coupons SET used_count = used_count - 1 WHERE code = ? AND used_count > 0`, [code]);
}

/* ---------------- admin ---------------- */

const date = z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "use YYYY-MM-DD").default("");

export const couponInput = z
  .object({
    code: z
      .string()
      .transform(normalizeCode)
      .pipe(z.string().regex(/^[A-Z0-9_-]{3,30}$/, "3–30 letters, digits, - or _")),
    description: z.string().trim().max(200).default(""),
    kind: z.enum(["percent", "fixed"]),
    value: z.number().int().min(1).max(10_000_000),
    appliesTo: z.enum(APPLIES_TO).default("all"),
    minAmountCents: z.number().int().min(0).max(10_000_000).default(0),
    maxUses: z.number().int().min(0).max(1_000_000).default(0),
    maxUsesPerEmail: z.number().int().min(0).max(1000).default(1),
    validFrom: date,
    validUntil: date,
    active: z.boolean().default(true),
  })
  .refine((c) => c.kind !== "percent" || c.value <= 100, { message: "A percentage can be at most 100.", path: ["value"] })
  .refine((c) => !c.validFrom || !c.validUntil || c.validFrom <= c.validUntil, { message: "End date is before start date.", path: ["validUntil"] });
export type CouponInput = z.infer<typeof couponInput>;

const cols = (i: CouponInput) => ({
  code: i.code,
  description: i.description,
  kind: i.kind,
  value: i.value,
  applies_to: i.appliesTo,
  min_amount_cents: i.minAmountCents,
  max_uses: i.maxUses,
  max_uses_per_email: i.maxUsesPerEmail,
  valid_from: i.validFrom,
  valid_until: i.validUntil,
  active: i.active ? 1 : 0,
});

async function assertUnique(code: string, exceptId = "") {
  const other = await get<{ id: string }>(`SELECT id FROM coupons WHERE code = ? AND id <> ?`, [code, exceptId]);
  if (other) throw new HttpError(409, "duplicate_code", `The code ${code} already exists.`);
}

export async function createCoupon(i: CouponInput) {
  await assertUnique(i.code);
  const c = cols(i);
  const now = nowIso();
  const keys = Object.keys(c);
  const id = newId();
  await run(`INSERT INTO coupons (id, ${keys.join(", ")}, created_at, updated_at) VALUES (?, ${keys.map(() => "?").join(", ")}, ?, ?)`, [
    id, ...Object.values(c), now, now,
  ]);
  return id;
}

export async function updateCoupon(id: string, i: CouponInput) {
  if (!(await get(`SELECT id FROM coupons WHERE id = ?`, [id]))) throw new HttpError(404, "not_found");
  await assertUnique(i.code, id);
  const c = cols(i);
  const keys = Object.keys(c);
  await run(`UPDATE coupons SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = ? WHERE id = ?`, [...Object.values(c), nowIso(), id]);
}

/** Unused codes are deleted; used ones are switched off so past bookings keep their history. */
export async function deleteCoupon(id: string) {
  const c = await get<CouponRow>(`SELECT * FROM coupons WHERE id = ?`, [id]);
  if (!c) throw new HttpError(404, "not_found");
  if (c.used_count > 0) {
    await run(`UPDATE coupons SET active = 0, updated_at = ? WHERE id = ?`, [nowIso(), id]);
    return { deactivated: true };
  }
  await run(`DELETE FROM coupons WHERE id = ?`, [id]);
  return { deactivated: false };
}

export async function listCoupons() {
  const rows = await all<CouponRow & { revenue: number; discount: number }>(
    `SELECT c.*,
       COALESCE((SELECT SUM(discount_cents) FROM bookings b WHERE b.coupon_code = c.code AND b.status IN ('confirmed','cancelled')), 0)
     + COALESCE((SELECT SUM(discount_cents) FROM memberships m WHERE m.coupon_code = c.code AND m.status IN ('active','expired','cancelled')), 0) AS discount
     FROM coupons c ORDER BY c.created_at DESC`,
  );
  return rows.map((c) => ({
    id: c.id,
    code: c.code,
    description: c.description,
    kind: c.kind,
    value: c.value,
    appliesTo: c.applies_to,
    minAmountCents: c.min_amount_cents,
    maxUses: c.max_uses,
    maxUsesPerEmail: c.max_uses_per_email,
    usedCount: c.used_count,
    validFrom: c.valid_from,
    validUntil: c.valid_until,
    active: !!c.active,
    discountGivenCents: c.discount,
    createdAt: c.created_at,
  }));
}
