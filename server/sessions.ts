import { z } from "zod";
import { all, get, run } from "./db.js";
import { HttpError, newId } from "./http.js";
import { addDays, nowIso, todayBE, zonedToUtc } from "./time.js";
import { OFFERINGS, PHOTO_KEYS, sectionOf } from "../shared/catalog.js";

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
  image: string;
  image_key: string;
  offering: string;
  booking_mode: "scheduled" | "appointment";
  availability_rule: string;
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
    // The image itself is served separately so list payloads stay small.
    hasImage: !!row.image,
    imageUrl: row.image ? `/api/session-image?id=${row.id}&v=${Date.parse(row.updated_at) || 0}` : "",
    imageKey: row.image_key || "",
    offering: row.offering || "",
    bookingMode: row.booking_mode === "appointment" ? ("appointment" as const) : ("scheduled" as const),
    availability: parseAvailability(row.availability_rule),
    section: sectionOf({ category: row.category, isOnline: !!row.is_online }),
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

const availabilitySchema = z.object({
  enabled: z.boolean().default(false),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).default(""),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  intervalWeeks: z.number().int().min(1).max(52).default(1),
  slotTimes: z.array(time).max(24).default([]),
  bufferMinutes: z.number().int().min(0).max(180).default(0),
});
export type AvailabilityRule = z.infer<typeof availabilitySchema>;

export const EMPTY_AVAILABILITY: AvailabilityRule = {
  enabled: false, startDate: "", weekdays: [], intervalWeeks: 1, slotTimes: [], bufferMinutes: 0,
};

export function parseAvailability(raw: string | null | undefined): AvailabilityRule | null {
  if (!raw) return null;
  try {
    const value = availabilitySchema.parse(JSON.parse(raw));
    return value.enabled ? value : null;
  } catch {
    return null;
  }
}

function weekdayOf(dateValue: string): number {
  const [y, m, d] = dateValue.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function mondayOf(dateValue: string): number {
  const [y, m, d] = dateValue.split("-").map(Number);
  const value = new Date(Date.UTC(y, m - 1, d));
  value.setUTCDate(value.getUTCDate() - ((value.getUTCDay() + 6) % 7));
  return value.getTime();
}

export function isRecurringDate(dateValue: string, endDate: string, rule: AvailabilityRule): boolean {
  if (!rule.enabled || !rule.startDate || dateValue < rule.startDate || dateValue > endDate) return false;
  if (!rule.weekdays.includes(weekdayOf(dateValue))) return false;
  const weeks = Math.floor((mondayOf(dateValue) - mondayOf(rule.startDate)) / (7 * 86_400_000));
  return weeks >= 0 && weeks % rule.intervalWeeks === 0;
}

export type AvailableAppointmentSlot = {
  time: string;
  startsAt: string;
  endsAt: string;
};


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
  // Optional cover photo as a data URL (data:image/...;base64,...). Empty string keeps the current image on update.
  imageData: z.string().max(3_500_000).default(""),
  removeImage: z.boolean().default(false),
  // One of Linda's own photos (see shared/catalog.ts), used when no photo is uploaded.
  imageKey: z.union([z.literal(""), z.enum(PHOTO_KEYS)]).default(""),
  // Which regular offering this is (used for membership cards). Empty for one-off sessions.
  offering: z.string().trim().max(40).default(""),
  // "appointment": no fixed time; `date` is the last day it can be booked and the customer gives a preferred moment.
  bookingMode: z.enum(["scheduled", "appointment"]).default("scheduled"),
  availability: availabilitySchema.default(EMPTY_AVAILABILITY),
}).superRefine((value, ctx) => {
  const rule = value.availability;
  if (!rule.enabled) return;
  if (value.bookingMode !== "appointment") {
    ctx.addIssue({ code: "custom", path: ["availability"], message: "Weekly availability can only be used with appointment sessions." });
  }
  if (!rule.startDate || rule.startDate > value.date) {
    ctx.addIssue({ code: "custom", path: ["availability", "startDate"], message: "The availability start date must be on or before the end date." });
  }
  if (rule.weekdays.length === 0 || new Set(rule.weekdays).size !== rule.weekdays.length) {
    ctx.addIssue({ code: "custom", path: ["availability", "weekdays"], message: "Choose at least one unique weekday." });
  }
  if (rule.slotTimes.length === 0 || new Set(rule.slotTimes).size !== rule.slotTimes.length) {
    ctx.addIssue({ code: "custom", path: ["availability", "slotTimes"], message: "Add at least one unique start time." });
  }
  const sorted = [...rule.slotTimes].sort();
  const requiredGap = value.durationMin + rule.bufferMinutes;
  for (let i = 1; i < sorted.length; i++) {
    const [ah, am] = sorted[i - 1].split(":").map(Number);
    const [bh, bm] = sorted[i].split(":").map(Number);
    if ((bh * 60 + bm) - (ah * 60 + am) < requiredGap) {
      ctx.addIssue({ code: "custom", path: ["availability", "slotTimes"], message: "Time slots overlap. Leave at least the session duration plus the buffer between start times." });
      break;
    }
  }
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
    image_key: input.imageKey,
    offering: input.offering,
    booking_mode: input.bookingMode,
    availability_rule: input.availability.enabled ? JSON.stringify(input.availability) : "",
  };
}

/** Validates an uploaded data URL and returns it, or "" if invalid/empty. */
function cleanImage(data: string): string {
  if (!data) return "";
  if (!/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(data)) {
    throw new HttpError(400, "bad_image", "The image must be a PNG, JPG, WebP or GIF.");
  }
  return data;
}

/** Creates one session, or a weekly series when repeatWeeks > 0. Returns the new ids. */
export async function createSessions(input: SessionInput, repeatWeeks: number): Promise<string[]> {
  const ids: string[] = [];
  const image = cleanImage(input.imageData);
  for (let w = 0; w <= repeatWeeks; w++) {
    const cols = { ...columns({ ...input, date: addDays(input.date, w * 7) }), image };
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
  const base = columns(input);
  const cols: Record<string, string | number> =
    input.removeImage ? { ...base, image: "" }
    : input.imageData ? { ...base, image: cleanImage(input.imageData) }
    : base; // no new image sent and not removing: leave the existing image untouched
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
    imageData: "",
    removeImage: false,
    imageKey: (PHOTO_KEYS as readonly string[]).includes(row.image_key) ? (row.image_key as SessionInput["imageKey"]) : "",
    offering: row.offering || "",
    bookingMode: row.booking_mode === "appointment" ? "appointment" : "scheduled",
    availability: parseAvailability(row.availability_rule) ?? EMPTY_AVAILABILITY,
  };
}

/** Raw stored image (data URL) for the image-serving endpoint. */
export async function getSessionImage(id: string): Promise<string> {
  const row = await get<{ image: string }>(`SELECT image FROM sessions WHERE id = ?`, [id]);
  return row?.image ?? "";
}

/* ---------------- non-destructive standard schedule sync ---------------- */

type StandardSyncCandidate = {
  offering: string;
  title: string;
  date: string;
  startTime: string;
  bookingMode: "scheduled" | "appointment";
  section: string;
  isOnline: boolean;
  status: "published" | "draft";
  durationMin: number;
  priceCents: number;
};

type StandardSyncRow = Pick<SessionRow,
  | "id" | "title_nl" | "title_en" | "category" | "is_online" | "date" | "start_time"
  | "starts_at" | "duration_min" | "price_cents" | "offering" | "booking_mode" | "status"
>;

type StandardSyncConflict = {
  offering: string;
  title: string;
  existingTitle: string;
  date: string;
  existingTime: string;
  expectedTime: string;
  reason: string;
};

/** Normalise accents and punctuation so older hand-created sessions can be recognised safely. */
function comparableTitle(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function relatedToOffering(row: StandardSyncRow, offering: (typeof OFFERINGS)[number]): boolean {
  if (row.offering === offering.key) return true;
  if (row.category !== offering.category) return false;

  // Sat Nam Rasayan has separate live and online offerings with nearly identical names.
  // The online flag disambiguates those two records.
  if (offering.key.startsWith("satnam-") && Boolean(row.is_online) !== offering.isOnline) return false;

  const actual = [row.title_nl, row.title_en].filter(Boolean).map(comparableTitle);
  const expected = [offering.titleNl, offering.titleEn].map(comparableTitle);
  if (actual.some((a) => expected.some((e) => a === e || a.startsWith(e) || e.startsWith(a)))) return true;

  // Older admin entries may call the Saturday one-to-one session "Kundalini Yoga Privé".
  if (offering.key === "coaching-online" && Boolean(row.is_online) && actual.some((a) => a.includes("kundaliniyogaprive"))) return true;
  return false;
}

/**
 * Preview or create only missing regular offerings. Unlike resetToStandard(), this never
 * deletes, edits, cancels, hides or republishes an existing session. A similar existing
 * record with different time/mode/price is reported as a conflict and is not duplicated.
 *
 * Online sessions start as drafts until Linda adds their private meeting link in the admin.
 */
export async function syncMissingStandard(weeks: number, previewOnly: boolean) {
  const today = todayBE();
  const rows = await all<StandardSyncRow>(`SELECT id, title_nl, title_en, category, is_online, date, start_time, starts_at, duration_min, price_cents, offering, booking_mode, status FROM sessions`, []);
  const candidates: StandardSyncCandidate[] = [];
  const conflicts: StandardSyncConflict[] = [];
  const skipped: { offering: string; title: string; date: string; reason: string }[] = [];
  const created: { id: string; offering: string; title: string; date: string; startTime: string; status: string }[] = [];
  const appointmentUntil = addDays(today, 365);

  for (const o of OFFERINGS) {
    const base: SessionInput = {
      titleNl: o.titleNl,
      titleEn: o.titleEn,
      descriptionNl: o.descriptionNl,
      descriptionEn: o.descriptionEn,
      category: o.category,
      venue: o.isOnline ? "" : IN_PERSON_VENUE,
      address: "",
      isOnline: o.isOnline,
      onlineLink: "",
      date: appointmentUntil,
      startTime: APPOINTMENT_TIME,
      durationMin: o.durationMin,
      capacity: o.weekly ? o.capacity : 999,
      priceCents: o.priceCents,
      maxPerBooking: o.maxPerBooking,
      // Online offerings remain hidden until Linda adds the private meeting link.
      status: o.isOnline ? "draft" : "published",
      imageData: "",
      removeImage: false,
      imageKey: o.photo,
      offering: o.key,
      bookingMode: o.weekly ? "scheduled" : "appointment",
      availability: EMPTY_AVAILABILITY,
    };

    const dates = o.weekly
      ? Array.from({ length: weeks }, (_, i) => addDays(nextWeekdayDate(o.weekly!.weekday, o.weekly!.time), i * 7))
      : [appointmentUntil];

    for (const date of dates) {
      const matches = rows.filter((row) => {
        if (!relatedToOffering(row, o)) return false;
        if (o.weekly) return row.date === date;
        return row.date >= today && Date.parse(row.starts_at) > Date.now();
      });

      if (matches.length > 0) {
        const expectedTime = o.weekly?.time ?? "By appointment";
        const expectedMode = o.weekly ? "scheduled" : "appointment";
        const mismatches = new Set<string>();
        if (matches.length > 1) mismatches.add("Multiple matching records already exist.");
        for (const row of matches) {
          if (row.start_time !== (o.weekly?.time ?? APPOINTMENT_TIME)) mismatches.add("Time does not match Linda's requested schedule.");
          if (row.booking_mode !== expectedMode) mismatches.add("Booking mode differs from the regular offering.");
          if (Boolean(row.is_online) !== o.isOnline) mismatches.add("Online / in-person setting differs.");
          if (row.duration_min !== o.durationMin) mismatches.add("Duration differs from Linda's requested offer.");
          if (row.price_cents !== o.priceCents) mismatches.add("Price differs from Linda's requested offer.");
          if (row.status !== "published") mismatches.add("Existing record is not published (draft or cancelled).");
          if (row.offering && row.offering !== o.key) mismatches.add("Existing record is linked to a different membership offering.");
        }

        if (mismatches.size > 0) {
          conflicts.push({
            offering: o.key,
            title: o.titleEn,
            existingTitle: matches.map((x) => x.title_nl).join(" / "),
            date: matches.map((x) => x.date).join(" / "),
            existingTime: matches.map((x) => x.start_time).join(" / "),
            expectedTime,
            reason: [...mismatches].join(" "),
          });
        } else {
          skipped.push({ offering: o.key, title: o.titleEn, date, reason: "A matching published session already exists." });
        }
        continue;
      }

      candidates.push({
        offering: o.key,
        title: o.titleEn,
        date,
        startTime: o.weekly?.time ?? APPOINTMENT_TIME,
        bookingMode: o.weekly ? "scheduled" : "appointment",
        section: sectionOf({ category: o.category, isOnline: o.isOnline }),
        isOnline: o.isOnline,
        status: base.status,
        durationMin: o.durationMin,
        priceCents: o.priceCents,
      });

      if (!previewOnly) {
        const payload: SessionInput = { ...base, date, startTime: o.weekly?.time ?? APPOINTMENT_TIME };
        const [id] = await createSessions(payload, 0);
        created.push({ id, offering: o.key, title: o.titleEn, date, startTime: payload.startTime, status: payload.status });

      }
    }
  }

  return {
    weeks,
    previewOnly,
    plannedCount: candidates.length,
    createdCount: created.length,
    skippedCount: skipped.length,
    conflictCount: conflicts.length,
    candidates,
    created,
    skipped,
    conflicts,
  };
}

/* ---------------- reset to Linda's standard schedule ---------------- */


/** First date on/after today (Belgian time) that falls on `weekday` and whose start time is still ahead. */
function nextWeekdayDate(weekday: number, time: string): string {
  let d = todayBE();
  for (let i = 0; i < 8; i++) {
    const [y, m, dd] = d.split("-").map(Number);
    const wd = new Date(Date.UTC(y, m - 1, dd)).getUTCDay();
    if (wd === weekday && zonedToUtc(d, time).getTime() > Date.now()) return d;
    d = addDays(d, 1);
  }
  return d;
}

export const APPOINTMENT_TIME = "23:59";
const IN_PERSON_VENUE = "Diamond Yoga · Deurne (Antwerpen)";

type BusyInterval = { startsAt: number; endsAt: number };

function intervalsOverlap(a: BusyInterval, b: BusyInterval): boolean {
  return a.startsAt < b.endsAt && a.endsAt > b.startsAt;
}

/** Returns only configured weekly slots that are free across Linda's whole calendar. */
export async function getAvailableAppointmentSlots(sessionId: string, dateValue: string): Promise<AvailableAppointmentSlot[]> {
  const s = await getSessionRow(sessionId);
  const rule = s ? parseAvailability(s.availability_rule) : null;
  if (!s || s.status !== "published" || s.booking_mode !== "appointment" || !rule) {
    throw new HttpError(409, "availability_not_configured");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue) || dateValue < todayBE() || !isRecurringDate(dateValue, s.date, rule)) {
    return [];
  }

  const now = Date.now();
  const candidates = rule.slotTimes.map((timeValue) => {
    const start = zonedToUtc(dateValue, timeValue).getTime();
    const end = start + s.duration_min * 60_000;
    return {
      time: timeValue,
      startsAt: new Date(start).toISOString(),
      endsAt: new Date(end).toISOString(),
      busy: { startsAt: start, endsAt: end + rule.bufferMinutes * 60_000 },
    };
  }).filter((slot) => slot.busy.startsAt > now);

  if (candidates.length === 0) return [];

  const minStart = Math.min(...candidates.map((x) => x.busy.startsAt)) - 86_400_000;
  const maxEnd = Math.max(...candidates.map((x) => x.busy.endsAt)) + 86_400_000;
  const minIso = new Date(minStart).toISOString();
  const maxIso = new Date(maxEnd).toISOString();

  const [bookings, fixedSessions, otherRecurring] = await Promise.all([
    all<{ appointment_start_at: string; appointment_end_at: string }>(
      "SELECT appointment_start_at, appointment_end_at FROM bookings " +
      "WHERE appointment_start_at IS NOT NULL AND appointment_end_at IS NOT NULL " +
      "AND (status = 'confirmed' OR (status = 'pending' AND hold_until > ?))",
      [nowIso()],
    ),
    all<{ starts_at: string; duration_min: number }>(
      "SELECT starts_at, duration_min FROM sessions " +
      "WHERE id <> ? AND status = 'published' AND booking_mode = 'scheduled' " +
      "AND starts_at < ? AND datetime(starts_at, '+' || duration_min || ' minutes') > ?",
      [sessionId, maxIso, minIso],
    ),
    all<{
      id: string;
      date: string;
      duration_min: number;
      availability_rule: string;
    }>(
      "SELECT id, date, duration_min, availability_rule FROM sessions " +
      "WHERE id <> ? AND status = 'published' AND booking_mode = 'appointment' AND availability_rule <> ''",
      [sessionId],
    ),
  ]);

  const bookingIntervals: BusyInterval[] = bookings.map((b) => ({
    startsAt: Date.parse(b.appointment_start_at),
    endsAt: Date.parse(b.appointment_end_at),
  }));
  const fixedIntervals: BusyInterval[] = fixedSessions.map((x) => {
    const start = Date.parse(x.starts_at);
    return { startsAt: start, endsAt: start + x.duration_min * 60_000 };
  });
  const recurringIntervals: BusyInterval[] = [];
  for (const other of otherRecurring) {
    const otherRule = parseAvailability(other.availability_rule);
    if (!otherRule || !isRecurringDate(dateValue, other.date, otherRule)) continue;
    for (const timeValue of otherRule.slotTimes) {
      const start = zonedToUtc(dateValue, timeValue).getTime();
      recurringIntervals.push({
        startsAt: start,
        endsAt: start + other.duration_min * 60_000 + otherRule.bufferMinutes * 60_000,
      });
    }
  }

  return candidates
    .filter((slot) => {
      const busy = slot.busy;
      if (bookingIntervals.some((x) => intervalsOverlap(busy, x))) return false;
      if (fixedIntervals.some((x) => intervalsOverlap(busy, x))) return false;
      if (recurringIntervals.some((x) => intervalsOverlap(busy, x))) return false;
      return true;
    })
    .map(({ time: timeValue, startsAt, endsAt }) => ({ time: timeValue, startsAt, endsAt }));
}

/** Re-checks a customer-selected slot immediately before checkout and returns canonical UTC times. */
export async function validateAppointmentSlot(sessionId: string, dateValue: string, timeValue: string) {
  const available = await getAvailableAppointmentSlots(sessionId, dateValue);
  const slot = available.find((x) => x.time === timeValue);
  if (!slot) throw new HttpError(409, "slot_unavailable", "That time is no longer available. Please choose another slot.");
  const s = await getSessionRow(sessionId);
  const rule = s ? parseAvailability(s.availability_rule) : null;
  const bufferMinutes = rule?.bufferMinutes ?? 0;
  return {
    startsAt: slot.startsAt,
    endsAt: new Date(Date.parse(slot.endsAt) + bufferMinutes * 60_000).toISOString(),
  };
}


/**
 * Deletes every session that has no live booking (confirmed, or pending inside its payment window)
 * and creates Linda's standard offer: weekly classes for `weeks` weeks, and the massages /
 * healings as "by appointment" sessions that can be booked for a year.
 * Sessions with live bookings are kept and reported, so nobody loses a paid place.
 */
export async function resetToStandard(weeks: number) {
  const now = nowIso();
  const rows = await all<{ id: string; title_nl: string; starts_at: string; offering: string; date: string; booking_mode: string; live: number }>(
    `SELECT s.id, s.title_nl, s.starts_at, s.offering, s.date, s.booking_mode,
       (SELECT COUNT(*) FROM bookings b WHERE b.session_id = s.id
          AND (b.status = 'confirmed' OR (b.status = 'pending' AND b.hold_until > ?))) AS live
     FROM sessions s`,
    [now],
  );
  const kept = rows.filter((r) => r.live > 0);
  const remove = rows.filter((r) => r.live === 0);
  for (const r of remove) {
    await run(`DELETE FROM bookings WHERE session_id = ?`, [r.id]);
    await run(`DELETE FROM sessions WHERE id = ?`, [r.id]);
  }

  // Never create a second copy of a kept session (same offering, same date / same appointment offer).
  const keptKeys = new Set(kept.map((k) => (k.booking_mode === "appointment" ? `${k.offering}|appt` : `${k.offering}|${k.date}`)));
  let created = 0;
  const until = addDays(todayBE(), 365);
  for (const o of OFFERINGS) {
    const base: SessionInput = {
      titleNl: o.titleNl,
      titleEn: o.titleEn,
      descriptionNl: o.descriptionNl,
      descriptionEn: o.descriptionEn,
      category: o.category,
      venue: o.isOnline ? "" : IN_PERSON_VENUE,
      address: "",
      isOnline: o.isOnline,
      onlineLink: "",
      date: until,
      startTime: APPOINTMENT_TIME,
      durationMin: o.durationMin,
      capacity: o.capacity,
      priceCents: o.priceCents,
      maxPerBooking: o.maxPerBooking,
      status: "published",
      imageData: "",
      removeImage: false,
      imageKey: o.photo,
      offering: o.key,
      bookingMode: "appointment",
      availability: EMPTY_AVAILABILITY,
    };
    if (o.weekly) {
      const first = nextWeekdayDate(o.weekly.weekday, o.weekly.time);
      for (let w = 0; w < weeks; w++) {
        const date = addDays(first, w * 7);
        if (keptKeys.has(`${o.key}|${date}`)) continue;
        created += (await createSessions({ ...base, date, startTime: o.weekly.time, bookingMode: "scheduled" }, 0)).length;
      }
    } else if (!keptKeys.has(`${o.key}|appt`)) {
      // By appointment: many requests possible, one person per booking.
      created += (await createSessions({ ...base, capacity: 999, maxPerBooking: 1 }, 0)).length;
    }
  }
  return {
    deleted: remove.length,
    created,
    kept: kept.map((k) => ({ id: k.id, title: k.title_nl, startsAt: k.starts_at, bookings: k.live })),
  };
}
