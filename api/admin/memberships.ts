import { z } from "zod";
import { handler, json, readBody, requireAdmin, siteUrl } from "../../server/http.js";
import {
  createManualPass,
  createPlan,
  deletePlan,
  listPassesAdmin,
  listPlans,
  manualPassInput,
  passUpdateInput,
  planInput,
  seedPlansIfEmpty,
  updatePass,
  updatePlan,
} from "../../server/memberships.js";

/** GET /api/admin/memberships -> all plans (also hidden ones) and the sold passes */
export const GET = handler(async (req) => {
  requireAdmin(req);
  return json({ ok: true, plans: await listPlans(false), passes: await listPassesAdmin() });
});

const postBody = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create-plan"), plan: planInput }),
  z.object({ action: z.literal("update-plan"), id: z.string().min(1), plan: planInput }),
  z.object({ action: z.literal("delete-plan"), id: z.string().min(1) }),
  z.object({ action: z.literal("seed-plans") }),
  z.object({ action: z.literal("manual-pass"), pass: manualPassInput }),
  z.object({ action: z.literal("update-pass"), id: z.string().min(1), pass: passUpdateInput }),
]);

/** POST /api/admin/memberships { action, ... } */
export const POST = handler(async (req) => {
  requireAdmin(req);
  const body = await readBody(req, postBody);
  switch (body.action) {
    case "create-plan":
      return json({ ok: true, id: await createPlan(body.plan) });
    case "update-plan":
      await updatePlan(body.id, body.plan);
      return json({ ok: true });
    case "delete-plan":
      return json({ ok: true, ...(await deletePlan(body.id)) });
    case "seed-plans":
      return json({ ok: true, added: await seedPlansIfEmpty() });
    case "manual-pass":
      return json({ ok: true, ...(await createManualPass(body.pass, siteUrl(req))) });
    case "update-pass":
      await updatePass(body.id, body.pass);
      return json({ ok: true });
  }
});
