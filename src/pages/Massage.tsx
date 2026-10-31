import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useLang } from "../i18n/LanguageContext";
import { Link } from "react-router-dom";
import { IMG, ROUTES, sm, waLink } from "../data/site";
import { api, useSessions, type MembershipPlan, type PublicSession } from "../lib/api";

/** Linda's own photos per treatment. M.E.R. and Chi Nei Tsang reuse her massage photos until dedicated ones exist. */
const TREATMENT_IMG: Record<string, string> = {
  mer: IMG.lomi3,
  lomi: IMG.lomi1,
  chinei: IMG.lomi2,
  satnam: IMG.selflove,
};
import { Arrow } from "../components/Arrow";
import { Button } from "../components/Magnetic";
import { PageHero } from "../components/PageHero";
import { FadeUp, RevealImage, RevealText } from "../components/Reveal";
import { ScrollWords } from "../components/ScrollWords";
import { CtaStrip } from "../components/CtaStrip";
import { usePageTitle } from "../components/usePageTitle";

/** Soft animated ocean waves, a nod to the Hawaiian roots of Lomi Lomi. */
function Waves() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x1 = useTransform(scrollYProgress, [0, 1], ["0%", "-25%"]);
  const x2 = useTransform(scrollYProgress, [0, 1], ["-25%", "0%"]);
  const wave = "M0 60 Q 150 0 300 60 T 600 60 T 900 60 T 1200 60 T 1500 60 T 1800 60 T 2100 60 T 2400 60";
  return (
    <div ref={ref} className="pointer-events-none relative h-32 overflow-hidden" aria-hidden>
      <motion.svg style={{ x: x1 }} viewBox="0 0 2400 120" preserveAspectRatio="none" className="absolute top-4 h-24 w-[200%]">
        <path d={wave} fill="none" stroke="var(--color-sage)" strokeWidth="1.5" />
      </motion.svg>
      <motion.svg style={{ x: x2 }} viewBox="0 0 2400 120" preserveAspectRatio="none" className="absolute top-10 h-24 w-[200%]">
        <path d={wave} fill="none" stroke="var(--color-saffron)" strokeWidth="1.5" opacity="0.6" />
      </motion.svg>
    </div>
  );
}

const TREATMENT_OFFERINGS: Record<string, string[]> = {
  mer: ["mer"],
  lomi: ["lomi"],
  chinei: ["chinei"],
  satnam: ["satnam-live", "satnam-online"],
};

function titleMatchesOffering(s: PublicSession, key: string): boolean {
  const title = (s.title.nl + " " + s.title.en)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (key === "mer") return /m\.?e\.?r\b|myo fascia|fascia energetic/i.test(title);
  if (key === "lomi") return /lomi lomi nui/i.test(title);
  if (key === "chinei") return /chi nei tsang|taoistic.*belly|taoistische.*buik/i.test(title);
  if (key === "satnam-live") return !s.isOnline && /sat.?nam|rasayan/i.test(title);
  if (key === "satnam-online") return s.isOnline && /sat.?nam|rasayan/i.test(title);
  return false;
}

/** Return one direct Agenda booking link per treatment offering, not one for every weekly occurrence. */
function sessionsForTreatment(list: PublicSession[] | null, key: string): PublicSession[] {
  if (!list) return [];
  const offerings = TREATMENT_OFFERINGS[key] ?? [];
  return offerings
    .map((offering) => {
      const exact = list.filter((s) => s.status === "published" && s.offering === offering);
      const fallback = list.filter((s) => s.status === "published" && !s.offering && titleMatchesOffering(s, offering));
      const candidates = exact.length ? exact : fallback;
      return candidates.sort((a, b) => {
        const mode = Number(b.bookingMode === "appointment") - Number(a.bookingMode === "appointment");
        return mode || Date.parse(a.startsAt) - Date.parse(b.startsAt);
      })[0];
    })
    .filter((s): s is PublicSession => !!s);
}

function membershipForTreatment(plans: MembershipPlan[] | null, key: string): MembershipPlan | null {
  if (!plans || (key !== "mer" && key !== "lomi")) return null;
  return plans.find((plan) => plan.status === "active" && plan.credits === 5 && plan.priceCents === 60000 && plan.scope.includes(key)) ?? null;
}

export default function Massage() {
  const { t, lang } = useLang();
  const { sessions: agendaSessions } = useSessions(200);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[] | null>(null);

  useEffect(() => {
    let active = true;
    api<{ plans: MembershipPlan[] }>("/api/memberships")
      .then((data) => active && setMembershipPlans(data.plans))
      .catch(() => active && setMembershipPlans([]));
    return () => { active = false; };
  }, []);
  const m = t.massage;
  usePageTitle(t.meta.massage);

  return (
    <>
      <PageHero eyebrow={m.eyebrow} title={m.title} accent={m.accent} intro={m.intro} image={IMG.lomi1} alt="Holistische massage door Linda" position="50% 40%" />

      <Waves />

      <section className="pb-28 pt-10 sm:pb-40">
        <div className="container-x">
          <FadeUp>
            <span className="eyebrow">{m.listTitle}</span>
          </FadeUp>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {m.treatments.map((tr, i) => (
              <FadeUp key={tr.key} delay={(i % 2) * 0.12} className="h-full">
                <article className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-forest/10 bg-linen">
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <img
                      src={sm(TREATMENT_IMG[tr.key] ?? IMG.lomi1)}
                      alt={tr.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-105"
                      style={{ objectPosition: "50% 40%" }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />
                    <span className="absolute bottom-3 left-5 font-display text-5xl font-light leading-none text-linen/90">0{i + 1}</span>
                    {tr.online && (
                      <span className="absolute right-3 top-3 rounded-full bg-saffron px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-linen">
                        {m.onlineTag}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-7 sm:p-9">
                    <h3 className="font-display text-[clamp(1.7rem,2.4vw,2.2rem)] font-light leading-tight text-ink">{tr.name}</h3>
                    {tr.sub && <p className="mt-1 font-display text-lg italic text-saffron">{tr.sub}</p>}
                    <p className="mt-4 flex items-baseline gap-3">
                      <span className="font-display text-3xl text-saffron">{tr.price}</span>
                      <span className="text-sm text-forest/60">{tr.duration}</span>
                    </p>
                    <div className="mt-5 space-y-3 text-forest/75">
                      {tr.text.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                    <div className="mt-6 flex flex-wrap gap-2">
                      {sessionsForTreatment(agendaSessions, tr.key).map((session) => (
                        <Button key={session.id} to={`${ROUTES.agenda}/${session.id}`} variant="ghost">
                          {tr.key === "satnam"
                            ? session.isOnline
                              ? (lang === "en" ? "Book online healing" : "Boek online healing")
                              : (lang === "en" ? "Book live healing" : "Boek live healing")
                            : (lang === "en" ? "Book this treatment" : "Boek deze behandeling")}
                        </Button>
                      ))}
                    </div>
                    {tr.package && (
                      <div className="mt-auto pt-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sand/70 px-5 py-4">
                          <p className="text-sm font-semibold text-forest">{tr.package}</p>
                          {membershipPlans === null ? (
                            <span className="text-xs text-forest/50">{lang === "en" ? "Loading package…" : "Pakket laden…"}</span>
                          ) : membershipForTreatment(membershipPlans, tr.key) ? (
                            <Link
                              to={ROUTES.memberships + "?plan=" + encodeURIComponent(membershipForTreatment(membershipPlans, tr.key)!.id)}
                              className="inline-flex items-center gap-1.5 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-saffron underline-offset-4 transition-colors hover:text-forest hover:underline"
                            >
                              {m.packageCta} <Arrow className="h-3.5 w-3.5" />
                            </Link>
                          ) : (
                            <a
                              href={waLink(`undefined ${tr.name}`)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-saffron underline-offset-4 hover:underline"
                            >
                              {m.packageCta} <Arrow className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              </FadeUp>
            ))}
          </div>
          <FadeUp delay={0.2}>
            <div className="mt-12 flex flex-wrap items-center gap-4">
              <Button to={`${ROUTES.agenda}?cat=massage`}>{m.bookCta}</Button>
              <Button href={waLink(m.askText)} variant="ghost">
                {m.askCta}
              </Button>
            </div>
          </FadeUp>
        </div>
      </section>

      <section className="pb-28 sm:pb-40">
        <div className="container-x">
          <FadeUp>
            <div className="relative grid items-center gap-10 overflow-hidden rounded-[2rem] bg-forest px-8 py-14 text-linen sm:px-14 lg:grid-cols-[1fr_auto]">
              <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-saffron/25 blur-3xl" aria-hidden />
              <div className="relative">
                <span className="eyebrow text-saffron-soft">{m.giftEyebrow}</span>
                <h2 className="display-md mt-5">
                  {m.giftTitle}
                  <em className="font-display italic text-saffron-soft">{m.giftAccent}</em>
                </h2>
                <p className="mt-4 max-w-xl text-linen/75">{m.giftText}</p>
              </div>
              <div className="relative">
                <Button href={waLink(m.giftWa)}>{m.giftCta}</Button>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      <section className="bg-linen py-28 sm:py-40">
        <div className="container-x grid items-center gap-8 md:grid-cols-12">
          <RevealImage src={IMG.lomi3} alt="Lomi Lomi Nui met onderarmen" className="aspect-[3/4] rounded-[1.5rem] md:col-span-4" />
          <div className="md:col-span-4 md:px-4">
            <ScrollWords text={m.quote} className="font-display text-[clamp(1.7rem,2.8vw,2.6rem)] font-light italic leading-snug text-ink" />
          </div>
          <RevealImage src={IMG.lomi2} alt="Lomi Lomi Nui behandeling" direction="right" parallax={100} className="aspect-[3/4] rounded-[1.5rem] md:col-span-4 md:mt-32" />
        </div>
      </section>

      <section className="py-28 sm:py-40">
        <div className="container-x max-w-4xl text-center">
          <FadeUp>
            <span className="eyebrow">{m.forTitle}</span>
          </FadeUp>
          <h2 className="display-md mt-8 text-ink">
            <RevealText text={m.forText} stagger={0.025} />
          </h2>
          <FadeUp delay={0.3}>
            <div className="mt-10 flex justify-center">
              <Button to={`${ROUTES.agenda}?cat=massage`}>{m.bookCta}</Button>
            </div>
          </FadeUp>
        </div>
      </section>

      <CtaStrip />
    </>
  );
}
