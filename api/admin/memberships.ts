import { z } from "zod";
import { handler, HttpError, json, query, readBody, requireAdmin, siteUrl } from "../../server/http.js";
import {
  adjustInput,
  adjustMembership,
  cancelMembership,
  createPlan,
  deletePlan,
  grantInput,
  grantMembership,
  listPlansAdmin,
  listSold,
  planInput,
  seedDefaultPlans,
  updatePlan,
} from "../../server/memberships.js";

/** GET /api/admin/memberships?view=plans | sold[&filter=active] */
export const GET = handler(async (req) => {
  requireAdmin(req);
  const q = query(req);
  if (q.get("view") === "sold") return json({ ok: true, memberships: await listSold(q.get("filter") === "active" ? "active" : "all") });
  return json({ ok: true, plans: await listPlansAdmin() });
});

const postBody = z.discriminatedUnion("action", [
  z.object({ action: z.literal("createPlan"), plan: planInput }),
  z.object({ action: z.literal("updatePlan"), id: z.string().min(1), plan: planInput }),
  z.object({ action: z.literal("deletePlan"), id: z.string().min(1) }),
  z.object({ action: z.literal("seedPlans") }),
  z.object({ action: z.literal("grant"), membership: grantInput }),
  z.object({ action: z.literal("adjust"), membership: adjustInput }),
  z.object({ action: z.literal("cancel"), id: z.string().min(1), refund: z.boolean().default(false) }),
]);

/** POST /api/admin/memberships { action: createPlan | updatePlan | deletePlan | seedPlans | grant | adjust | cancel } */
export const POST = handler(async (req) => {
  requireAdmin(req);
  const body = await readBody(req, postBody);
  switch (body.action) {
    case "createPlan":
      return json({ ok: true, id: await createPlan(body.plan) });
    case "updatePlan":
      await updatePlan(body.id, body.plan);
      return json({ ok: true });
    case "deletePlan":
      return json({ ok: true, ...(await deletePlan(body.id)) });
    case "seedPlans":
      return json({ ok: true, created: await seedDefaultPlans() });
    case "grant":
      return json({ ok: true, ...(await grantMembership(body.membership, siteUrl(req))) });
    case "adjust":
      await adjustMembership(body.membership);
      return json({ ok: true });
    case "cancel":
      return json({ ok: true, ...(await cancelMembership(body.id, body.refund)) });
  }
  throw new HttpError(400, "unknown_action");
});
