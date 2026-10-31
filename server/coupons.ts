/**
 * Discount codes Linda creates in the admin panel.
 *
 * A coupon gives either a percentage or a fixed euro amount off. It can be limited to
 * sessions or memberships, to certain offers (e.g. only Lomi Lomi), to a date range,
 * to a total number of uses and to one use per email address.
 *
 * Uses are counted from the bookings and passes that carry the coupon (confirmed, or
 * still inside their payment window), so the count can never drift.
 */
import { z } from "zod";
import { all, get, run } from "./db.js";
import { HttpError, newId } from "./http.js";
import { nowIso } from "./time.js";
import { OFFER_KEYS, parseOffers, type OfferKey } from "../shared/catalog.js";

export type CouponRow = {
  id: string;
  code: string;
  description: string;
  kind: "percent" | "amount";
  value: number;
  applies_to: "all" | "sessions" | "memberships";
  offers: string;
  max_uses: number | null;
  once_per_email: number;
  valid_from: string | null;
  valid_until: string | null;
  active: number;
  created_at: string;
  updated_at: string;
};

export const normalizeCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, "");

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD");

export const couponInput = z
  .object({
    code: z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9_-]+$/, "letters, numbers, - and _ only"),
    description: z.string().trim().max(200).default(""),
    kind: z.enum(["percent", "amount"]),
    value: z.number().int().min(1),
    appliesTo: z.enum(["all", "sessions", "memberships"]).default("all"),
    offers: z.array(z.enum(OFFER_KEYS)).max(OFFER_KEYS.length).default([]),
    maxUses: z.number().int().min(1).max(100_000).nullable().default(null),
    oncePerEmail: z.boolean().default(false),
    validFrom: date.nullable().default(null),
    validUntil: date.nullable().default(null),
    active: z.boolean().default(true),
  })
  .refine((c) => c.kind !== "percent" || c.value <= 100, { message: "A percentage can be at most 100.", path: ["value"] })
  .refine((c) => !c.validFrom || !c.validUntil || c.validFrom <= c.validUntil, { message: "End date is before start date.", path: ["validUntil"] });
export type CouponInput = z.infer<typeof couponInput>;

/** Uses that count against the limit: confirmed, or still being paid for. */
async function usesOf(couponId: string, email?: string): Promise<number> {
  const now = nowIso();
  const emailSql = email ? " AND email = ?" : "";
  const emailArg = email ? [email] : [];
  const b = await get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM bookings WHERE coupon_id = ?${emailSql} AND (status = 'confirmed' OR (status = 'pending' AND hold_until > ?))`,
    [couponId, ...emailArg, now],
  );
  const p = await get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM member_passes WHERE coupon_id = ?${emailSql} AND (status = 'active' OR (status = 'pending' AND hold_until > ?))`,
    [couponId, ...emailArg, now],
  );
  return (b?.n ?? 0) + (p?.n ?? 0);
}

export type CouponTarget = { kind: "session"; offer: string } | { kind: "membership" };

/**
 * Checks a code for a purchase and returns the discount in cents.
 * Throws a 400 HttpError with a specific code the website translates.
 */
export async function quoteCoupon(rawCode: string, target: CouponTarget, amountCents: number, email?: string) {
  const code = normalizeCode(rawCode);
  if (!code) throw new HttpError(400, "coupon_invalid", "Unknown code.");
  const c = await get<CouponRow>(`SELECT * FROM coupons WHERE code = ?`, [code]);
  if (!c || !c.active) throw new HttpError(400, "coupon_invalid", "Unknown code.");

  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" }); // YYYY-MM-DD
  if (c.valid_from && today < c.valid_from) throw new HttpError(400, "coupon_not_yet", "This code isn't valid yet.");
  if (c.valid_until && today > c.valid_until) throw new HttpError(400, "coupon_expired", "This code has expired.");

  if (target.kind === "session" && c.applies_to === "memberships") throw new HttpError(400, "coupon_not_applicable", "This code is for memberships only.");
  if (target.kind === "membership" && c.applies_to === "sessions") throw new HttpError(400, "coupon_not_applicable", "This code is for sessions only.");
  const offers = parseOffers(c.offers);
  if (target.kind === "session" && offers.length && !offers.includes(target.offer as OfferKey)) {
    throw new HttpError(400, "coupon_not_applicable", "This code doesn't apply to this session.");
  }

  if (c.max_uses !== null && (await usesOf(c.id)) >= c.max_uses) throw new HttpError(400, "coupon_used_up", "This code has been used up.");
  if (c.once_per_email && email && (await usesOf(c.id, email.trim().toLowerCase())) > 0) {
    throw new HttpError(400, "coupon_already_used", "You've already used this code.");
  }

  const raw = c.kind === "percent" ? Math.round((amountCents * c.value) / 100) : c.value;
  const discountCents = Math.max(0, Math.min(amountCents, raw));
  return { coupon: c, discountCents };
}

/* ---------------- admin ---------------- */

function toAdmin(c: CouponRow, uses: number) {
  return {
    id: c.id,
    code: c.code,
    description: c.description,
    kind: c.kind,
    value: c.value,
    appliesTo: c.applies_to,
    offers: parseOffers(c.offers),
    maxUses: c.max_uses,
    oncePerEmail: !!c.once_per_email,
    validFrom: c.valid_from,
    validUntil: c.valid_until,
    active: !!c.active,
    uses,
    createdAt: c.created_at,
  };
}
export type AdminCoupon = ReturnType<typeof toAdmin>;

export async function listCoupons(): Promise<AdminCoupon[]> {
  const rows = await all<CouponRow>(`SELECT * FROM coupons ORDER BY created_at DESC`);
  return Promise.all(rows.map(async (c) => toAdmin(c, await usesOf(c.id))));
}

const columns = (i: CouponInput) => ({
  code: normalizeCode(i.code),
  description: i.description,
  kind: i.kind,
  value: i.value,
  applies_to: i.appliesTo,
  offers: JSON.stringify(i.offers),
  max_uses: i.maxUses,
  once_per_email: i.oncePerEmail ? 1 : 0,
  valid_from: i.validFrom,
  valid_until: i.validUntil,
  active: i.active ? 1 : 0,
});

async function assertCodeFree(code: string, exceptId?: string) {
  const other = await get<{ id: string }>(`SELECT id FROM coupons WHERE code = ?`, [normalizeCode(code)]);
  if (other && other.id !== exceptId) throw new HttpError(409, "code_taken", "A coupon with this code already exists.");
}

export async function createCoupon(i: CouponInput) {
  await assertCodeFree(i.code);
  const cols = columns(i);
  const now = nowIso();
  const keys = Object.keys(cols);
  const id = newId();
  await run(`INSERT INTO coupons (id, ${keys.join(", ")}, created_at, updated_at) VALUES (?, ${keys.map(() => "?").join(", ")}, ?, ?)`, [
    id,
    ...Object.values(cols),
    now,
    now,
  ]);
  return id;
}

export async function updateCoupon(id: string, i: CouponInput) {
  await assertCodeFree(i.code, id);
  const cols = columns(i);
  const keys = Object.keys(cols);
  const n = await run(`UPDATE coupons SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = ? WHERE id = ?`, [...Object.values(cols), nowIso(), id]);
  if (!n) throw new HttpError(404, "not_found");
}

/** Deletes a coupon that was never used; used coupons are switched off instead, to keep the history. */
export async function deleteCoupon(id: string) {
  const used = await get<{ n: number }>(
    `SELECT (SELECT COUNT(*) FROM bookings WHERE coupon_id = ?) + (SELECT COUNT(*) FROM member_passes WHERE coupon_id = ?) AS n`,
    [id, id],
  );
  if (used && used.n > 0) {
    await run(`UPDATE coupons SET active = 0, updated_at = ? WHERE id = ?`, [nowIso(), id]);
    return { deactivated: true };
  }
  await run(`DELETE FROM coupons WHERE id = ?`, [id]);
  return { deactivated: false };
}
