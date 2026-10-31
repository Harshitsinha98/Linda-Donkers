/**
 * Shared by the website (src/) and the API (server/): Linda's offer types, her photos
 * (with a focal point so cropped cards show a face, not a torso) and the agenda sections.
 */

/* ---------------- offers ---------------- */

/**
 * An "offer" is the kind of session a customer books. Memberships and coupons are
 * limited to offers, e.g. the 10-class card only covers "yoga-group".
 */
export const OFFER_KEYS = [
  "yoga-group",
  "yoga-online",
  "yoga-private",
  "coaching-online",
  "mer",
  "lomi",
  "chinei",
  "satnam",
] as const;
export type OfferKey = (typeof OFFER_KEYS)[number];

export const OFFERS: Record<OfferKey, { nl: string; en: string; section: "yoga" | "massage" }> = {
  "yoga-group": { nl: "Kundalini Yoga groepsles", en: "Kundalini Yoga group class", section: "yoga" },
  "yoga-online": { nl: "Online groepsles (Engels)", en: "Online group class (English)", section: "yoga" },
  "yoga-private": { nl: "Privésessie met coaching", en: "Private session with coaching", section: "yoga" },
  "coaching-online": { nl: "Online coaching één-op-één", en: "Online one-to-one coaching", section: "yoga" },
  mer: { nl: "M.E.R. Myo Fascia Energetic Release", en: "M.E.R. Myo Fascia Energetic Release", section: "massage" },
  lomi: { nl: "Lomi Lomi Nui massage", en: "Lomi Lomi Nui massage", section: "massage" },
  chinei: { nl: "Taoïstische buik- & orgaanmassage", en: "Taoïstic belly & organ massage", section: "massage" },
  satnam: { nl: "Sat Nam Rasayan healing", en: "Sat Nam Rasayan healing", section: "massage" },
};

export const isOfferKey = (v: string): v is OfferKey => (OFFER_KEYS as readonly string[]).includes(v);

/** Parses a stored JSON list of offer keys, ignoring anything unknown. */
export function parseOffers(json: string | null | undefined): OfferKey[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v.filter((x): x is OfferKey => typeof x === "string" && isOfferKey(x)) : [];
  } catch {
    return [];
  }
}

/* ---------------- agenda sections ---------------- */

/** The agenda has three sections. Online sessions always go to "online", whatever their type. */
export type Section = "yoga" | "massage" | "online";
export const SECTIONS: readonly Section[] = ["yoga", "massage", "online"];

export function sectionOf(s: { category: string; isOnline: boolean }): Section {
  if (s.isOnline || s.category === "online") return "online";
  return s.category === "massage" || s.category === "healing" ? "massage" : "yoga";
}

/* ---------------- photos ---------------- */

/**
 * Linda's own photos that a session can use as its cover. `focus` is the CSS
 * object-position that keeps her face (or the hands at work) inside a wide crop.
 */
export const COVERS = {
  twist: { src: "/images/kundalini-twist.webp", focus: "50% 16%", label: "Kundalini (twist)" },
  happy: { src: "/images/linda-happy.webp", focus: "45% 12%", label: "Linda laughing, gong" },
  smile: { src: "/images/linda-smile.webp", focus: "45% 6%", label: "Linda meditating, gong" },
  arms: { src: "/images/linda-arms.webp", focus: "50% 14%", label: "Arms open, gong" },
  selflove: { src: "/images/meditation-selflove.webp", focus: "50% 30%", label: "Self-love meditation" },
  portrait: { src: "/images/linda-portrait.webp", focus: "50% 30%", label: "Portrait" },
  heart: { src: "/images/india-heart.webp", focus: "50% 22%", label: "Hand on heart" },
  waterfall: { src: "/images/waterfall.webp", focus: "50% 45%", label: "Waterfall" },
  lomi1: { src: "/images/lomi-lomi-1.webp", focus: "50% 32%", label: "Lomi Lomi (back)" },
  lomi2: { src: "/images/lomi-lomi-2.webp", focus: "50% 24%", label: "Massage room" },
  lomi3: { src: "/images/lomi-lomi-3.webp", focus: "50% 30%", label: "Massage (forearm)" },
  goldenTemple: { src: "/images/india-golden-temple.webp", focus: "50% 30%", label: "Golden Temple" },
  indiaPortrait: { src: "/images/india-portrait.webp", focus: "50% 25%", label: "India portrait" },
  sari: { src: "/images/india-sari.webp", focus: "50% 25%", label: "Sari" },
  banyan: { src: "/images/india-banyan.webp", focus: "50% 40%", label: "Banyan tree" },
} as const;
export type CoverKey = keyof typeof COVERS;
export const COVER_KEYS = Object.keys(COVERS) as CoverKey[];
export const isCoverKey = (v: string): v is CoverKey => v in COVERS;

/** Default photo per offer, all different, so the agenda never shows the same picture twice in a row. */
export const OFFER_COVER: Record<OfferKey, CoverKey> = {
  "yoga-group": "twist",
  "yoga-online": "arms",
  "yoga-private": "smile",
  "coaching-online": "portrait",
  mer: "lomi3",
  lomi: "lomi1",
  chinei: "lomi2",
  satnam: "selflove",
};

const CATEGORY_COVER: Record<string, CoverKey> = {
  yoga: "twist",
  gong: "happy",
  workshop: "smile",
  online: "arms",
  massage: "lomi1",
  healing: "selflove",
  retreat: "goldenTemple",
};

/** Which bundled photo a session shows when Linda didn't upload one: chosen cover, then offer, then category. */
export function coverFor(s: { cover?: string; offer?: string; category: string }): (typeof COVERS)[CoverKey] {
  if (s.cover && isCoverKey(s.cover)) return COVERS[s.cover];
  if (s.offer && isOfferKey(s.offer)) return COVERS[OFFER_COVER[s.offer]];
  return COVERS[CATEGORY_COVER[s.category] ?? "portrait"];
}
