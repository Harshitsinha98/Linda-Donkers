/**
 * Admin "Reset agenda": wipes the agenda and recreates Linda's standard schedule.
 *
 * - Every session WITHOUT a live booking is deleted (with its expired/cancelled booking rows).
 * - Sessions that still have confirmed bookings (or someone paying right now) are KEPT and
 *   listed, so nobody loses a paid place. Linda can cancel those herself (with refunds).
 * - The weekly classes are created for the next `weeks` weeks.
 * - Massages and healings are by appointment: one hidden draft of each is created for Linda
 *   to date and publish.
 * - The starter membership plans are added if there are none yet.
 */
import { all, run } from "./db.js";
import { seedPlansIfEmpty } from "./memberships.js";
import { createSessions, type SessionInput } from "./sessions.js";
import { addDays, nowIso, TZ } from "./time.js";
import { STANDARD_SESSIONS, type StandardSession } from "../shared/schedule.js";

/** Today's date in Brussels, YYYY-MM-DD. */
const todayBrussels = () => new Date().toLocaleDateString("sv-SE", { timeZone: TZ });

/** Weekday (0-6) of a YYYY-MM-DD date. */
const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

/** First date on `weekday` whose `time` (Brussels) is still in the future. */
function firstDate(weekday: number, time: string): string {
  const today = todayBrussels();
  let d = addDays(today, (weekday - weekdayOf(today) + 7) % 7);
  const nowHm = new Date().toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
  if (d === today && time <= nowHm) d = addDays(d, 7);
  return d;
}

const toInput = (t: StandardSession, date: string, startTime: string, status: "published" | "draft"): SessionInput => ({
  titleNl: t.titleNl,
  titleEn: t.titleEn,
  descriptionNl: t.descriptionNl,
  descriptionEn: t.descriptionEn,
  category: t.category,
  venue: t.isOnline ? "" : "Deurne (Antwerpen)",
  address: "",
  isOnline: t.isOnline,
  onlineLink: "",
  date,
  startTime,
  durationMin: t.durationMin,
  capacity: t.capacity,
  priceCents: t.priceCents,
  maxPerBooking: t.maxPerBooking,
  status,
  offer: t.offer,
  cover: t.cover,
  imageData: "",
  removeImage: false,
});

export async function resetSchedule(weeks: number) {
  const now = nowIso();
  const kept = await all<{ id: string; title_nl: string; starts_at: string; n: number }>(
    `SELECT s.id, s.title_nl, s.starts_at,
       (SELECT COUNT(*) FROM bookings b WHERE b.session_id = s.id AND (b.status = 'confirmed' OR (b.status = 'pending' AND b.hold_until > ?))) AS n
     FROM sessions s`,
    [now],
  );
  const keep = kept.filter((s) => s.n > 0);
  const remove = kept.filter((s) => s.n === 0).map((s) => s.id);

  for (const id of remove) {
    await run(`DELETE FROM bookings WHERE session_id = ?`, [id]);
    await run(`DELETE FROM sessions WHERE id = ?`, [id]);
  }

  let created = 0;
  let drafts = 0;
  for (const t of STANDARD_SESSIONS) {
    if (t.weekday !== undefined && t.startTime) {
      const ids = await createSessions(toInput(t, firstDate(t.weekday, t.startTime), t.startTime, "published"), weeks - 1);
      created += ids.length;
    } else {
      // By appointment: a hidden draft one week from today at 10:00 for Linda to adjust.
      await createSessions(toInput(t, addDays(todayBrussels(), 7), "10:00", "draft"), 0);
      drafts++;
    }
  }
  const plans = await seedPlansIfEmpty();

  return {
    deleted: remove.length,
    kept: keep.map((s) => ({ id: s.id, title: s.title_nl, startsAt: s.starts_at, bookings: s.n })),
    created,
    drafts,
    plansAdded: plans,
  };
}
