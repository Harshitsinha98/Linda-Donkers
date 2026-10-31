import { couponInput, createCoupon, deleteCoupon, listCoupons, updateCoupon } from "../../server/coupons.js";
import { handler, HttpError, json, query, readBody, requireAdmin } from "../../server/http.js";

/** GET /api/admin/coupons */
export const GET = handler(async (req) => {
  requireAdmin(req);
  return json({ ok: true, coupons: await listCoupons() });
});

/** POST /api/admin/coupons  body: coupon fields -> create */
export const POST = handler(async (req) => {
  requireAdmin(req);
  return json({ ok: true, id: await createCoupon(await readBody(req, couponInput)) });
});

/** PATCH /api/admin/coupons?id=<id>  body: coupon fields */
export const PATCH = handler(async (req) => {
  requireAdmin(req);
  const id = query(req).get("id");
  if (!id) throw new HttpError(400, "missing_id");
  await updateCoupon(id, await readBody(req, couponInput));
  return json({ ok: true });
});

/** DELETE /api/admin/coupons?id=<id>  (used codes are switched off instead) */
export const DELETE = handler(async (req) => {
  requireAdmin(req);
  const id = query(req).get("id");
  if (!id) throw new HttpError(400, "missing_id");
  return json({ ok: true, ...(await deleteCoupon(id)) });
});
