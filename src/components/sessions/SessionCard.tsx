import { Link } from "react-router-dom";
import { useLang } from "../../i18n/LanguageContext";
import { ROUTES } from "../../data/site";
import { fmtEuro, fmtParts, sessionImageSrc, type PublicSession } from "../../lib/api";
import { Arrow } from "../Arrow";

export function SessionCard({ s }: { s: PublicSession }) {
  const { t, lang } = useLang();
  const d = fmtParts(s.startsAt, lang);
  const appt = s.bookingMode === "appointment";
  const full = s.spotsLeft <= 0;
  const place = s.isOnline ? t.agenda.online : s.venue;
  const img = sessionImageSrc(s);

  return (
    <Link
      to={`${ROUTES.agenda}/${s.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-[1.6rem] border border-forest/10 bg-linen transition-[transform,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-[0_30px_60px_-35px_rgba(46,58,47,0.45)]"
      data-cursor="hover"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={img.src}
          srcSet={img.srcSet}
          sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
          alt=""
          loading="lazy"
          style={{ objectPosition: img.position }}
          className="h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/60 to-transparent" />
        <div className="absolute bottom-3 left-4 flex items-end gap-3 text-linen">
          {appt ? (
            <span className="pb-1 text-[0.72rem] font-bold uppercase tracking-[0.2em]">{t.agenda.appointment}</span>
          ) : (
            <>
              <span className="font-display text-5xl font-light leading-none">{d.day}</span>
              <span className="pb-1 text-[0.7rem] font-bold uppercase leading-tight tracking-[0.2em]">
                {d.weekday}
                <br />
                {d.month}
              </span>
            </>
          )}
        </div>
        <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
          {s.category !== "online" && (
            <span className="rounded-full bg-linen/90 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-forest">
              {t.categories[s.category] ?? t.categories.other}
            </span>
          )}
          {(s.isOnline || s.category === "online") && (
            <span className="rounded-full bg-saffron px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-linen">
              {t.agenda.online}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-2xl font-light leading-snug text-ink transition-colors group-hover:text-saffron">
          {s.title[lang]}
        </h3>
        <p className="mt-2 text-sm text-forest/70">
          {appt ? t.agenda.appointmentHint : d.time} · {s.durationMin} {t.agenda.min}
          {place ? ` · ${place}` : ""}
        </p>
        <div className="mt-auto flex items-end justify-between gap-4 pt-6">
          <div>
            <p className="font-display text-xl text-ink">{s.priceCents > 0 ? fmtEuro(s.priceCents, lang) : t.agenda.free}</p>
            {!appt && (
              <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${full ? "text-forest/40" : "text-saffron"}`}>
                {full ? t.agenda.full : t.agenda.spots(s.spotsLeft)}
              </p>
            )}
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[0.72rem] font-bold uppercase tracking-[0.14em] transition-colors ${
              full ? "border border-forest/15 text-forest/50" : "bg-forest text-linen group-hover:bg-saffron"
            }`}
          >
            {full ? t.agenda.view : t.agenda.book}
            <Arrow className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
