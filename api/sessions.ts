import { handler, HttpError, json, query } from "../server/http.js";
import {
  CATEGORIES,
  getSessionImage,
  getSessionWithTaken,
  getAvailableAppointmentSlots,
  getAvailableAppointmentSlotsInRange,
  listUpcomingPublic,
  MAX_CALENDAR_DAYS,
  toPublic,
} from "../server/sessions.js";

/**
 * GET /api/sessions             -> upcoming published sessions (?limit, ?category)
 * GET /api/sessions?id=<id>     -> one published session
 * GET /api/sessions?availabilityFor=<id>&date=YYYY-MM-DD           -> free times on one day
 * GET /api/sessions?calendarFor=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD -> free times per day (booking calendar)
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

  const calendarFor = q.get("calendarFor");
  if (calendarFor) {
    const from = q.get("from") ?? "";
    const to = q.get("to") ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) throw new HttpError(400, "bad_range");
    const span = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
    if (span > MAX_CALENDAR_DAYS) throw new HttpError(400, "range_too_long");
    return json({ ok: true, days: await getAvailableAppointmentSlotsInRange(calendarFor, from, to) });
  }

  const availabilityFor = q.get("availabilityFor");
  if (availabilityFor) {
    const day = q.get("date") ?? "";
    if (!day) throw new HttpError(400, "missing_date");
    return json({ ok: true, slots: await getAvailableAppointmentSlots(availabilityFor, day) });
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
