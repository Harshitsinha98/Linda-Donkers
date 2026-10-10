import { Link } from "react-router-dom";
import { useLang } from "../../i18n/LanguageContext";
import { ROUTES } from "../../data/site";
import { useSessions } from "../../lib/api";
import { FadeUp, RevealText } from "../Reveal";
import { Arrow } from "../Arrow";
import { SessionCard } from "./SessionCard";

/** Home page highlight: Linda's next sessions, straight from the admin panel. Hidden when nothing is planned. */
export function UpcomingSessions() {
  const { t } = useLang();
  const { sessions } = useSessions(6);
  if (!sessions || sessions.length === 0) return null;

  return (
    <section className="relative bg-linen py-24 sm:py-32" aria-labelledby="upcoming-title">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <FadeUp>
              <span className="eyebrow">{t.home.upcomingEyebrow}</span>
            </FadeUp>
            <h2 id="upcoming-title" className="display-lg mt-6 text-ink">
              <RevealText text={t.home.upcomingTitle} />
              <RevealText text={t.home.upcomingAccent} className="italic-accent" delay={0.2} />
            </h2>
            <FadeUp delay={0.15}>
              <p className="lead mt-5">{t.home.upcomingText}</p>
            </FadeUp>
          </div>
          <Link to={ROUTES.agenda} className="group hidden items-center gap-2 font-semibold text-forest sm:inline-flex">
            <span className="border-b border-forest pb-0.5 transition-colors group-hover:border-saffron group-hover:text-saffron">
              {t.home.upcomingAll}
            </span>
            <Arrow dir="up-right" className="h-4 w-4 transition-transform duration-500 group-hover:rotate-45" />
          </Link>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s, i) => (
            <FadeUp key={s.id} delay={Math.min(i, 5) * 0.06} className="h-full">
              <SessionCard s={s} />
            </FadeUp>
          ))}
        </div>

        <div className="mt-10 sm:hidden">
          <Link to={ROUTES.agenda} className="inline-flex items-center gap-2 font-semibold text-forest">
            <span className="border-b border-forest pb-0.5">{t.home.upcomingAll}</span>
            <Arrow dir="up-right" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
