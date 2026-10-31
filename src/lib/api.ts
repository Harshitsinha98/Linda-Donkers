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

/**
 * The agenda groups sessions into two main offers: yoga and massage/healing.
 * Online is not a group of its own: it's a property (`isOnline`) of a yoga or healing session.
 * Legacy sessions saved with the old "online" category are shown under yoga.
 */
export type CategoryGroup = "yoga" | "massage" | "retreat" | "other";
const GROUP_OF: Record<string, CategoryGroup> = {
  yoga: "yoga",
  gong: "yoga",
  workshop: "yoga",
  online: "yoga",
  massage: "massage",
  healing: "massage",
  retreat: "retreat",
};
export const categoryGroup = (category: string): CategoryGroup => GROUP_OF[category] ?? "other";

/** Title keywords -> the most fitting of Linda's own photos. */
const TITLE_IMAGE: [RegExp, string][] = [
  [/lomi/i, IMG.lomi1],
  [/m\.?e\.?r\b|myo|fascia/i, IMG.lomi3],
  [/chi nei|tao|buik|belly|orgaan|organ/i, IMG.lomi2],
  [/sat ?nam|rasayan/i, IMG.selflove],
  [/priv|coach/i, IMG.smile],
];

/** Default photo for a session without an upload: matched on the title first, then the category. */
export function fallbackImage(s: { category: string; title?: { nl: string; en: string }; isOnline?: boolean }): string {
  const text = s.title ? `${s.title.nl} ${s.title.en}` : "";
  for (const [re, img] of TITLE_IMAGE) if (re.test(text)) return img;
  if (s.isOnline && categoryGroup(s.category) === "yoga") return IMG.arms;
  return categoryImage(s.category);
}

type ImgInput = { category: string; imageUrl?: string; title?: { nl: string; en: string }; isOnline?: boolean };

/** The photo to show for a session: Linda's uploaded image if there is one, else a fitting default. */
export function sessionImage(s: ImgInput): string {
  return s.imageUrl || fallbackImage(s);
}

/**
 * src + srcSet for a session cover image. Uploaded images are a single file (no -sm
 * variant); the bundled fallbacks have a small variant for lazy lists.
 */
export function sessionImageSrc(s: ImgInput): { src: string; srcSet?: string } {
  if (s.imageUrl) return { src: s.imageUrl };
  const full = fallbackImage(s);
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
