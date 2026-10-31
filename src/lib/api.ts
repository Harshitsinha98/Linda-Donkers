import { useEffect, useState } from "react";
import type { Lang } from "../i18n/content";
import { sm } from "../data/site";
import { coverFor, type Section } from "../../shared/catalog";

export type PublicSession = {
  id: string;
  title: { nl: string; en: string };
  description: { nl: string; en: string };
  category: string;
  venue: string;
  address: string;
  isOnline: boolean;
  date: string;
  startTime: string;
  startsAt: string;
  durationMin: number;
  priceCents: number;
  capacity: number;
  spotsLeft: number;
  maxPerBooking: number;
  hasImage: boolean;
  imageUrl: string;
  offer: string;
  cover: string;
  section: Section;
  status: "draft" | "published" | "cancelled";
};

export type BookingView = {
  ref: string;
  status: "pending" | "confirmed" | "cancelled" | "expired";
  name: string;
  email: string;
  seats: number;
  amountCents: number;
  refundedCents: number;
  lang: Lang;
  session: PublicSession;
  onlineLink: string;
  discountCents: number;
  creditsUsed: number;
  cancel: { allowed: boolean; percent: number; cents: number; creditsBack: number; paidWithPass: boolean };
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export async function api<T = Record<string, unknown>>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers as Record<string, string>) },
  });
  let data: Record<string, unknown> = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok || data.ok === false) {
    throw new ApiError(res.status, String(data.error ?? "server_error"), data.message as string | undefined);
  }
  return data as T;
}

/* ---------------- formatting (always Belgian time) ---------------- */

export const TZ = "Europe/Brussels";
const loc = (lang: Lang) => (lang === "en" ? "en-GB" : "nl-BE");

export function fmtParts(iso: string, lang: Lang) {
  const d = new Date(iso);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(loc(lang), { timeZone: TZ, ...o }).format(d);
  return {
    weekday: f({ weekday: "short" }).replace(".", ""),
    day: f({ day: "numeric" }),
    month: f({ month: "short" }).replace(".", ""),
    time: f({ hour: "2-digit", minute: "2-digit" }),
  };
}

export const fmtLong = (iso: string, lang: Lang) =>
  `${new Intl.DateTimeFormat(loc(lang), { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso))} · ${fmtParts(iso, lang).time}`;

export const fmtEuro = (cents: number, lang: Lang) =>
  new Intl.NumberFormat(lang === "en" ? "en-IE" : "nl-BE", { style: "currency", currency: "EUR" }).format(cents / 100);

/**
 * The photo for a session: Linda's upload if there is one, else the bundled photo she picked
 * (or the default for its offer). `focus` keeps her face in view when the photo is cropped wide.
 */
export function sessionImageSrc(s: { category: string; imageUrl?: string; cover?: string; offer?: string }): {
  src: string;
  srcSet?: string;
  small: string;
  focus: string;
} {
  if (s.imageUrl) return { src: s.imageUrl, small: s.imageUrl, focus: "50% 30%" };
  const c = coverFor(s);
  return { src: c.src, srcSet: `${sm(c.src)} 720w, ${c.src} 1600w`, small: sm(c.src), focus: c.focus };
}

/* ---------------- hooks ---------------- */

export function useSessions(limit = 100) {
  const [sessions, setSessions] = useState<PublicSession[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    api<{ sessions: PublicSession[] }>(`/api/sessions?limit=${limit}`)
      .then((d) => alive && setSessions(d.sessions))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [limit]);
  return { sessions, error };
}
