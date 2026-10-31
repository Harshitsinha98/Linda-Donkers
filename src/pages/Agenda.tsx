import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { waLink } from "../data/site";
import { useSessions, type PublicSession } from "../lib/api";
import { Arrow } from "../components/Arrow";
import { FadeUp, RevealText } from "../components/Reveal";
import { Button } from "../components/Magnetic";
import { SessionCard } from "../components/sessions/SessionCard";
import { usePageTitle } from "../components/usePageTitle";
import { SECTIONS, sectionOf, type Section } from "../../shared/catalog";

/** Older links used ?cat=<category> and ?online=1; map them onto the three sections. */
function sectionParam(params: URLSearchParams): Section | "" {
  if (params.get("online") === "1") return "online";
  const cat = params.get("cat") ?? "";
  if ((SECTIONS as readonly string[]).includes(cat)) return cat as Section;
  if (cat === "healing") return "massage";
  if (cat) return "yoga";
  return "";
}

function Grid({ list }: { list: PublicSession[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((s) => (
        <SessionCard key={s.id} s={s} />
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
  const active = sectionParam(params);

  const by = (sec: Section) => (sessions ?? []).filter((s) => sectionOf(s) === sec);
  const count = (sec: Section) => by(sec).length;

  const tab = (value: Section | "", label: string, n?: number) => (
    <button
      key={value || "all"}
      type="button"
      role="tab"
      aria-selected={active === value}
      onClick={() => setParams(value ? { cat: value } : {}, { replace: true })}
      className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
        active === value ? "border-saffron bg-saffron text-linen" : "border-forest/20 text-forest hover:border-saffron hover:text-saffron"
      }`}
    >
      {value === "online" && <span className={`h-2 w-2 rounded-full ${active === value ? "bg-linen" : "bg-saffron"}`} aria-hidden />}
      {label}
      {n !== undefined && <span className={`text-xs ${active === value ? "text-linen/80" : "text-forest/45"}`}>{n}</span>}
    </button>
  );

  const empty = (
    <FadeUp>
      <div className="rounded-[2rem] bg-sand px-8 py-14 sm:px-14">
        <p className="lead max-w-xl">{a.empty}</p>
        <div className="mt-8">
          <Button href={waLink(t.mobileBar.whatsappText)}>{a.emptyCta}</Button>
        </div>
      </div>
    </FadeUp>
  );

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

        <div className="mt-12 flex flex-wrap items-center gap-2" role="tablist" aria-label={a.eyebrow}>
          {tab("", a.all)}
          {SECTIONS.map((sec) => tab(sec, a.sections[sec], sessions ? count(sec) : undefined))}
        </div>

        <div className="mt-12">
          {error ? (
            <p className="lead">{a.error}</p>
          ) : !sessions ? (
            <p className="text-forest/60" role="status">
              {a.loading}
            </p>
          ) : sessions.length === 0 ? (
            empty
          ) : active ? (
            <>
              <p className="mb-8 max-w-xl text-forest/70">{a.sectionIntro[active]}</p>
              {count(active) ? <Grid list={by(active)} /> : <p className="rounded-2xl bg-sand/70 px-6 py-8 text-forest/70">{a.sectionEmpty}</p>}
            </>
          ) : (
            <div className="space-y-20">
              {SECTIONS.filter((sec) => count(sec) > 0).map((sec) => (
                <section key={sec} aria-labelledby={`sec-${sec}`}>
                  <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-forest/10 pb-5">
                    <div>
                      <h2 id={`sec-${sec}`} className="font-display text-[clamp(2rem,3.4vw,3rem)] font-light leading-tight text-ink">
                        {a.sections[sec]}
                      </h2>
                      <p className="mt-2 max-w-xl text-forest/70">{a.sectionIntro[sec]}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setParams({ cat: sec }, { replace: true })}
                      className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-saffron hover:text-forest"
                    >
                      {a.all === "Alles" ? "Toon alle" : "Show all"} {count(sec)} <Arrow className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Grid list={by(sec)} />
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
