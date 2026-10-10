import { motion } from "framer-motion";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { waLink } from "../data/site";
import { useSessions } from "../lib/api";
import { FadeUp, RevealText } from "../components/Reveal";
import { Button } from "../components/Magnetic";
import { SessionCard } from "../components/sessions/SessionCard";
import { usePageTitle } from "../components/usePageTitle";

export default function Agenda() {
  const { t } = useLang();
  const a = t.agenda;
  usePageTitle(t.meta.agenda);
  const { sessions, error } = useSessions(200);
  const [params, setParams] = useSearchParams();
  const cat = params.get("cat") ?? "";

  const categories = useMemo(() => [...new Set((sessions ?? []).map((s) => s.category))], [sessions]);
  const shown = (sessions ?? []).filter((s) => !cat || s.category === cat);

  const chip = (value: string, label: string) => (
    <button
      key={value || "all"}
      type="button"
      onClick={() => setParams(value ? { cat: value } : {}, { replace: true })}
      aria-pressed={cat === value}
      className={`rounded-full border px-4 py-2 text-sm transition-all duration-300 ${
        cat === value ? "border-saffron bg-saffron text-linen" : "border-forest/20 text-forest hover:border-saffron hover:text-saffron"
      }`}
    >
      {label}
    </button>
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

        {categories.length > 1 && (
          <div className="mt-12 flex flex-wrap gap-2">
            {chip("", a.all)}
            {categories.map((c) => chip(c, t.categories[c] ?? t.categories.other))}
          </div>
        )}

        <div className="mt-12">
          {error ? (
            <p className="lead">{a.error}</p>
          ) : !sessions ? (
            <p className="text-forest/60" role="status">
              {a.loading}
            </p>
          ) : shown.length === 0 ? (
            <FadeUp>
              <div className="rounded-[2rem] bg-sand px-8 py-14 sm:px-14">
                <p className="lead max-w-xl">{a.empty}</p>
                <div className="mt-8">
                  <Button href={waLink(t.mobileBar.whatsappText)}>{a.emptyCta}</Button>
                </div>
              </div>
            </FadeUp>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((s) => (
                <SessionCard key={s.id} s={s} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
