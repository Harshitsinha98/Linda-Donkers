import { handler, HttpError, json, query } from "../server/http.js";
import { CATEGORIES, getSessionWithTaken, listUpcomingPublic, toPublic } from "../server/sessions.js";

/** GET /api/sessions            -> upcoming published sessions (?limit, ?category)
 *  GET /api/sessions?id=<id>    -> one session (also drafts are hidden here) */
export const GET = handler(async (req) => {
  const q = query(req);
  const id = q.get("id");
  if (id) {
    const row = await getSessionWithTaken(id);
    if (!row || row.status === "draft") throw new HttpError(404, "not_found");
    return json({ ok: true, session: toPublic(row) });
  }
  const limit = Math.min(Math.max(Number(q.get("limit")) || 100, 1), 200);
  const cat = q.get("category");
  const category = cat && (CATEGORIES as readonly string[]).includes(cat) ? cat : undefined;
  return json({ ok: true, sessions: await listUpcomingPublic(limit, category) });
});
