export const EMAIL = "info@lindadonkers.com";
export const WHATSAPP = "32498142845"; // international format, no "+"
export const PHONE_DISPLAY = "+32 498 14 28 45";
export const PHONE_TEL = `tel:+${WHATSAPP}`;
export const waLink = (text?: string) => `https://wa.me/${WHATSAPP}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export type SocialIcon = "instagram" | "youtube" | "facebook" | "linkedin" | "threads";

/** All of Linda's channels. `label` is the page name shown next to the icon. */
export const SOCIALS: { name: string; label: string; icon: SocialIcon; href: string }[] = [
  { name: "Instagram", label: "@diamondyoga_goldenhands", icon: "instagram", href: "https://www.instagram.com/diamondyoga_goldenhands" },
  { name: "Facebook", label: "Diamond Yoga", icon: "facebook", href: "https://www.facebook.com/kundalinda62" },
  { name: "Facebook", label: "2LovingHands", icon: "facebook", href: "https://www.facebook.com/2lovinghands" },
  { name: "Facebook", label: "Linda Donkers", icon: "facebook", href: "https://www.facebook.com/Kundalinda" },
  { name: "YouTube", label: "@lindadonkers1580", icon: "youtube", href: "https://youtube.com/@lindadonkers1580" },
  { name: "LinkedIn", label: "Linda Donkers", icon: "linkedin", href: "https://www.linkedin.com/in/linda-donkers-454ab1b5" },
  { name: "Threads", label: "@diamondyoga_goldenhands", icon: "threads", href: "https://www.threads.net/@diamondyoga_goldenhands" },
];

export const YOUTUBE = "https://youtube.com/@lindadonkers1580";

/** Where Linda works. Shown on the home page, contact page and footer. */
export const LOCATION = "Deurne, Antwerpen";
export const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=Deurne%2C%20Antwerpen%2C%20Belgi%C3%AB";

/** Linda's massage prices, the same for every massage (M.E.R., Lomi Lomi Nui, Chi Nei Tsang). */
export const MASSAGE_PRICES = [
  { minutes: 60, cents: 10000 },
  { minutes: 90, cents: 14000 },
] as const;
export const HEALING_PRICE_CENTS = 4400;

/**
 * Client testimonials shown on the home and massage pages. Only real quotes, with the client's
 * permission. The section stays hidden while this list is empty.
 * Example: { quote: { nl: "…", en: "…" }, name: "An", service: { nl: "Lomi Lomi Nui", en: "Lomi Lomi Nui" } }
 */
export const TESTIMONIALS: { quote: { nl: string; en: string }; name: string; service: { nl: string; en: string } }[] = [];

export const ROUTES = {
  home: "/",
  about: "/over-linda",
  yoga: "/kundalini-yoga",
  massage: "/massage",
  healing: "/sat-nam-rasayan",
  events: "/evenementen",
  offers: "/aanbod",
  /** The booking page (calendar). The old /agenda addresses redirect here. */
  book: "/boeken",
  agenda: "/agenda",
  booking: "/boeking",
  admin: "/admin",
  travel: "/reizen",
  gallery: "/galerij",
  contact: "/contact",
  privacy: "/privacy",
  terms: "/voorwaarden",
  memberships: "/beurtenkaarten",
  /** Old address of the class cards page, still served (Stripe links, shared links). */
  membershipsOld: "/lidmaatschap",
  gift: "/cadeaubon",
  account: "/account",
} as const;

/** Only Linda's own photos. AI-generated images from the old site are intentionally excluded. */
export const IMG = {
  arms: "/images/linda-arms.webp",
  happy: "/images/linda-happy.webp",
  smile: "/images/linda-smile.webp",
  portrait: "/images/linda-portrait.webp",
  twist: "/images/kundalini-twist.webp",
  selflove: "/images/meditation-selflove.webp",
  waterfall: "/images/waterfall.webp",
  lomi1: "/images/lomi-lomi-1.webp",
  lomi2: "/images/lomi-lomi-2.webp",
  lomi3: "/images/lomi-lomi-3.webp",
  banyan: "/images/india-banyan.webp",
  sari: "/images/india-sari.webp",
  ayurveda: "/images/ayurveda-treatment.webp",
  indiaPortrait: "/images/india-portrait.webp",
  goldenTemple: "/images/india-golden-temple.webp",
  heart: "/images/india-heart.webp",
} as const;

export const sm = (src: string) => src.replace(".webp", "-sm.webp");

export type GalleryCat = "yoga" | "massage" | "travel";
export type ImgKey = keyof typeof IMG;
export const GALLERY: { key: ImgKey; src: string; cat: GalleryCat; alt: string; w: number; h: number }[] = [
  { key: "arms", src: IMG.arms, cat: "yoga", alt: "Linda met gespreide armen bij de gong", w: 1600, h: 1067 },
  { key: "selflove", src: IMG.selflove, cat: "yoga", alt: "Self-love meditatie", w: 1067, h: 1600 },
  { key: "lomi1", src: IMG.lomi1, cat: "massage", alt: "Lomi Lomi Nui massage", w: 1200, h: 1600 },
  { key: "goldenTemple", src: IMG.goldenTemple, cat: "travel", alt: "Linda bij de Gouden Tempel in Amritsar", w: 1200, h: 1600 },
  { key: "twist", src: IMG.twist, cat: "yoga", alt: "Kundalini schouderdraai", w: 1067, h: 1600 },
  { key: "happy", src: IMG.happy, cat: "yoga", alt: "Linda lacht bij de gong", w: 1600, h: 1067 },
  { key: "heart", src: IMG.heart, cat: "travel", alt: "Linda met hand op het hart in India", w: 1200, h: 1600 },
  { key: "lomi3", src: IMG.lomi3, cat: "massage", alt: "Lomi Lomi Nui massage met onderarmen", w: 791, h: 1600 },
  { key: "banyan", src: IMG.banyan, cat: "travel", alt: "Banyanboom in India", w: 900, h: 1600 },
  { key: "smile", src: IMG.smile, cat: "yoga", alt: "Linda in meditatiehouding", w: 1600, h: 1067 },
  { key: "sari", src: IMG.sari, cat: "travel", alt: "Linda in sari", w: 784, h: 1600 },
  { key: "lomi2", src: IMG.lomi2, cat: "massage", alt: "Lomi Lomi Nui behandeling", w: 960, h: 1280 },
  { key: "waterfall", src: IMG.waterfall, cat: "yoga", alt: "Yoga bij een waterval", w: 270, h: 480 },
  { key: "indiaPortrait", src: IMG.indiaPortrait, cat: "travel", alt: "Linda in India", w: 1193, h: 1600 },
  { key: "ayurveda", src: IMG.ayurveda, cat: "travel", alt: "Ayurveda behandeling", w: 1200, h: 1600 },
  { key: "portrait", src: IMG.portrait, cat: "yoga", alt: "Portret van Linda", w: 1200, h: 1600 },
];
