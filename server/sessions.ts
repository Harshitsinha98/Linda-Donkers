import { z } from "zod";
import { all, get, run } from "./db.js";
import { HttpError, newId } from "./http.js";
import { addDays, nowIso, zonedToUtc } from "./time.js";

export const CATEGORIES = ["yoga", "gong", "workshop", "massage", "healing", "online", "retreat", "other"] as const;

export type SessionRow = {
  id: string;
  title_nl: string;
  title_en: string;
  description_nl: string;
  description_en: string;
  category: string;
  venue: string;
  address: string;
  is_online: number;
  online_link: string;
  date: string;
  start_time: string;
  starts_at: string;
  duration_min: number;
  capacity: number;
  price_cents: number;
  max_per_booking: number;
  status: "draft" | "published" | "cancelled";
  created_at: string;
  updated_at: string;
};

/**
 * Seats that are taken: confirmed bookings, plus pending ones still inside their
 * payment window. Expects the outer query to alias sessions as `s`; takes one `now` arg.
 */
export const TAKEN_SQL = `COALESCE((SELECT SUM(b.seats) FROM bookings b
  WHERE b.session_id = s.id AND (b.status = 'confirmed' OR (b.status = 'pending' AND b.hold_until > ?))), 0)`;

export type PublicSession = ReturnType<typeof toPublic>;

export function toPublic(row: SessionRow & { taken?: number }) {
  return {
    id: row.id,
    title: { nl: row.title_nl, en: row.title_en || row.title_nl },
    description: { nl: row.description_nl, en: row.description_en || row.description_nl },
    category: row.category,
    venue: row.venue,
    address: row.address,
    isOnline: !!row.is_online,
    date: row.date,
    startTime: row.start_time,
    startsAt: row.starts_at,
    durationMin: row.duration_min,
    priceCents: row.price_cents,
    capacity: row.capacity,
    spotsLeft: Math.max(0, row.capacity - (row.taken ?? 0)),
    maxPerBooking: row.max_per_booking,
    status: row.status,
  };
}

export async function getSessionRow(id: string): Promise<SessionRow | undefined> {
  return get<SessionRow>(`SELECT * FROM sessions WHERE id = ?`, [id]);
}

export async function getSessionWithTaken(id: string) {
  return get<SessionRow & { taken: number }>(`SELECT s.*, ${TAKEN_SQL} AS taken FROM sessions s WHERE s.id = ?`, [nowIso(), id]);
}

export async function listUpcomingPublic(limit: number, category?: string) {
  const now = nowIso();
  const args: (string | number)[] = [now, now];
  let where = `s.status = 'published' AND s.starts_at > ?`;
  if (category) {
    where += ` AND s.category = ?`;
    args.push(category);
  }
  args.push(limit);
  const rows = await all<SessionRow & { taken: number }>(
    `SELECT s.*, ${TAKEN_SQL} AS taken FROM sessions s WHERE ${where} ORDER BY s.starts_at ASC LIMIT ?`,
    args,
  );
  return rows.map(toPublic);
}

/* ---------------- admin ---------------- */

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "use HH:MM");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD");

export const sessionInput = z.object({
  titleNl: z.string().trim().min(1).max(120),
  titleEn: z.string().trim().max(120).default(""),
  descriptionNl: z.string().trim().max(4000).default(""),
  descriptionEn: z.string().trim().max(4000).default(""),
  category: z.enum(CATEGORIES),
  venue: z.string().trim().max(160).default(""),
  address: z.string().trim().max(240).default(""),
  isOnline: z.boolean().default(false),
  onlineLink: z.string().trim().max(500).default(""),
  date,
  startTime: time,
  durationMin: z.number().int().min(5).max(24 * 60),
  capacity: z.number().int().min(1).max(1000),
  priceCents: z.number().int().min(0).max(1_000_000),
  maxPerBooking: z.number().int().min(1).max(50),
  status: z.enum(["draft", "published"]).default("published"),
});
export type SessionInput = z.infer<typeof sessionInput>;

export type AdminSession = ReturnType<typeof toPublic> & {
  onlineLink: string;
  confirmedSeats: number;
  pendingSeats: number;
  bookingsCount: number;
  revenueCents: number;
  createdAt: string;
};

export async function listAdmin(scope: "upcoming" | "past"): Promise<AdminSession[]> {
  const now = nowIso();
  const rows = await all<SessionRow & { confirmed: number; pending: number; cnt: number; revenue: number }>(
    `SELECT s.*,
       COALESCE((SELECT SUM(seats) FROM bookings b WHERE b.session_id = s.id AND b.status = 'confirmed'), 0) AS confirmed,
       COALESCE((SELECT SUM(seats) FROM bookings b WHERE b.session_id = s.id AND b.status = 'pending' AND b.hold_until > ?), 0) AS pending,
       (SELECT COUNT(*) FROM bookings b WHERE b.session_id = s.id AND b.status = 'confirmed') AS cnt,
       COALESCE((SELECT SUM(amount_cents - refunded_cents) FROM bookings b WHERE b.session_id = s.id AND b.status IN ('confirmed','cancelled')), 0) AS revenue
     FROM sessions s
     WHERE ${scope === "upcoming" ? "s.starts_at > ?" : "s.starts_at <= ?"}
     ORDER BY s.starts_at ${scope === "upcoming" ? "ASC" : "DESC"}
     LIMIT 300`,
    [now, now],
  );
  return rows.map((r) => ({
    ...toPublic({ ...r, taken: r.confirmed + r.pending }),
    onlineLink: r.online_link,
    confirmedSeats: r.confirmed,
    pendingSeats: r.pending,
    bookingsCount: r.cnt,
    revenueCents: r.revenue,
    createdAt: r.created_at,
  }));
}

function columns(input: SessionInput) {
  return {
    title_nl: input.titleNl,
    title_en: input.titleEn,
    description_nl: input.descriptionNl,
    description_en: input.descriptionEn,
    category: input.category,
    venue: input.venue,
    address: input.address,
    is_online: input.isOnline ? 1 : 0,
    online_link: input.onlineLink,
    date: input.date,
    start_time: input.startTime,
    starts_at: zonedToUtc(input.date, input.startTime).toISOString(),
    duration_min: input.durationMin,
    capacity: input.capacity,
    price_cents: input.priceCents,
    max_per_booking: Math.min(input.maxPerBooking, input.capacity),
    status: input.status,
  };
}

/** Creates one session, or a weekly series when repeatWeeks > 0. Returns the new ids. */
export async function createSessions(input: SessionInput, repeatWeeks: number): Promise<string[]> {
  const ids: string[] = [];
  for (let w = 0; w <= repeatWeeks; w++) {
    const cols = columns({ ...input, date: addDays(input.date, w * 7) });
    const id = newId();
    const now = nowIso();
    const keys = Object.keys(cols);
    await run(
      `INSERT INTO sessions (id, ${keys.join(", ")}, created_at, updated_at) VALUES (?, ${keys.map(() => "?").join(", ")}, ?, ?)`,
      [id, ...Object.values(cols), now, now],
    );
    ids.push(id);
  }
  return ids;
}

export async function updateSession(id: string, input: SessionInput) {
  const existing = await getSessionWithTaken(id);
  if (!existing) throw new HttpError(404, "not_found");
  if (existing.status === "cancelled") throw new HttpError(409, "cancelled", "A cancelled session cannot be edited.");
  if (input.capacity < existing.taken) {
    throw new HttpError(409, "capacity_too_low", `${existing.taken} places are already booked. Capacity can't be lower than that.`);
  }
  const cols = columns(input);
  const keys = Object.keys(cols);
  await run(`UPDATE sessions SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = ? WHERE id = ?`, [
    ...Object.values(cols),
    nowIso(),
    id,
  ]);
}

export async function deleteSession(id: string) {
  const used = await get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM bookings WHERE session_id = ? AND status IN ('confirmed','cancelled','pending')`,
    [id],
  );
  if (used && used.n > 0) {
    throw new HttpError(409, "has_bookings", "This session has bookings. Cancel it instead, so everyone is refunded and informed.");
  }
  await run(`DELETE FROM bookings WHERE session_id = ?`, [id]);
  await run(`DELETE FROM sessions WHERE id = ?`, [id]);
}

export function rowToInput(row: SessionRow): SessionInput {
  return {
    titleNl: row.title_nl,
    titleEn: row.title_en,
    descriptionNl: row.description_nl,
    descriptionEn: row.description_en,
    category: row.category as SessionInput["category"],
    venue: row.venue,
    address: row.address,
    isOnline: !!row.is_online,
    onlineLink: row.online_link,
    date: row.date,
    startTime: row.start_time,
    durationMin: row.duration_min,
    capacity: row.capacity,
    priceCents: row.price_cents,
    maxPerBooking: row.max_per_booking,
    status: row.status === "cancelled" ? "draft" : row.status,
  };
}
