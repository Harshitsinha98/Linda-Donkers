/**
 * Ready-made session templates for Linda's regular offer, built from shared/catalog.ts.
 * Choosing one in "New session" fills in the form; Linda only has to check the date
 * (weekly classes) or the "bookable until" date (sessions by appointment).
 */
import { OFFERINGS, type PhotoKey } from "../../shared/catalog";

export type SessionTemplate = {
  id: string;
  group: string;
  label: string;
  weekday?: number;
  fields: {
    titleNl: string;
    titleEn: string;
    descriptionNl: string;
    descriptionEn: string;
    category: "yoga" | "massage" | "healing";
    isOnline: boolean;
    startTime?: string;
    durationMin: string;
    price: string;
    capacity: string;
    maxPerBooking: string;
    offering: string;
    imageKey: PhotoKey;
    bookingMode: "scheduled" | "appointment";
  };
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const SECTION_LABEL = { yoga: "Yoga", massage: "Massage & healing", online: "Online" } as const;
const euro = (cents: number) => String(cents / 100);

export const TEMPLATES: SessionTemplate[] = OFFERINGS.map((o) => ({
  id: o.key,
  group: SECTION_LABEL[o.section],
  label: `${o.titleEn} · ${o.weekly ? `${DAYS[o.weekly.weekday]} ${o.weekly.time}` : "by appointment"} · ${o.durationMin} min · €${euro(o.priceCents)}`,
  weekday: o.weekly?.weekday,
  fields: {
    titleNl: o.titleNl,
    titleEn: o.titleEn,
    descriptionNl: o.descriptionNl,
    descriptionEn: o.descriptionEn,
    category: o.category,
    isOnline: o.isOnline,
    startTime: o.weekly?.time,
    durationMin: String(o.durationMin),
    price: euro(o.priceCents),
    capacity: String(o.weekly ? o.capacity : 999),
    maxPerBooking: String(o.maxPerBooking),
    offering: o.key,
    imageKey: o.photo,
    bookingMode: o.weekly ? "scheduled" : "appointment",
  },
}));

/** Labels for the offering field (which regular session this is; memberships use it). */
export const OFFERING_LABELS: Record<string, string> = Object.fromEntries(OFFERINGS.map((o) => [o.key, `${o.titleEn}${o.weekly ? ` (${DAYS[o.weekly.weekday]})` : ""}`]));

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

/** Date one year from today (YYYY-MM-DD), the default "bookable until" for sessions by appointment. */
export function inOneYear(from = new Date()): string {
  const d = new Date(from.getFullYear() + 1, from.getMonth(), from.getDate());
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
