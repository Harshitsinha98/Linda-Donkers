/** All sessions take place on Belgian time, whatever the visitor's or Linda's device says. */
export const TZ = "Europe/Brussels";

/** Offset (ms) between UTC and wall-clock time in `tz` at the given instant. */
function offsetMs(utcMs: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - utcMs;
}

/** "2026-10-18" + "19:30" in Brussels -> UTC Date (handles summer/winter time). */
export function zonedToUtc(date: string, time: string, tz = TZ): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const first = offsetMs(guess, tz);
  let utc = guess - first;
  const second = offsetMs(utc, tz);
  if (second !== first) utc = guess - second;
  return new Date(utc);
}

/** Adds whole days to a YYYY-MM-DD date string. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function formatWhen(iso: string, lang: string): string {
  const locale = lang === "en" ? "en-GB" : "nl-BE";
  const date = new Intl.DateTimeFormat(locale, {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
  const time = new Intl.DateTimeFormat(locale, { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  return `${date} · ${time}`;
}

export function formatEuro(cents: number, lang: string): string {
  return new Intl.NumberFormat(lang === "en" ? "en-IE" : "nl-BE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export const nowIso = () => new Date().toISOString();
