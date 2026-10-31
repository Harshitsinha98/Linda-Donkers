import { motion } from "framer-motion";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { ROUTES, waLink } from "../data/site";
import { useSessions, type PublicSession } from "../lib/api";
import { FadeUp, RevealText } from "../components/Reveal";
import { Button } from "../components/Magnetic";
import { SessionCard } from "../components/sessions/SessionCard";
import { usePageTitle } from "../components/usePageTitle";

/** The three booking sections. "other" (retreats, one-off events) only shows up when there is something in it. */
const SECTION_ORDER = ["yoga", "massage", "online", "other"] as const;
type SectionKey = (typeof SECTION_ORDER)[number];

/** Older links: ?cat=healing, ?cat=yoga&online=1 … */
function fromParams(cat: string, online: boolean): SectionKey | "" {
  if (online) return "online";
  if (cat === "healing" || cat === "massage") return "massage";
  if (cat === "gong" || cat === "workshop" || cat === "yoga") return "yoga";
  if (cat === "online") return "online";
  if (cat === "retreat" || cat === "other") return "other";
  return "";
}

function Grid({ list }: { list: PublicSession[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((s, i) => (
        <FadeUp key={s.id} delay={Math.min(i, 5) * 0.05} className="h-full">
          <SessionCard s={s} />
        </FadeUp>
      ))}
    </div>
  );
}

export default function Agenda() {
  const { t } = useLang();
  const a = t.agenda;
  usePageTitle(t.meta.agenda);
  const { sessions, error } = useSessions(200);
  const [params, setParams] = useSearchParams();

  const bySection = useMemo(() => {
    const map = new Map<SectionKey, PublicSession[]>();
    for (const s of sessions ?? []) {
      const key = (SECTION_ORDER as readonly string[]).includes(s.section) ? (s.section as SectionKey) : "other";
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return map;
  }, [sessions]);

  const tabs = SECTION_ORDER.filter((k) => k !== "other" || bySection.has("other"));
  const requested = fromParams(params.get("cat") ?? "", params.get("online") === "1");
  const active: SectionKey = requested && tabs.includes(requested) ? requested : "yoga";
  const list = bySection.get(active) ?? [];
  const appointments = list.filter((s) => s.bookingMode === "appointment");
  const scheduled = list.filter((s) => s.bookingMode !== "appointment");

  return (
    <section className="relative pb-28 pt-32 sm:pb-40 sm:pt-44">
      <div className="container-x">
        <motion.span className="eyebrow" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.2 }}>
          {a.eyebrow}
        </motion.span>
        <h1 className="display-xl mt-6 text-ink">
          <RevealText text={a.title} immediate delay={0.25} />
          <RevealText text={a.accent} immediate delay={0.45} className="italic-accent" />
        </h1>
        <motion.p className="lead mt-8 max-w-xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 1 }}>
          {a.intro}
        </motion.p>

        <div role="tablist" aria-label={a.eyebrow} className="mt-12 grid gap-2 sm:inline-grid sm:grid-flow-col sm:rounded-full sm:border sm:border-forest/15 sm:p-1.5">
          {tabs.map((k) => {
            const on = active === k;
            const n = bySection.get(k)?.length ?? 0;
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setParams({ cat: k }, { replace: true })}
                className={`flex items-center justify-between gap-3 rounded-full border px-5 py-3 text-sm font-semibold transition-all duration-300 sm:border-0 ${
                  on ? "border-saffron bg-saffron text-linen" : "border-forest/20 text-forest hover:text-saffron"
                }`}
              >
                {a.sections[k]}
                {sessions && (
                  <span className={`rounded-full px-2 py-0.5 text-[0.7rem] ${on ? "bg-linen/25" : "bg-sand"}`}>{n}</span>
                )}
              </button>
            );
          })}
        </div>
        {a.sectionIntro[active] && <p className="mt-6 max-w-2xl text-forest/75">{a.sectionIntro[active]}</p>}

        <div className="mt-10">
          {error ? (
            <p className="lead">{a.error}</p>
          ) : !sessions ? (
            <p className="text-forest/60" role="status">
              {a.loading}
            </p>
          ) : list.length === 0 ? (
            <FadeUp>
              <div className="rounded-[2rem] bg-sand px-8 py-14 sm:px-14">
                <p className="lead max-w-xl">{a.empty}</p>
                <div className="mt-8">
                  <Button href={waLink(t.mobileBar.whatsappText)}>{a.emptyCta}</Button>
                </div>
              </div>
            </FadeUp>
          ) : (
            <div className="grid gap-14">
              {appointments.length > 0 && (
                <div>
                  {scheduled.length > 0 && <h2 className="mb-6 font-display text-3xl font-light text-ink">{a.byAppointment}</h2>}
                  <Grid list={appointments} />
                </div>
              )}
              {scheduled.length > 0 && (
                <div>
                  {appointments.length > 0 && <h2 className="mb-6 font-display text-3xl font-light text-ink">{a.fixedDates}</h2>}
                  <Grid list={scheduled} />
                </div>
              )}
            </div>
          )}
        </div>

        <FadeUp>
          <div className="mt-20 flex flex-wrap items-center justify-between gap-6 rounded-[2rem] bg-forest px-8 py-10 text-linen sm:px-12">
            <div className="max-w-xl">
              <p className="font-display text-3xl font-light">{a.membershipTitle}</p>
              <p className="mt-2 text-linen/75">{a.membershipText}</p>
            </div>
            <Button to={ROUTES.memberships} variant="light">{a.membershipCta}</Button>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
