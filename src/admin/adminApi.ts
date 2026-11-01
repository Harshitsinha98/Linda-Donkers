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
};

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
