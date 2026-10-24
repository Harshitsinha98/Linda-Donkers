import { getSessionImage } from "../server/sessions.js";
import { handler, HttpError, query } from "../server/http.js";

/**
 * GET /api/session-image?id=<id>
 * Serves a session's cover photo (stored as a data URL in the database) as a real image,
 * so pages can use it in a normal <img>. Cached hard; the `v` query param busts it on change.
 */
export const GET = handler(async (req) => {
  const id = query(req).get("id") ?? "";
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
});
