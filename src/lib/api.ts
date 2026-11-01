import { useEffect, useState } from "react";
import type { Lang } from "../i18n/content";
import { IMG, ROUTES, sm } from "../data/site";

const ROUTES_MEMBERSHIPS = ROUTES.memberships;
import { OFFERINGS, PHOTO_FOCUS, type PhotoKey, type Section } from "../../shared/catalog";

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
  imageKey: string;
  offering: string;
  bookingMode: "scheduled" | "appointment";
  availability: {
    enabled: boolean;
    startDate: string;
    weekdays: number[];
    intervalWeeks: number;
    slotTimes: string[];
    bufferMinutes: number;
  } | null;
  section: Section | "other";
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
  couponCode: string;
  discountCents: number;
  paidWithMembership: boolean;
  preferred: string;
  appointmentStartAt?: string | null;
};

export type MembershipPlan = {
  id: string;
  name: { nl: string; en: string };
  description: { nl: string; en: string };
  priceCents: number;
  credits: number;
  validityDays: number;
  scope: string[];
  photo: string;
  status: string;
};

export type MembershipView = {
  id: string;
  ref: string;
  planId: string;
  name: { nl: string; en: string };
  photo: string;
  holder: string;
  email: string;
  phone: string;
  creditsTotal: number;
  creditsUsed: number;
  creditsLeft: number | null;
  scope: string[];
  amountCents: number;
  couponCode: string;
  discountCents: number;
  source: "web" | "manual";
  status: "pending" | "active" | "expired" | "cancelled";
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  paidOnline: boolean;
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

export const fmtDate = (iso: string, lang: Lang) =>
  new Intl.DateTimeFormat(loc(lang), { timeZone: TZ, day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

export const fmtEuro = (cents: number, lang: Lang) =>
  new Intl.NumberFormat(lang === "en" ? "en-IE" : "nl-BE", { style: "currency", currency: "EUR" }).format(cents / 100);

const CATEGORY_IMAGE: Record<string, PhotoKey> = {
  yoga: "twist",
  gong: "arms",
  workshop: "smile",
  massage: "lomi1",
  healing: "selflove",
  online: "selflove",
  retreat: "goldenTemple",
};

/** Default photo per offering (Linda's regular sessions), so each one has its own picture. */
const OFFERING_PHOTO: Record<string, PhotoKey> = Object.fromEntries(OFFERINGS.map((o) => [o.key, o.photo]));

/** Title keywords -> the most fitting of Linda's own photos (sessions created before offerings existed). */
const TITLE_IMAGE: [RegExp, PhotoKey][] = [
  [/lomi/i, "lomi1"],
  [/m\.?e\.?r\b|myo|fascia/i, "lomi3"],
  [/chi nei|tao|buik|belly|orgaan|organ/i, "lomi2"],
  [/sat ?nam|rasayan/i, "selflove"],
  [/priv|coach/i, "smile"],
];

export const photoSrc = (key: string) => IMG[(key in IMG ? key : "portrait") as keyof typeof IMG];
export const photoFocus = (key: string) => PHOTO_FOCUS[key as PhotoKey] ?? "50% 30%";

type ImgInput = { category: string; imageUrl?: string; imageKey?: string; offering?: string; title?: { nl: string; en: string }; isOnline?: boolean };

/** Which of Linda's photos to use for a session without an upload. */
export function fallbackPhoto(s: ImgInput): PhotoKey {
  if (s.imageKey && s.imageKey in PHOTO_FOCUS) return s.imageKey as PhotoKey;
  if (s.offering && OFFERING_PHOTO[s.offering]) return OFFERING_PHOTO[s.offering];
  const text = s.title ? `${s.title.nl} ${s.title.en}` : "";
  for (const [re, key] of TITLE_IMAGE) if (re.test(text)) return key;
  if (s.isOnline && s.category === "yoga") return "arms";
  return CATEGORY_IMAGE[s.category] ?? "portrait";
}

/**
 * src, srcSet and object-position for a session cover. Uploaded images are a single file
 * (centred); Linda's own photos have a small variant and a known focus point (her face).
 */
export function sessionImageSrc(s: ImgInput): { src: string; srcSet?: string; position: string } {
  if (s.imageUrl) return { src: s.imageUrl, position: "50% 35%" };
  const key = fallbackPhoto(s);
  const full = photoSrc(key);
  return { src: full, srcSet: `${sm(full)} 720w, ${full} 1600w`, position: photoFocus(key) };
}

export type { Section };

/**
 * The active class card on sale for a kind of session (scope key such as "yoga-group", "mer", "lomi").
 * Prefers a card with `credits` sessions when given, so a 10-class card wins over other yoga cards.
 */
export function planFor(plans: MembershipPlan[] | null, scopeKey: string, credits?: number): MembershipPlan | null {
  const matching = (plans ?? []).filter((p) => p.status === "active" && p.scope.includes(scopeKey));
  return matching.find((p) => p.credits === credits) ?? matching[0] ?? null;
}

/** Class card link: straight to the matching card when it exists, otherwise to the overview. */
export const planLink = (plan: MembershipPlan | null) => (plan ? `${ROUTES_MEMBERSHIPS}?plan=${encodeURIComponent(plan.id)}` : ROUTES_MEMBERSHIPS);

export function usePlans() {
  const [plans, setPlans] = useState<MembershipPlan[] | null>(null);
  useEffect(() => {
    let alive = true;
    api<{ plans: MembershipPlan[] }>("/api/memberships")
      .then((d) => alive && setPlans(d.plans))
      .catch(() => alive && setPlans([]));
    return () => {
      alive = false;
    };
  }, []);
  return plans;
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
