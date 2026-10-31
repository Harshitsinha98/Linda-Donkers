import { handler, HttpError, json, query } from "../server/http.js";
import {
  CATEGORIES,
  getSessionImage,
  getSessionWithTaken,
  listUpcomingPublic,
  toPublic,
} from "../server/sessions.js";

/**
 * GET /api/sessions             -> upcoming published sessions (?limit, ?category)
 * GET /api/sessions?id=<id>     -> one published session
 * GET /api/session-image?id=<id> -> session cover photo (rewritten here to share this function)
 */
export const GET = handler(async (req) => {
  const q = query(req);

  if (q.get("asset") === "image") {
    const id = q.get("id") ?? "";
    const data = id ? await getSessionImage(id) : "";
    const match = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(data);
    if (!match) throw new HttpError(404, "no_image");
    const [, mime, b64] = match;
    const body = Buffer.from(b64, "base64");
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(body.length),
      },
    });
  }

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
