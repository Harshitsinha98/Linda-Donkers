import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { LOCATION, ROUTES, waLink } from "../data/site";
import { fmtEuro, useSessions, type PublicSession } from "../lib/api";
import {
  BOOK_TABS,
  fmtDayLong,
  groupTreatments,
  tabFromParam,
  tabsOf,
  treatmentOf,
  type BookTab,
  type Treatment,
  type Variant,
} from "../lib/booking";
import { BookingCalendar, type Pick } from "../components/booking/BookingCalendar";
import { BookingDetails } from "../components/booking/BookingDetails";
import { RevealText } from "../components/Reveal";
import { Button } from "../components/Magnetic";
import { usePageTitle } from "../components/usePageTitle";

function Step({ n, title, children, id }: { n: number; title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-28 rounded-[2rem] bg-linen p-5 shadow-[0_30px_80px_-50px_rgba(46,58,47,0.35)] sm:p-8">
      <h2 className="flex items-center gap-3 font-display text-2xl font-light text-ink sm:text-3xl">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-forest font-sans text-sm font-bold text-linen">{n}</span>
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function Book() {
  const { t, lang } = useLang();
  const k = t.book;
  usePageTitle(t.meta.book);
  const { sessions, error } = useSessions(200);
  const [params, setParams] = useSearchParams();
  const detailsRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState<BookTab>(() => tabFromParam(params.get("cat") ?? "", params.get("online") === "1") || "massage");
  const [trKey, setTrKey] = useState(params.get("t") ?? "");
  const [variantKey, setVariantKey] = useState("");
  const [pick, setPick] = useState<Pick | null>(null);
  const [initDone, setInitDone] = useState(false);

  const byTab = useMemo(() => {
    const m = new Map<BookTab, Treatment[]>();
    for (const tb of BOOK_TABS) m.set(tb, groupTreatments(sessions ?? [], tb));
    return m;
  }, [sessions]);
  // Massage, Healing and Yoga are always there; Online and Events only when something is planned.
  const tabs = BOOK_TABS.filter((tb) => tb === "massage" || tb === "healing" || tb === "yoga" || (byTab.get(tb)?.length ?? 0) > 0);
  const treatments = byTab.get(tab) ?? [];
  const treatment = treatments.find((x) => x.key === trKey) ?? treatments[0] ?? null;
  const variant: Variant | null = treatment?.variants.find((v) => v.key === variantKey) ?? treatment?.variants[0] ?? null;

  // First load: apply ?id= (one exact session, e.g. from an old /agenda/:id link) or ?t=&min=&mode=.
  useEffect(() => {
    if (!sessions || initDone) return;
    setInitDone(true);
    const id = params.get("id");
    const s = id ? sessions.find((x) => x.id === id) : undefined;
    if (s) {
      const tb = tabsOf(s)[0];
      const tr = groupTreatments(sessions, tb).find((x) => x.key === treatmentOf(s));
      const v = tr?.variants.find((x) => x.sessions.some((y) => y.id === s.id));
      setTab(tb);
      if (tr) setTrKey(tr.key);
      if (v) setVariantKey(v.key);
      if (v && v.mode === "scheduled") setPick({ session: s, date: s.date, time: s.startTime });
      return;
    }
    const min = Number(params.get("min")) || 0;
    const mode = params.get("mode");
    const tr = (byTab.get(tab) ?? []).find((x) => x.key === trKey) ?? (byTab.get(tab) ?? [])[0];
    const v = tr?.variants.find((x) => (!min || x.durationMin === min) && (!mode || x.isOnline === (mode === "online")));
    if (v) setVariantKey(v.key);
  }, [sessions, initDone, params, byTab, tab, trKey]);

  // Keep the address bar in sync, so a link to this exact choice can be shared.
  useEffect(() => {
    if (!initDone) return;
    const q = new URLSearchParams();
    q.set("cat", tab);
    if (treatment) q.set("t", treatment.key);
    if (variant && treatment && treatment.variants.length > 1) {
      q.set("min", String(variant.durationMin));
      if (treatment.variants.some((v) => v.isOnline !== variant.isOnline)) q.set("mode", variant.isOnline ? "online" : "live");
    }
    setParams(q, { replace: true });
  }, [initDone, tab, treatment, variant, setParams]);

  const chooseTab = (tb: BookTab) => {
    setTab(tb);
    setTrKey("");
    setVariantKey("");
    setPick(null);
  };
  const chooseTreatment = (tr: Treatment, v?: Variant) => {
    setTrKey(tr.key);
    setVariantKey(v?.key ?? "");
    setPick(null);
  };

  const onPick = (p: Pick | null) => {
    setPick(p);
    if (p && window.innerWidth < 1024) {
      window.setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    }
  };

  const nameOf = (tr: Treatment) => k.treatments[tr.key]?.name ?? tr.title[lang];
  const subOf = (tr: Treatment) => k.treatments[tr.key]?.sub ?? "";
  const variantLabel = (tr: Treatment, v: Variant) => {
    const mixed = tr.variants.some((x) => x.isOnline !== v.isOnline);
    return [mixed ? (v.isOnline ? k.online : k.live) : "", `${v.durationMin} min`, v.priceCents > 0 ? fmtEuro(v.priceCents, lang) : t.agenda.free]
      .filter(Boolean)
      .join(" · ");
  };

  const formSession: PublicSession | null = pick?.session ?? variant?.sessions[0] ?? null;
  const withCalendar = !!variant && (variant.mode === "scheduled" || !!variant.sessions[0].availability?.enabled);
  const place = formSession ? (formSession.isOnline ? t.agenda.online : formSession.venue || LOCATION) : "";

  const summary = treatment && variant && (
    <dl className="grid gap-0 text-sm">
      {[
        [k.what, nameOf(treatment)],
        [k.duration, `${variant.durationMin} min`],
        [k.when, pick ? `${fmtDayLong(pick.date, lang)} · ${pick.time}` : withCalendar ? k.chooseTime : t.agenda.appointment],
        [k.where, place],
        [k.price, variant.priceCents > 0 ? `${fmtEuro(variant.priceCents, lang)}${variant.sessions[0].capacity > 1 ? ` ${t.agenda.perPerson}` : ""}` : t.agenda.free],
      ].map(([dt, dd]) => (
        <div key={dt} className="flex justify-between gap-4 border-b border-forest/10 py-2.5 last:border-0">
          <dt className="text-forest/60">{dt}</dt>
          <dd className="text-right font-semibold text-ink first-letter:uppercase">{dd}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <section className="relative pb-28 pt-32 sm:pb-36 sm:pt-40">
      <div className="container-x">
        <motion.span className="eyebrow" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.2 }}>
          {k.eyebrow}
        </motion.span>
        <h1 className="mt-5 font-display text-[clamp(2.4rem,6vw,5rem)] font-light leading-[1.02] text-ink">
          <RevealText text={k.title} immediate delay={0.25} />
          <RevealText text={k.accent} immediate delay={0.4} className="italic-accent" />
        </h1>
        <motion.p
          className="mt-6 max-w-2xl rounded-2xl border-l-4 border-saffron bg-linen px-5 py-4 text-[1.02rem] leading-relaxed text-forest"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          {k.howTo}
        </motion.p>

        <div className="mt-10 grid gap-6 lg:grid-cols-12 lg:gap-10">
          <div className="grid gap-6 lg:col-span-7">
            <Step n={1} title={k.step1}>
              <div role="tablist" aria-label={k.step1} className="flex flex-wrap gap-2">
                {tabs.map((tb) => (
                  <button
                    key={tb}
                    type="button"
                    role="tab"
                    aria-selected={tab === tb}
                    onClick={() => chooseTab(tb)}
                    className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors ${
                      tab === tb ? (tb === "massage" ? "border-saffron bg-saffron text-linen" : "border-forest bg-forest text-linen") : "border-forest/20 text-forest hover:border-saffron hover:text-saffron"
                    }`}
                  >
                    {k.tabs[tb]}
                  </button>
                ))}
              </div>

              <div className="mt-6 grid gap-3" role="radiogroup" aria-label={k.step1}>
                {error ? (
                  <p className="text-forest/70">{t.agenda.error}</p>
                ) : !sessions ? (
                  <p className="text-forest/60" role="status">{t.agenda.loading}</p>
                ) : treatments.length === 0 ? (
                  <div className="rounded-2xl bg-sand/60 p-6">
                    <p className="text-forest/80">{k.empty}</p>
                    <div className="mt-5">
                      <Button href={waLink(t.mobileBar.whatsappText)}>{t.agenda.emptyCta}</Button>
                    </div>
                  </div>
                ) : (
                  treatments.map((tr) => {
                    const on = treatment?.key === tr.key;
                    return (
                      <div
                        key={tr.key}
                        role="radio"
                        aria-checked={on}
                        tabIndex={0}
                        onClick={() => !on && chooseTreatment(tr)}
                        onKeyDown={(e) => {
                          if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
                            e.preventDefault();
                            if (!on) chooseTreatment(tr);
                          }
                        }}
                        className={`cursor-pointer rounded-2xl border-2 px-5 py-4 transition-colors ${on ? "border-forest bg-cream" : "border-forest/10 hover:border-forest/30"}`}
                      >
                        <p className="font-semibold text-ink">{nameOf(tr)}</p>
                        {subOf(tr) && <p className="text-sm text-forest/65">{subOf(tr)}</p>}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {tr.variants.map((v) => {
                            const vOn = on && variant?.key === v.key;
                            return (
                              <button
                                key={v.key}
                                type="button"
                                aria-pressed={vOn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!vOn) chooseTreatment(tr, v);
                                }}
                                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                                  vOn ? "border-forest bg-forest text-linen" : "border-forest/20 bg-linen text-forest hover:border-saffron"
                                }`}
                              >
                                {variantLabel(tr, v)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Step>

            {variant && (
              <Step n={2} title={k.step2}>
                {withCalendar ? (
                  <BookingCalendar variant={variant} selected={pick} onSelect={onPick} />
                ) : (
                  <p className="rounded-2xl bg-sand/60 px-5 py-4 text-forest/80">{k.noCalendar}</p>
                )}
              </Step>
            )}

            {variant && formSession && (
              <div ref={detailsRef} className="scroll-mt-28">
                <Step n={3} title={k.step3}>
                  <div className="mb-6 rounded-2xl bg-cream/70 px-4 py-1 lg:hidden">{summary}</div>
                  <BookingDetails s={formSession} pick={pick ? { date: pick.date, time: pick.time } : null} />
                </Step>
              </div>
            )}
          </div>

          <aside className="hidden lg:col-span-5 lg:block">
            <div className="sticky top-28 grid gap-5">
              {summary && (
                <div className="rounded-[2rem] bg-linen p-7 shadow-[0_30px_80px_-50px_rgba(46,58,47,0.35)]">
                  <p className="font-display text-2xl font-light text-ink">{k.summaryTitle}</p>
                  <div className="mt-4">{summary}</div>
                </div>
              )}
              <div className="rounded-[2rem] bg-sand/60 p-7 text-sm text-forest">
                <p className="font-semibold">{k.question}</p>
                <a href={waLink(t.mobileBar.whatsappText)} target="_blank" rel="noreferrer" className="mt-1 inline-block underline underline-offset-4 hover:text-saffron">
                  {k.whatsapp}
                </a>
                <p className="mt-5 font-semibold">{k.packagesNote}</p>
                <Link to={ROUTES.offers} className="mt-1 inline-block underline underline-offset-4 hover:text-saffron">
                  {k.packagesCta}
                </Link>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-8 rounded-[2rem] bg-sand/60 p-6 text-sm text-forest lg:hidden">
          <p className="font-semibold">{k.question}</p>
          <a href={waLink(t.mobileBar.whatsappText)} target="_blank" rel="noreferrer" className="mt-1 inline-block underline underline-offset-4">
            {k.whatsapp}
          </a>
          <p className="mt-4 font-semibold">{k.packagesNote}</p>
          <Link to={ROUTES.offers} className="mt-1 inline-block underline underline-offset-4">
            {k.packagesCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
