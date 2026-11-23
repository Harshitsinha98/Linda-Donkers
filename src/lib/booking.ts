/**
 * Booking page logic without React: which tab a session belongs to, how sessions are grouped
 * into treatments (one card per massage with a 60/90 min choice), and Belgian calendar dates.
 */
import { treatmentKey } from "../../shared/catalog";
import { ROUTES } from "../data/site";
import type { PublicSession } from "./api";

export type BookTab = "massage" | "healing" | "yoga" | "online" | "events";
export const BOOK_TABS: readonly BookTab[] = ["massage", "healing", "yoga", "online", "events"];

const EVENT_CATEGORIES = ["gong", "workshop", "retreat", "other"];

/** The tabs a session shows up in. Online healings are in both Healing and Online. */
export function tabsOf(s: PublicSession): BookTab[] {
  if (s.category === "healing") return s.isOnline ? ["healing", "online"] : ["healing"];
  if (EVENT_CATEGORIES.includes(s.category) && s.bookingMode === "scheduled") return ["events"];
  if (s.isOnline || s.category === "online") return ["online"];
  if (s.section === "massage" || s.category === "massage") return ["massage"];
  return ["yoga"];
}

/** Older links (?cat=healing, ?cat=yoga&online=1, …) and the new tab names. */
export function tabFromParam(cat: string, online: boolean): BookTab | "" {
  if (online || cat === "online") return "online";
  if ((BOOK_TABS as readonly string[]).includes(cat)) return cat as BookTab;
  if (cat === "gong" || cat === "workshop" || cat === "retreat" || cat === "other") return "events";
  return "";
}

/** One bookable choice inside a treatment: a duration (60/90 min), live/online, or a class series. */
export type Variant = {
  key: string;
  mode: "appointment" | "scheduled";
  durationMin: number;
  priceCents: number;
  isOnline: boolean;
  /** Appointment: exactly one session. Scheduled: every date of the class. */
  sessions: PublicSession[];
};

export type Treatment = {
  key: string;
  title: { nl: string; en: string };
  variants: Variant[];
};

const comparable = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Treatment key of a session: its offering family, or its title for sessions Linda made herself. */
export function treatmentOf(s: PublicSession): string {
  return s.offering ? treatmentKey(s.offering) : `title:${comparable(s.title.nl)}`;
}

/** Groups the sessions of one tab into treatments, in the order they first appear. */
export function groupTreatments(sessions: PublicSession[], tab: BookTab): Treatment[] {
  const map = new Map<string, Treatment>();
  for (const s of sessions) {
    if (s.status !== "published" || !tabsOf(s).includes(tab)) continue;
    // Fixed-date sessions that already started can't be booked any more.
    if (s.bookingMode === "scheduled" && Date.parse(s.startsAt) <= Date.now()) continue;
    const key = treatmentOf(s);
    let tr = map.get(key);
    if (!tr) {
      tr = { key, title: s.title, variants: [] };
      map.set(key, tr);
    }
    if (s.bookingMode === "appointment") {
      // One variant per duration + live/online. A duplicate of the same kind is ignored.
      const vk = `a:${s.durationMin}:${s.isOnline ? "o" : "l"}`;
      if (!tr.variants.some((v) => v.key === vk)) {
        tr.variants.push({ key: vk, mode: "appointment", durationMin: s.durationMin, priceCents: s.priceCents, isOnline: s.isOnline, sessions: [s] });
      }
    } else {
      const vk = `s:${s.durationMin}:${s.priceCents}:${s.isOnline ? "o" : "l"}`;
      const v = tr.variants.find((x) => x.key === vk);
      if (v) v.sessions.push(s);
      else tr.variants.push({ key: vk, mode: "scheduled", durationMin: s.durationMin, priceCents: s.priceCents, isOnline: s.isOnline, sessions: [s] });
    }
  }
  for (const tr of map.values()) {
    tr.variants.sort((a, b) => Number(a.isOnline) - Number(b.isOnline) || a.durationMin - b.durationMin);
    for (const v of tr.variants) v.sessions.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }
  return [...map.values()];
}

/** Lowest price of a treatment, for "from €…" labels. */
export const fromPrice = (tr: Treatment) => Math.min(...tr.variants.map((v) => v.priceCents));

/* ---------------- dates (always Belgian calendar days, YYYY-MM-DD) ---------------- */

export const todayBE = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayMon(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export const monthOf = (date: string) => date.slice(0, 7);
export const firstOfMonth = (month: string) => `${month}-01`;
export function lastOfMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}
export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
}

const loc = (lang: string) => (lang === "en" ? "en-GB" : "nl-BE");
const atNoon = (date: string) => new Date(`${date}T12:00:00Z`);

export const fmtDayLong = (date: string, lang: string) =>
  new Intl.DateTimeFormat(loc(lang), { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(atNoon(date));
export const fmtDayShort = (date: string, lang: string) =>
  new Intl.DateTimeFormat(loc(lang), { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(atNoon(date)).replace(/\./g, "");
export const fmtMonth = (month: string, lang: string) =>
  new Intl.DateTimeFormat(loc(lang), { timeZone: "UTC", month: "long", year: "numeric" }).format(atNoon(firstOfMonth(month)));

/* ---------------- links ---------------- */

/** Link to the booking page with a tab, treatment and duration (or one exact session) preselected. */
export function bookLink(o: { tab?: BookTab; treatment?: string; min?: number; online?: boolean; id?: string } = {}): string {
  const q = new URLSearchParams();
  if (o.id) q.set("id", o.id);
  if (o.tab) q.set("cat", o.tab);
  if (o.treatment) q.set("t", o.treatment);
  if (o.min) q.set("min", String(o.min));
  if (o.online !== undefined) q.set("mode", o.online ? "online" : "live");
  const qs = q.toString();
  return qs ? `${ROUTES.book}?${qs}` : ROUTES.book;
}
