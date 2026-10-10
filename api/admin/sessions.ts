import { z } from "zod";
import { cancelSession } from "../../server/bookings.js";
import { handler, HttpError, json, query, readBody, requireAdmin, siteUrl } from "../../server/http.js";
import {
  createSessions,
  deleteSession,
  getSessionRow,
  listAdmin,
  rowToInput,
  sessionInput,
  updateSession,
} from "../../server/sessions.js";

/** GET /api/admin/sessions?scope=upcoming|past */
export const GET = handler(async (req) => {
  requireAdmin(req);
  const scope = query(req).get("scope") === "past" ? "past" : "upcoming";
  return json({ ok: true, sessions: await listAdmin(scope) });
});

const postBody = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), session: sessionInput, repeatWeeks: z.number().int().min(0).max(52).default(0) }),
  z.object({ action: z.literal("duplicate"), id: z.string().min(1) }),
  z.object({ action: z.literal("cancel"), id: z.string().min(1) }),
  z.object({ action: z.literal("publish"), id: z.string().min(1), publish: z.boolean() }),
]);

/** POST /api/admin/sessions { action: create | duplicate | cancel | publish } */
export const POST = handler(async (req) => {
  requireAdmin(req);
  const body = await readBody(req, postBody);
  switch (body.action) {
    case "create":
      return json({ ok: true, ids: await createSessions(body.session, body.repeatWeeks) });
    case "duplicate": {
      const row = await getSessionRow(body.id);
      if (!row) throw new HttpError(404, "not_found");
      const ids = await createSessions({ ...rowToInput(row), status: "draft" }, 0);
      return json({ ok: true, ids });
    }
    case "publish": {
      const row = await getSessionRow(body.id);
      if (!row) throw new HttpError(404, "not_found");
      await updateSession(body.id, { ...rowToInput(row), status: body.publish ? "published" : "draft" });
      return json({ ok: true });
    }
    case "cancel":
      return json({ ok: true, ...(await cancelSession(body.id, siteUrl(req))) });
  }
});

/** PATCH /api/admin/sessions?id=<id>  body: full session fields */
export const PATCH = handler(async (req) => {
  requireAdmin(req);
  const id = query(req).get("id");
  if (!id) throw new HttpError(400, "missing_id");
  await updateSession(id, await readBody(req, sessionInput));
  return json({ ok: true });
});

/** DELETE /api/admin/sessions?id=<id>  (only sessions without bookings) */
export const DELETE = handler(async (req) => {
  requireAdmin(req);
  const id = query(req).get("id");
  if (!id) throw new HttpError(400, "missing_id");
  await deleteSession(id);
  return json({ ok: true });
});
