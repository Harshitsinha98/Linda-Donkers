import { useEffect, useState } from "react";
import type { Lang } from "../i18n/content";
import { IMG, sm } from "../data/site";

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
  cancel: { allowed: boolean; percent: number; cents: number };
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

const CATEGORY_IMAGE: Record<string, string> = {
  yoga: IMG.twist,
  gong: IMG.arms,
  workshop: IMG.smile,
  massage: IMG.lomi1,
  healing: IMG.selflove,
  online: IMG.selflove,
  retreat: IMG.goldenTemple,
};

/** Fallback photo per category, used when a session has no uploaded image. */
export const categoryImage = (category: string) => CATEGORY_IMAGE[category] ?? IMG.portrait;

/** The photo to show for a session: Linda's uploaded image if there is one, else a category default. */
export function sessionImage(s: { category: string; imageUrl?: string }): string {
  return s.imageUrl || categoryImage(s.category);
}

/**
 * src + srcSet for a session cover image. Uploaded images are a single file (no -sm
 * variant); the bundled category fallbacks have a small variant for lazy lists.
 */
export function sessionImageSrc(s: { category: string; imageUrl?: string }): { src: string; srcSet?: string } {
  if (s.imageUrl) return { src: s.imageUrl };
  const full = categoryImage(s.category);
  return { src: full, srcSet: `${sm(full)} 720w, ${full} 1600w` };
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
