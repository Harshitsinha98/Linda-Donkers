import { api, ApiError } from "../lib/api";
import type { MembershipPlan, MembershipView, PublicSession } from "../lib/api";

const KEY = "ld-admin-passcode";
export const getPass = () => sessionStorage.getItem(KEY) ?? "";
export const setPass = (p: string) => (p ? sessionStorage.setItem(KEY, p) : sessionStorage.removeItem(KEY));

export async function adminApi<T = Record<string, unknown>>(path: string, init: RequestInit = {}) {
  try {
    return await api<T>(path, { ...init, headers: { "x-admin-passcode": getPass(), ...(init.headers as Record<string, string>) } });
  } catch (err) {
    // Passcode changed or expired while logged in: back to the login screen.
    if (err instanceof ApiError && err.status === 401 && getPass() && !path.includes("scope=upcoming&login")) {
      setPass("");
      window.location.reload();
    }
    throw err;
  }
}

export async function downloadCsv(sessionId?: string) {
  const res = await fetch(`/api/admin/bookings?format=csv${sessionId ? `&sessionId=${sessionId}` : ""}`, {
    headers: { "x-admin-passcode": getPass() },
  });
  if (!res.ok) throw new Error("Export failed");
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = `bookings${sessionId ? "-" + sessionId : ""}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export type AdminSession = PublicSession & {
  onlineLink: string;
  confirmedSeats: number;
  pendingSeats: number;
  bookingsCount: number;
  revenueCents: number;
  createdAt: string;
};

export type AdminBooking = {
  id: string;
  ref: string;
  sessionId: string;
  sessionTitle: string;
  sessionStartsAt: string;
  name: string;
  email: string;
  phone: string;
  note: string;
  seats: number;
  amountCents: number;
  refundedCents: number;
  status: "pending" | "confirmed" | "cancelled" | "expired";
  source: "web" | "manual";
  createdAt: string;
  cancelledBy: string | null;
  holdUntil: string | null;
  paidOnline: boolean;
  couponCode: string;
  discountCents: number;
  giftCents: number;
  giftRefundedCents: number;
  membershipId: string | null;
  preferred: string;
  sessionDurationMin?: number;
  sessionIsOnline?: boolean;
  sessionBookingMode?: "scheduled" | "appointment";
};

export type Hours = { startDate: string; weekdays: number[]; intervalWeeks: number; slotTimes: string[]; bufferMinutes: number };

export const todayBE = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date());

/** UTC instant of 00:00 Belgian time on a YYYY-MM-DD day (handles summer/winter time). */
export function brusselsMidnight(day: string): Date {
  const guess = new Date(`${day}T00:00:00Z`);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Brussels", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(guess)
      .map((x) => [x.type, x.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return new Date(guess.getTime() - (asUtc - guess.getTime()));
}

export const WEEKDAYS: [number, string, string][] = [
  [1, "Mon", "Monday"], [2, "Tue", "Tuesday"], [3, "Wed", "Wednesday"], [4, "Thu", "Thursday"], [5, "Fri", "Friday"], [6, "Sat", "Saturday"], [0, "Sun", "Sunday"],
];

/** "Tue, Thu, Sat · 10:00, 14:00" */
export function hoursSummary(h: Pick<Hours, "weekdays" | "slotTimes" | "intervalWeeks">) {
  const days = WEEKDAYS.filter(([d]) => h.weekdays.includes(d)).map(([, s]) => s).join(", ");
  return `${days} · ${[...h.slotTimes].sort().join(", ")}${h.intervalWeeks > 1 ? ` · every ${h.intervalWeeks} weeks` : ""}`;
}

const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

/** Same checks as the server, in plain words. "" when the hours are fine. */
export function hoursProblem(h: Hours, durationMin: number, lastDate?: string): string {
  if (!h.startDate) return "Choose from which day these hours apply.";
  if (lastDate && h.startDate > lastDate) return "The start day must be on or before the last bookable date.";
  if (h.weekdays.length === 0) return "Choose at least one day of the week.";
  if (h.slotTimes.length === 0) return "Add at least one start time.";
  if (h.slotTimes.some((x) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(x))) return "Use times like 09:00 or 14:30.";
  const sorted = [...h.slotTimes].sort();
  if (sorted.some((x) => mins(x) + durationMin + h.bufferMinutes > 24 * 60)) return "A session must end before midnight.";
  for (let i = 1; i < sorted.length; i++) {
    if (mins(sorted[i]) - mins(sorted[i - 1]) < durationMin + h.bufferMinutes) {
      return `${sorted[i - 1]} and ${sorted[i]} are too close: a ${durationMin}-minute session plus ${h.bufferMinutes} minutes break needs ${durationMin + h.bufferMinutes} minutes.`;
    }
  }
  return "";
}

/** Start times from `from` until the last session ends by `until`, spaced by duration + break. */
export function fillDay(from: string, until: string, durationMin: number, bufferMinutes: number): string[] {
  const out: string[] = [];
  const step = durationMin + bufferMinutes;
  if (!(step > 0)) return out;
  for (let t = mins(from); t + durationMin <= mins(until) && out.length < 24; t += step) {
    out.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
  }
  return out;
}

export type AdminCoupon = {
  id: string;
  code: string;
  description: string;
  kind: "percent" | "fixed";
  value: number;
  appliesTo: "all" | "sessions" | "yoga" | "massage" | "online" | "memberships";
  minAmountCents: number;
  maxUses: number;
  maxUsesPerEmail: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  active: boolean;
  discountGivenCents: number;
  createdAt: string;
};

export type AdminPlan = MembershipPlan & { sold: number; revenueCents: number };
export type AdminMembership = MembershipView;

export const CATEGORY_LABELS: Record<string, string> = {
  yoga: "Kundalini Yoga",
  gong: "Gong meditation",
  workshop: "Workshop",
  massage: "Massage",
  healing: "Healing (Sat Nam Rasayan)",
  online: "Online (old type: please pick Yoga or Healing and tick 'online')",
  retreat: "Retreat / travel",
  other: "Other",
};

export const euro = (cents: number) => new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(cents / 100);

export const when = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Brussels",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

/** Same rule as the server: 48h+ = 100%, 24–48h = 50%, under 24h = 0%. */
export function policyPercent(startsAt: string) {
  const h = (Date.parse(startsAt) - Date.now()) / 3_600_000;
  return h >= 48 ? 100 : h >= 24 ? 50 : 0;
}

export const dateOnly = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Brussels", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

/** Euro text ("25", "25,50", "25.5") -> cents, or NaN. */
export const toCents = (v: string) => {
  const n = Number(v.trim().replace(",", "."));
  return v.trim() === "" || !Number.isFinite(n) || n < 0 ? NaN : Math.round(n * 100);
};

export const centsToText = (c: number) => (c / 100).toFixed(2).replace(/\.00$/, "");

export const NO_HOURS = { enabled: false, startDate: "", weekdays: [] as number[], intervalWeeks: 1, slotTimes: [] as string[], bufferMinutes: 0 };

/** Full PATCH/create body for a session, from what the admin list already has, with changes on top. */
export function sessionPayload(s: AdminSession, changes: Record<string, unknown> = {}) {
  return {
    titleNl: s.title.nl,
    titleEn: s.title.en === s.title.nl ? "" : s.title.en,
    descriptionNl: s.description.nl,
    descriptionEn: s.description.en === s.description.nl ? "" : s.description.en,
    category: s.category,
    venue: s.venue,
    address: s.address,
    isOnline: s.isOnline,
    onlineLink: s.onlineLink,
    date: s.date,
    startTime: s.startTime,
    durationMin: s.durationMin,
    capacity: s.capacity,
    priceCents: s.priceCents,
    maxPerBooking: s.maxPerBooking,
    status: s.status === "draft" ? "draft" : "published",
    imageData: "",
    removeImage: false,
    imageKey: s.imageKey,
    offering: s.offering,
    bookingMode: s.bookingMode,
    availability: s.availability?.enabled ? s.availability : NO_HOURS,
    ...changes,
  };
}

/** Days of the next weeks on which these hours apply (for the preview under the hours editor). */
export function upcomingDays(h: Hours, count: number, lastDate?: string): string[] {
  const out: string[] = [];
  const start = h.startDate > todayBE() ? h.startDate : todayBE();
  const monday = (d: string) => {
    const x = new Date(`${d}T12:00:00Z`);
    x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
    return x.getTime();
  };
  const base = monday(h.startDate || start);
  for (let i = 0; i < 400 && out.length < count; i++) {
    const d = new Date(`${start}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    const day = d.toISOString().slice(0, 10);
    if (lastDate && day > lastDate) break;
    const weeks = Math.round((monday(day) - base) / (7 * 86_400_000));
    if (h.weekdays.includes(d.getUTCDay()) && weeks % Math.max(1, h.intervalWeeks) === 0) out.push(day);
  }
  return out;
}

export const dayLabel = (day: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(`${day}T12:00:00Z`));
