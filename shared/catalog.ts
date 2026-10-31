/**
 * Linda's regular offer, shared by the API (seeding, membership rules) and the site/admin
 * (templates, default photos). Prices from Nov 2026.
 *
 * An "offering" is a kind of session (e.g. Lomi Lomi Nui). Every session row stores its
 * offering key, so a membership card can say exactly which sessions it is valid for.
 */

/** The three booking sections on the website. */
export type Section = "yoga" | "massage" | "online";
export const SECTIONS: readonly Section[] = ["yoga", "massage", "online"];

/** Photos from /public/images that can be used as a session or membership cover. */
export const PHOTO_KEYS = [
  "arms", "happy", "smile", "portrait", "twist", "selflove", "waterfall",
  "lomi1", "lomi2", "lomi3", "heart", "goldenTemple", "indiaPortrait", "sari", "banyan", "ayurveda",
] as const;
export type PhotoKey = (typeof PHOTO_KEYS)[number];

/**
 * Where the subject (Linda's face / hands) is in each photo, as a CSS object-position.
 * Session cards are wide crops; without this, portrait photos get cut to the middle
 * (her torso) instead of her face.
 */
export const PHOTO_FOCUS: Record<PhotoKey, string> = {
  arms: "50% 30%",
  happy: "50% 10%",
  smile: "50% 12%",
  portrait: "50% 38%",
  twist: "50% 8%",
  selflove: "50% 24%",
  waterfall: "50% 48%",
  lomi1: "50% 32%",
  lomi2: "50% 30%",
  lomi3: "50% 22%",
  heart: "50% 22%",
  goldenTemple: "50% 45%",
  indiaPortrait: "50% 30%",
  sari: "50% 6%",
  banyan: "50% 70%",
  ayurveda: "50% 35%",
};

export type Offering = {
  key: string;
  section: Section;
  category: "yoga" | "massage" | "healing";
  titleNl: string;
  titleEn: string;
  descriptionNl: string;
  descriptionEn: string;
  isOnline: boolean;
  durationMin: number;
  priceCents: number;
  capacity: number;
  maxPerBooking: number;
  photo: PhotoKey;
  /** Weekly slot (0 = Sunday … 6 = Saturday, Belgian time). Without it the offering is booked "by appointment". */
  weekly?: { weekday: number; time: string };
};

const GROUP_NL =
  "Samen oefenen in een kleine, warme groep: kriya, ademwerk, mantra, meditatie en gongrelaxatie. Iedereen is welkom, ervaring is niet nodig.";
const GROUP_EN =
  "Practise together in a small, warm group: kriya, breathwork, mantra, meditation and gong relaxation. Everyone is welcome, no experience needed.";
const APPT_NL = "\n\nOp afspraak: geef bij het boeken je voorkeursdag en -uur door, Linda bevestigt het moment persoonlijk.";
const APPT_EN = "\n\nBy appointment: tell Linda your preferred day and time when you book, she confirms the moment personally.";

export const OFFERINGS: Offering[] = [
  {
    key: "yoga-group-mon",
    section: "yoga",
    category: "yoga",
    titleNl: "Kundalini Yoga groepsles",
    titleEn: "Kundalini Yoga group session",
    descriptionNl: GROUP_NL,
    descriptionEn: GROUP_EN,
    isOnline: false, durationMin: 90, priceCents: 2200, capacity: 10, maxPerBooking: 4,
    photo: "arms",
    weekly: { weekday: 1, time: "19:30" },
  },
  {
    key: "yoga-group-wed",
    section: "yoga",
    category: "yoga",
    titleNl: "Kundalini Yoga groepsles",
    titleEn: "Kundalini Yoga group session",
    descriptionNl: GROUP_NL,
    descriptionEn: GROUP_EN,
    isOnline: false, durationMin: 90, priceCents: 2200, capacity: 10, maxPerBooking: 4,
    photo: "happy",
    weekly: { weekday: 3, time: "09:30" },
  },
  {
    key: "yoga-private",
    section: "yoga",
    category: "yoga",
    titleNl: "Kundalini Yoga privésessie (incl. persoonlijke coaching)",
    titleEn: "Kundalini Yoga private session (personal coaching included)",
    descriptionNl: "Een sessie helemaal op jouw maat, inclusief persoonlijke coaching. Op zaterdagochtend om 9.30 uur.",
    descriptionEn: "A session fully tailored to you, personal coaching included. On Saturday morning at 9.30 am.",
    isOnline: false, durationMin: 90, priceCents: 9000, capacity: 1, maxPerBooking: 1,
    photo: "smile",
    weekly: { weekday: 6, time: "09:30" },
  },
  {
    key: "mer",
    section: "massage",
    category: "massage",
    titleNl: "M.E.R. Myo Fascia Energetic Release",
    titleEn: "M.E.R. Myo Fascia Energetic Release",
    descriptionNl:
      "Therapeutische massage: diep fasciawerk waarbij vastgehouden emoties met liefde en aanwezigheid worden aangeraakt. Ideaal bij chronische pijn en om je houding te verbeteren." + APPT_NL,
    descriptionEn:
      "Therapy massage: deep fascia work in which held emotions are touched with love and presence. Ideal for chronic pain and improving posture." + APPT_EN,
    isOnline: false, durationMin: 90, priceCents: 14000, capacity: 1, maxPerBooking: 1,
    photo: "lomi3",
  },
  {
    key: "lomi",
    section: "massage",
    category: "massage",
    titleNl: "Lomi Lomi Nui · Hawaiiaanse oliemassage",
    titleEn: "Lomi Lomi Nui · Hawaiian oil massage",
    descriptionNl: "Een hartopenende ceremonie met lange strijkbewegingen, als de golven van de zee." + APPT_NL,
    descriptionEn: "A heart-opening ceremony with long strokes, like the waves of the sea." + APPT_EN,
    isOnline: false, durationMin: 90, priceCents: 14000, capacity: 1, maxPerBooking: 1,
    photo: "lomi1",
  },
  {
    key: "chinei",
    section: "massage",
    category: "massage",
    titleNl: "Taoïstische buik- & orgaanmassage (Chi Nei Tsang)",
    titleEn: "Taoïstic belly & organ massage (Chi Nei Tsang)",
    descriptionNl: "Een helende massage gecombineerd met drukpunttherapie. Weldadig bij spijsverteringsproblemen en voor de bloedcirculatie." + APPT_NL,
    descriptionEn: "A healing massage combined with pressure point therapy. Beneficial for digestive problems and blood circulation." + APPT_EN,
    isOnline: false, durationMin: 60, priceCents: 9000, capacity: 1, maxPerBooking: 1,
    photo: "lomi2",
  },
  {
    key: "satnam-live",
    section: "massage",
    category: "healing",
    titleNl: "Sat Nam Rasayan healing (live)",
    titleEn: "Sat Nam Rasayan healing (in person)",
    descriptionNl: "Een healing vanuit een diepe meditatieve staat, voor diepe ontspanning van lichaam en geest." + APPT_NL,
    descriptionEn: "A healing given from a deep meditative state, for deep relaxation of body and mind." + APPT_EN,
    isOnline: false, durationMin: 40, priceCents: 4400, capacity: 1, maxPerBooking: 1,
    photo: "selflove",
  },
  {
    key: "yoga-online-en",
    section: "online",
    category: "yoga",
    titleNl: "Kundalini Yoga online groepsles (in het Engels)",
    titleEn: "Kundalini Yoga online group session (in English)",
    descriptionNl: "Doe mee van thuis uit, waar je ook bent. Deze les wordt in het Engels gegeven. Je ontvangt de link in je bevestigingsmail.",
    descriptionEn: "Join from home, wherever you are. This class is taught in English. You'll receive the link in your confirmation email.",
    isOnline: true, durationMin: 90, priceCents: 1500, capacity: 20, maxPerBooking: 2,
    photo: "twist",
    weekly: { weekday: 5, time: "08:00" },
  },
  {
    key: "coaching-online",
    section: "online",
    category: "yoga",
    titleNl: "Online coaching één-op-één",
    titleEn: "Online one-to-one coaching",
    descriptionNl: "Een persoonlijke Kundalini Yoga sessie met coaching, online van thuis uit. Op zaterdag om 11.30 uur.",
    descriptionEn: "A personal Kundalini Yoga session with coaching, online from home. On Saturday at 11.30 am.",
    isOnline: true, durationMin: 90, priceCents: 9000, capacity: 1, maxPerBooking: 1,
    photo: "portrait",
    weekly: { weekday: 6, time: "11:30" },
  },
  {
    key: "satnam-online",
    section: "online",
    category: "healing",
    titleNl: "Sat Nam Rasayan healing (online)",
    titleEn: "Sat Nam Rasayan healing (online)",
    descriptionNl: "Een healing op afstand vanuit een diepe meditatieve staat. Je ontvangt de link in je bevestigingsmail." + APPT_NL,
    descriptionEn: "A distance healing from a deep meditative state. You'll receive the link in your confirmation email." + APPT_EN,
    isOnline: true, durationMin: 40, priceCents: 4400, capacity: 1, maxPerBooking: 1,
    photo: "heart",
  },
];

/** Offering "families" a membership card can be valid for. Keys group the weekly slots of the same class. */
export const OFFERING_GROUPS: { key: string; label: string; offerings: string[] }[] = [
  { key: "yoga-group", label: "Kundalini Yoga group session (Mon & Wed)", offerings: ["yoga-group-mon", "yoga-group-wed"] },
  { key: "yoga-private", label: "Kundalini Yoga private session", offerings: ["yoga-private"] },
  { key: "yoga-online-en", label: "Online group session (English)", offerings: ["yoga-online-en"] },
  { key: "coaching-online", label: "Online one-to-one coaching", offerings: ["coaching-online"] },
  { key: "mer", label: "M.E.R. Myo Fascia Energetic Release", offerings: ["mer"] },
  { key: "lomi", label: "Lomi Lomi Nui", offerings: ["lomi"] },
  { key: "chinei", label: "Chi Nei Tsang", offerings: ["chinei"] },
  { key: "satnam", label: "Sat Nam Rasayan healing (live & online)", offerings: ["satnam-live", "satnam-online"] },
];

/** Expands a plan's stored scope (group keys and/or offering keys) to offering keys. */
export function expandScope(scope: string[]): Set<string> {
  const out = new Set<string>();
  for (const k of scope) {
    const g = OFFERING_GROUPS.find((x) => x.key === k);
    if (g) g.offerings.forEach((o) => out.add(o));
    else out.add(k);
  }
  return out;
}

export type PlanSeed = {
  nameNl: string;
  nameEn: string;
  descriptionNl: string;
  descriptionEn: string;
  priceCents: number;
  credits: number;
  validityDays: number;
  scope: string[];
  photo: PhotoKey;
};

/** Linda's session cards, created as membership plans. */
export const DEFAULT_PLANS: PlanSeed[] = [
  {
    nameNl: "10-beurtenkaart Kundalini Yoga groepsles",
    nameEn: "10-session card Kundalini Yoga group session",
    descriptionNl: "10 groepslessen van 90 minuten. Een jaar geldig vanaf aankoop.",
    descriptionEn: "10 group sessions of 90 minutes. Valid for one year from purchase.",
    priceCents: 20000, credits: 10, validityDays: 365, scope: ["yoga-group"], photo: "waterfall",
  },
  {
    nameNl: "5-beurtenkaart M.E.R. Myo Fascia Energetic Release",
    nameEn: "5-session card M.E.R. Myo Fascia Energetic Release",
    descriptionNl: "5 therapeutische massages van 90 minuten. Een jaar geldig vanaf aankoop.",
    descriptionEn: "5 therapy massages of 90 minutes. Valid for one year from purchase.",
    priceCents: 60000, credits: 5, validityDays: 365, scope: ["mer"], photo: "lomi3",
  },
  {
    nameNl: "5-beurtenkaart Lomi Lomi Nui",
    nameEn: "5-session card Lomi Lomi Nui",
    descriptionNl: "5 Hawaiiaanse oliemassages van 90 minuten. Een jaar geldig vanaf aankoop.",
    descriptionEn: "5 Hawaiian oil massages of 90 minutes. Valid for one year from purchase.",
    priceCents: 60000, credits: 5, validityDays: 365, scope: ["lomi"], photo: "lomi1",
  },
];

/** Section on the website for a session: online first, then by category. */
export function sectionOf(s: { category: string; isOnline: boolean }): Section | "other" {
  if (s.isOnline || s.category === "online") return "online";
  if (["yoga", "gong", "workshop"].includes(s.category)) return "yoga";
  if (["massage", "healing"].includes(s.category)) return "massage";
  return "other";
}
