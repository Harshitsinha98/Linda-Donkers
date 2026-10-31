/**
 * "Start from a template" in the New session form: Linda's standard offer
 * (see shared/schedule.ts). Choosing one fills in the form; she only checks the date.
 */
import { STANDARD_SESSIONS, type StandardSession } from "../../shared/schedule";

export type SessionTemplate = StandardSession;
export const TEMPLATES = STANDARD_SESSIONS;

/**
 * Next date (YYYY-MM-DD, local) that falls on `weekday`. Today counts, unless
 * `startTime` (HH:MM) has already passed today, then it's the same day next week.
 */
export function nextWeekday(weekday: number, startTime = "00:00", from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + ((weekday - d.getDay() + 7) % 7));
  const [h, m] = startTime.split(":").map(Number);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h || 0, m || 0);
  if (start.getTime() <= from.getTime()) d.setDate(d.getDate() + 7);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
