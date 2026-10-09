export const EMAIL = "info@lindadonkers.com";
export const WHATSAPP = "32498142845"; // international format, no "+"
export const PHONE_DISPLAY = "+32 498 14 28 45";

export const SOCIALS = [
  { name: "Instagram", href: "https://www.instagram.com/diamondyoga_goldenhands" },
  { name: "YouTube", href: "https://youtube.com/@lindadonkers1580" },
  { name: "Facebook", href: "https://www.facebook.com/share/1DzxDT9dpc/" },
  { name: "LinkedIn", href: "https://www.linkedin.com/in/linda-donkers-454ab1b5" },
  { name: "Threads", href: "https://www.threads.net/@diamondyoga_goldenhands" },
] as const;

export const YOUTUBE = "https://youtube.com/@lindadonkers1580";

export const ROUTES = {
  home: "/",
  about: "/over-linda",
  yoga: "/kundalini-yoga",
  massage: "/massage",
  travel: "/reizen",
  gallery: "/galerij",
  contact: "/contact",
  privacy: "/privacy",
  terms: "/voorwaarden",
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
