import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useLang } from "../i18n/LanguageContext";
import { IMG } from "../data/site";
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
      <PageHero eyebrow={m.eyebrow} title={m.title} accent={m.accent} intro={m.intro} image={IMG.lomi1} alt="Lomi Lomi Nui massage" position="50% 40%" />

      <Waves />

      <section className="pb-28 pt-10 sm:pb-40">
        <div className="container-x">
          <FadeUp>
            <span className="eyebrow">{m.whatTitle}</span>
          </FadeUp>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {m.what.map((w, i) => (
              <FadeUp key={w.title} delay={i * 0.12}>
                <div className="relative">
                  <span className="font-display text-[7rem] font-light leading-none text-sand">0{i + 1}</span>
                  <h3 className="-mt-10 font-display text-4xl font-light text-ink">{w.title}</h3>
                  <p className="mt-4 text-forest/70">{w.text}</p>
                </div>
              </FadeUp>
            ))}
          </div>
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
            <p className="mt-10 text-sm font-semibold uppercase tracking-[0.16em] text-saffron">{m.note}</p>
          </FadeUp>
        </div>
      </section>

      <CtaStrip />
    </>
  );
}
