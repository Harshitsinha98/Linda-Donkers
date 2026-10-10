import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useLang } from "../i18n/LanguageContext";
import { IMG, ROUTES, waLink } from "../data/site";
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

export default function Massage() {
  const { t } = useLang();
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
                <article className="relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-forest/10 bg-linen p-7 sm:p-9">
                  <span className="pointer-events-none absolute -right-2 -top-6 font-display text-[7rem] font-light leading-none text-sand">0{i + 1}</span>
                  <div className="relative flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-forest px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-linen">{tr.duration}</span>
                    {tr.online && (
                      <span className="rounded-full border border-saffron px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-saffron">{m.onlineTag}</span>
                    )}
                  </div>
                  <h3 className="relative mt-6 font-display text-[clamp(1.8rem,2.6vw,2.4rem)] font-light leading-tight text-ink">{tr.name}</h3>
                  {tr.sub && <p className="relative mt-1 font-display text-lg italic text-saffron">{tr.sub}</p>}
                  <div className="relative mt-5 space-y-3 text-forest/75">
                    {tr.text.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
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
