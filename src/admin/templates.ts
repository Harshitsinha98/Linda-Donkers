/**
 * Ready-made session templates for Linda's regular offer (prices from Oct 2026).
 * Choosing one in "New session" fills in the form; Linda only has to check the
 * date and, for weekly classes, set "Repeat every week".
 *
 * `weekday` (0 = Sunday … 6 = Saturday) moves the date to the next matching day.
 */
export type SessionTemplate = {
  id: string;
  group: "Kundalini Yoga" | "Massage & healing";
  label: string;
  weekday?: number;
  fields: {
    titleNl: string;
    titleEn: string;
    descriptionNl: string;
    descriptionEn: string;
    category: "yoga" | "massage" | "healing";
    isOnline: boolean;
    startTime?: string;
    durationMin: string;
    price: string;
    capacity: string;
    maxPerBooking: string;
  };
};

const GROUP_YOGA = {
  descriptionNl: "Samen oefenen in een kleine, warme groep: kriya, ademwerk, mantra, meditatie en gongrelaxatie. Iedereen is welkom, ervaring is niet nodig.",
  descriptionEn: "Practise together in a small, warm group: kriya, breathwork, mantra, meditation and gong relaxation. Everyone is welcome, no experience needed.",
};

export const TEMPLATES: SessionTemplate[] = [
  {
    id: "yoga-mon",
    group: "Kundalini Yoga",
    label: "Group class · Monday 19:30 · 90 min · €22",
    weekday: 1,
    fields: {
      titleNl: "Kundalini Yoga groepsles", titleEn: "Kundalini Yoga group class", ...GROUP_YOGA,
      category: "yoga", isOnline: false, startTime: "19:30", durationMin: "90", price: "22", capacity: "10", maxPerBooking: "4",
    },
  },
  {
    id: "yoga-wed",
    group: "Kundalini Yoga",
    label: "Group class · Wednesday 09:30 · 90 min · €22",
    weekday: 3,
    fields: {
      titleNl: "Kundalini Yoga groepsles", titleEn: "Kundalini Yoga group class", ...GROUP_YOGA,
      category: "yoga", isOnline: false, startTime: "09:30", durationMin: "90", price: "22", capacity: "10", maxPerBooking: "4",
    },
  },
  {
    id: "yoga-online-en",
    group: "Kundalini Yoga",
    label: "Online group class (English) · Friday 08:00 · 90 min · €15",
    weekday: 5,
    fields: {
      titleNl: "Kundalini Yoga online groepsles (Engels)",
      titleEn: "Kundalini Yoga online group class (English)",
      descriptionNl: "Doe mee van thuis uit, waar je ook bent. Deze les wordt in het Engels gegeven. Je ontvangt de link in je bevestigingsmail.",
      descriptionEn: "Join from home, wherever you are. This class is taught in English. You'll receive the link in your confirmation email.",
      category: "yoga", isOnline: true, startTime: "08:00", durationMin: "90", price: "15", capacity: "20", maxPerBooking: "2",
    },
  },
  {
    id: "yoga-private",
    group: "Kundalini Yoga",
    label: "Private session + coaching · Saturday 09:30 · 90 min · €90",
    weekday: 6,
    fields: {
      titleNl: "Kundalini Yoga privésessie met coaching",
      titleEn: "Kundalini Yoga private session with coaching",
      descriptionNl: "Een sessie helemaal op jouw maat, inclusief persoonlijke coaching.",
      descriptionEn: "A session fully tailored to you, personal coaching included.",
      category: "yoga", isOnline: false, startTime: "09:30", durationMin: "90", price: "90", capacity: "1", maxPerBooking: "1",
    },
  },
  {
    id: "yoga-private-online",
    group: "Kundalini Yoga",
    label: "Online one-to-one coaching · Saturday 11:30 · 90 min · €90",
    weekday: 6,
    fields: {
      titleNl: "Online coaching één-op-één",
      titleEn: "Online one-to-one coaching",
      descriptionNl: "Een persoonlijke Kundalini Yoga sessie met coaching, online van thuis uit.",
      descriptionEn: "A personal Kundalini Yoga session with coaching, online from home.",
      category: "yoga", isOnline: true, startTime: "11:30", durationMin: "90", price: "90", capacity: "1", maxPerBooking: "1",
    },
  },
  {
    id: "mer",
    group: "Massage & healing",
    label: "M.E.R. Myo Fascia Energetic Release · 90 min · €140",
    fields: {
      titleNl: "M.E.R. Myo Fascia Energetic Release",
      titleEn: "M.E.R. Myo Fascia Energetic Release",
      descriptionNl: "Therapeutische massage: diep fasciawerk waarbij vastgehouden emoties met liefde en aanwezigheid worden aangeraakt. Ideaal bij chronische pijn en om je houding te verbeteren.",
      descriptionEn: "Therapy massage: deep fascia work in which held emotions are touched with love and presence. Ideal for chronic pain and improving posture.",
      category: "massage", isOnline: false, durationMin: "90", price: "140", capacity: "1", maxPerBooking: "1",
    },
  },
  {
    id: "lomi",
    group: "Massage & healing",
    label: "Lomi Lomi Nui · Hawaiian oil massage · 90 min · €140",
    fields: {
      titleNl: "Lomi Lomi Nui massage",
      titleEn: "Lomi Lomi Nui massage",
      descriptionNl: "Hawaiiaanse oliemassage: een hartopenende ceremonie met lange strijkbewegingen, als de golven van de zee.",
      descriptionEn: "Hawaiian oil massage: a heart-opening ceremony with long strokes, like the waves of the sea.",
      category: "massage", isOnline: false, durationMin: "90", price: "140", capacity: "1", maxPerBooking: "1",
    },
  },
  {
    id: "chinei",
    group: "Massage & healing",
    label: "Taoïstic belly & organ massage (Chi Nei Tsang) · 60 min · €90",
    fields: {
      titleNl: "Taoïstische buik- & orgaanmassage (Chi Nei Tsang)",
      titleEn: "Taoïstic belly & organ massage (Chi Nei Tsang)",
      descriptionNl: "Een helende massage gecombineerd met drukpunttherapie. Weldadig bij spijsverteringsproblemen en voor de bloedcirculatie.",
      descriptionEn: "A healing massage combined with pressure point therapy. Beneficial for digestive problems and blood circulation.",
      category: "massage", isOnline: false, durationMin: "60", price: "90", capacity: "1", maxPerBooking: "1",
    },
  },
  {
    id: "satnam-live",
    group: "Massage & healing",
    label: "Sat Nam Rasayan healing · live · 40 min · €44",
    fields: {
      titleNl: "Sat Nam Rasayan healing",
      titleEn: "Sat Nam Rasayan healing",
      descriptionNl: "Een healing vanuit een diepe meditatieve staat, voor diepe ontspanning van lichaam en geest.",
      descriptionEn: "A healing given from a deep meditative state, for deep relaxation of body and mind.",
      category: "healing", isOnline: false, durationMin: "40", price: "44", capacity: "1", maxPerBooking: "1",
    },
  },
  {
    id: "satnam-online",
    group: "Massage & healing",
    label: "Sat Nam Rasayan healing · online · 40 min · €44",
    fields: {
      titleNl: "Sat Nam Rasayan healing (online)",
      titleEn: "Sat Nam Rasayan healing (online)",
      descriptionNl: "Een healing op afstand vanuit een diepe meditatieve staat. Je ontvangt de link in je bevestigingsmail.",
      descriptionEn: "A distance healing from a deep meditative state. You'll receive the link in your confirmation email.",
      category: "healing", isOnline: true, durationMin: "40", price: "44", capacity: "1", maxPerBooking: "1",
    },
  },
];

/**
 * Next date (YYYY-MM-DD, local) that falls on `weekday`. Today counts, unless
 * `startTime` (HH:MM) has already passed today, then it's the same day next week.
 */
export function nextWeekday(weekday: number, startTime = "00:00", from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + ((weekday - d.getDay() + 7) % 7));
  const [h, m] = startTime.split(":").map(Number);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h || 0, m || 0);
  if (start.getTime() <= from.getTime()) d.setDate(d.getDate() + 7);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
