/**
 * Linda's standard offer (prices from 30 Oct 2026). Used by:
 * - the admin "New session" templates (fills in the form), and
 * - the admin "Reset agenda" action (recreates the weekly classes).
 *
 * Weekly classes have a weekday + time. Massages and healings are by appointment,
 * so they have no fixed time: the reset creates one hidden draft of each that Linda
 * dates and publishes (or duplicates) herself.
 */
import type { CoverKey, OfferKey } from "./catalog.js";

export type StandardSession = {
  id: string;
  group: "Kundalini Yoga" | "Massage & healing";
  label: string;
  /** 0 = Sunday … 6 = Saturday. Only for sessions on a fixed weekly time. */
  weekday?: number;
  startTime?: string;
  titleNl: string;
  titleEn: string;
  descriptionNl: string;
  descriptionEn: string;
  category: "yoga" | "massage" | "healing";
  isOnline: boolean;
  durationMin: number;
  priceCents: number;
  capacity: number;
  maxPerBooking: number;
  offer: OfferKey;
  cover: CoverKey;
};

const GROUP_NL =
  "Samen oefenen in een kleine, warme groep: kriya, ademwerk, mantra, meditatie en gongrelaxatie. Iedereen is welkom, ervaring is niet nodig. Ook te boeken met je 10-beurtenkaart.";
const GROUP_EN =
  "Practise together in a small, warm group: kriya, breathwork, mantra, meditation and gong relaxation. Everyone is welcome, no experience needed. Can also be booked with your 10-class card.";

export const STANDARD_SESSIONS: StandardSession[] = [
  {
    id: "yoga-mon",
    group: "Kundalini Yoga",
    label: "Group class · Monday 19:30 · 90 min · €22",
    weekday: 1,
    startTime: "19:30",
    titleNl: "Kundalini Yoga groepsles",
    titleEn: "Kundalini Yoga group class",
    descriptionNl: GROUP_NL,
    descriptionEn: GROUP_EN,
    category: "yoga",
    isOnline: false,
    durationMin: 90,
    priceCents: 2200,
    capacity: 10,
    maxPerBooking: 4,
    offer: "yoga-group",
    cover: "twist",
  },
  {
    id: "yoga-wed",
    group: "Kundalini Yoga",
    label: "Group class · Wednesday 09:30 · 90 min · €22",
    weekday: 3,
    startTime: "09:30",
    titleNl: "Kundalini Yoga groepsles",
    titleEn: "Kundalini Yoga group class",
    descriptionNl: GROUP_NL,
    descriptionEn: GROUP_EN,
    category: "yoga",
    isOnline: false,
    durationMin: 90,
    priceCents: 2200,
    capacity: 10,
    maxPerBooking: 4,
    offer: "yoga-group",
    cover: "happy",
  },
  {
    id: "yoga-online-en",
    group: "Kundalini Yoga",
    label: "Online group class (English) · Friday 08:00 · 90 min · €15",
    weekday: 5,
    startTime: "08:00",
    titleNl: "Kundalini Yoga online groepsles (Engels)",
    titleEn: "Kundalini Yoga online group class (English)",
    descriptionNl: "Doe mee van thuis uit, waar je ook bent. Deze les wordt in het Engels gegeven. Je ontvangt de link in je bevestigingsmail.",
    descriptionEn: "Join from home, wherever you are. This class is taught in English. You'll receive the link in your confirmation email.",
    category: "yoga",
    isOnline: true,
    durationMin: 90,
    priceCents: 1500,
    capacity: 20,
    maxPerBooking: 2,
    offer: "yoga-online",
    cover: "arms",
  },
  {
    id: "yoga-private",
    group: "Kundalini Yoga",
    label: "Private session + coaching · Saturday 09:30 · 90 min · €90",
    weekday: 6,
    startTime: "09:30",
    titleNl: "Kundalini Yoga privésessie met coaching",
    titleEn: "Kundalini Yoga private session with coaching",
    descriptionNl: "Een sessie helemaal op jouw maat, inclusief persoonlijke coaching. Voor wie dieper wil gaan of liever alleen begint.",
    descriptionEn: "A session fully tailored to you, personal coaching included. For those who want to go deeper or prefer to start alone.",
    category: "yoga",
    isOnline: false,
    durationMin: 90,
    priceCents: 9000,
    capacity: 1,
    maxPerBooking: 1,
    offer: "yoga-private",
    cover: "smile",
  },
  {
    id: "coaching-online",
    group: "Kundalini Yoga",
    label: "Online coaching one-to-one · Saturday 11:30 · 90 min · €90",
    weekday: 6,
    startTime: "11:30",
    titleNl: "Online coaching één-op-één",
    titleEn: "Online one-to-one coaching",
    descriptionNl: "Een persoonlijke Kundalini Yoga sessie met coaching, online van thuis uit. Je ontvangt de link in je bevestigingsmail.",
    descriptionEn: "A personal Kundalini Yoga session with coaching, online from home. You'll receive the link in your confirmation email.",
    category: "yoga",
    isOnline: true,
    durationMin: 90,
    priceCents: 9000,
    capacity: 1,
    maxPerBooking: 1,
    offer: "coaching-online",
    cover: "portrait",
  },
  {
    id: "mer",
    group: "Massage & healing",
    label: "M.E.R. Myo Fascia Energetic Release · 90 min · €140",
    titleNl: "M.E.R. Myo Fascia Energetic Release",
    titleEn: "M.E.R. Myo Fascia Energetic Release",
    descriptionNl:
      "Therapeutische massage: diep fasciawerk waarbij vastgehouden emoties met liefde en aanwezigheid worden aangeraakt. Ideaal bij chronische pijn en om je houding te verbeteren.",
    descriptionEn: "Therapy massage: deep fascia work in which held emotions are touched with love and presence. Ideal for chronic pain and improving posture.",
    category: "massage",
    isOnline: false,
    durationMin: 90,
    priceCents: 14000,
    capacity: 1,
    maxPerBooking: 1,
    offer: "mer",
    cover: "lomi3",
  },
  {
    id: "lomi",
    group: "Massage & healing",
    label: "Lomi Lomi Nui · Hawaiian oil massage · 90 min · €140",
    titleNl: "Lomi Lomi Nui massage",
    titleEn: "Lomi Lomi Nui massage",
    descriptionNl: "Hawaiiaanse oliemassage: een hartopenende ceremonie met lange strijkbewegingen, als de golven van de zee.",
    descriptionEn: "Hawaiian oil massage: a heart-opening ceremony with long strokes, like the waves of the sea.",
    category: "massage",
    isOnline: false,
    durationMin: 90,
    priceCents: 14000,
    capacity: 1,
    maxPerBooking: 1,
    offer: "lomi",
    cover: "lomi1",
  },
  {
    id: "chinei",
    group: "Massage & healing",
    label: "Taoïstic belly & organ massage (Chi Nei Tsang) · 60 min · €90",
    titleNl: "Taoïstische buik- & orgaanmassage (Chi Nei Tsang)",
    titleEn: "Taoïstic belly & organ massage (Chi Nei Tsang)",
    descriptionNl: "Een helende massage gecombineerd met drukpunttherapie. Weldadig bij spijsverteringsproblemen en voor de bloedcirculatie.",
    descriptionEn: "A healing massage combined with pressure point therapy. Beneficial for digestive problems and blood circulation.",
    category: "massage",
    isOnline: false,
    durationMin: 60,
    priceCents: 9000,
    capacity: 1,
    maxPerBooking: 1,
    offer: "chinei",
    cover: "lomi2",
  },
  {
    id: "satnam-live",
    group: "Massage & healing",
    label: "Sat Nam Rasayan healing · live · 40 min · €44",
    titleNl: "Sat Nam Rasayan healing",
    titleEn: "Sat Nam Rasayan healing",
    descriptionNl: "Een healing vanuit een diepe meditatieve staat, voor diepe ontspanning van lichaam en geest.",
    descriptionEn: "A healing given from a deep meditative state, for deep relaxation of body and mind.",
    category: "healing",
    isOnline: false,
    durationMin: 40,
    priceCents: 4400,
    capacity: 1,
    maxPerBooking: 1,
    offer: "satnam",
    cover: "selflove",
  },
  {
    id: "satnam-online",
    group: "Massage & healing",
    label: "Sat Nam Rasayan healing · online · 40 min · €44",
    titleNl: "Sat Nam Rasayan healing (online)",
    titleEn: "Sat Nam Rasayan healing (online)",
    descriptionNl: "Een healing op afstand vanuit een diepe meditatieve staat. Je ontvangt de link in je bevestigingsmail.",
    descriptionEn: "A distance healing from a deep meditative state. You'll receive the link in your confirmation email.",
    category: "healing",
    isOnline: true,
    durationMin: 40,
    priceCents: 4400,
    capacity: 1,
    maxPerBooking: 1,
    offer: "satnam",
    cover: "heart",
  },
];
