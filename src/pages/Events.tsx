import { useLang } from "../i18n/LanguageContext";
import { IMG, ROUTES, sm, waLink } from "../data/site";
import { useSessions } from "../lib/api";
import { tabsOf } from "../lib/booking";
import { FadeUp, RevealText } from "../components/Reveal";
import { Button } from "../components/Magnetic";
import { SessionCard } from "../components/sessions/SessionCard";
import { usePageTitle } from "../components/usePageTitle";

/** Gong evenings, workshops and retreats with a fixed date, straight from the admin panel. */
export default function Events() {
  const { t } = useLang();
  const e = t.events;
  usePageTitle(t.meta.events);
  const { sessions, error } = useSessions(200);
  const list = (sessions ?? []).filter((s) => tabsOf(s).includes("events") && Date.parse(s.startsAt) > Date.now());

  return (
    <section className="relative pb-28 pt-32 sm:pb-36 sm:pt-40">
      <div className="container-x">
        <FadeUp>
          <span className="eyebrow">{e.eyebrow}</span>
        </FadeUp>
        <h1 className="mt-6 font-display text-[clamp(2.7rem,6.4vw,6rem)] font-light leading-[1] text-ink">
          <RevealText text={e.title} immediate delay={0.2} />
          <RevealText text={e.accent} immediate delay={0.35} className="italic-accent" />
        </h1>
        <FadeUp delay={0.3}>
          <p className="lead mt-7 max-w-2xl">{e.intro}</p>
        </FadeUp>

        <h2 className="mt-16 font-display text-3xl font-light text-ink">{e.upcomingTitle}</h2>
        <div className="mt-6">
          {error ? (
            <p className="lead">{t.agenda.error}</p>
          ) : !sessions ? (
            <p className="text-forest/60" role="status">
              {e.loading}
            </p>
          ) : list.length === 0 ? (
            <div className="rounded-[2rem] bg-sand px-8 py-12 sm:px-12">
              <p className="lead max-w-xl">{e.empty}</p>
              <div className="mt-8">
                <Button href={waLink(e.askText)}>{e.askCta}</Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((s, i) => (
                <FadeUp key={s.id} delay={Math.min(i, 5) * 0.05} className="h-full">
                  <SessionCard s={s} />
                </FadeUp>
              ))}
            </div>
          )}
        </div>

        <FadeUp>
          <div className="mt-16 grid items-center gap-8 overflow-hidden rounded-[2rem] bg-forest text-linen md:grid-cols-12">
            <img src={sm(IMG.heart)} alt="" loading="lazy" className="h-56 w-full object-cover object-[50%_22%] md:col-span-4 md:h-full" />
            <div className="px-8 pb-10 md:col-span-8 md:py-10 md:pr-12">
              <p className="font-display text-3xl font-light">{e.retreatsTitle}</p>
              <p className="mt-2 max-w-xl text-linen/75">{e.retreatsText}</p>
              <div className="mt-6">
                <Button to={ROUTES.travel} variant="light">
                  {e.retreatsCta}
                </Button>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
