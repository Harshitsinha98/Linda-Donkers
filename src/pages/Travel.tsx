import { Arrow } from "../components/Arrow";
import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useLang } from "../i18n/LanguageContext";
import { IMG, ROUTES, sm } from "../data/site";
import { PageHero } from "../components/PageHero";
import { FadeUp, RevealText } from "../components/Reveal";
import { Button } from "../components/Magnetic";
import { usePageTitle } from "../components/usePageTitle";

// Order matches t.travel.highlights: Ayurveda, Yoga & meditation, Temples, Connection (+ 2 extra photos).
const SLIDES = [IMG.ayurveda, IMG.heart, IMG.goldenTemple, IMG.sari, IMG.banyan, IMG.indiaPortrait];

/** Desktop: vertical scroll drives a horizontal filmstrip. Mobile: native swipe. */
function HorizontalStrip({ hint }: { hint: string }) {
  const { t } = useLang();
  const ref = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);

  useEffect(() => {
    const measure = () => {
      const el = trackRef.current;
      if (el) setDistance(Math.max(0, el.scrollWidth - window.innerWidth));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const cards = SLIDES.map((src, i) => {
    const h = t.travel.highlights[i % t.travel.highlights.length];
    return (
      <figure key={src} className="relative shrink-0">
        <div className={`overflow-hidden rounded-[1.5rem] ${i % 2 ? "h-[58vh] w-[40vh]" : "h-[66vh] w-[48vh]"} max-w-[78vw]`}>
          <img src={sm(src)} srcSet={`${sm(src)} 720w, ${src} 1600w`} sizes="50vh" alt={h.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1.6s] hover:scale-110" />
        </div>
        {i < t.travel.highlights.length && (
          <figcaption className="mt-5 max-w-[40vh]">
            <span className="text-sm text-saffron">0{i + 1}</span>
            <h3 className="mt-1 font-display text-2xl text-ink">{h.title}</h3>
            <p className="mt-1 text-sm text-forest/70">{h.text}</p>
          </figcaption>
        )}
      </figure>
    );
  });

  return (
    <>
      <section ref={ref} className="relative hidden lg:block" style={{ height: `calc(100vh + ${distance}px)` }}>
        <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
          <div className="container-x mb-8 flex items-end justify-between">
            <span className="eyebrow">{t.travel.highlightsTitle}</span>
            <span className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-forest/50">{hint} <Arrow className="ml-1 h-4 w-4 align-[-3px]" /></span>
          </div>
          <motion.div ref={trackRef} style={{ x }} className="flex items-start gap-10 pl-12 pr-[20vw]">
            {cards}
          </motion.div>
        </div>
      </section>
      <section className="py-20 lg:hidden">
        <div className="container-x mb-8 flex items-end justify-between">
          <span className="eyebrow">{t.travel.highlightsTitle}</span>
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-forest/50">{hint} <Arrow className="ml-1 h-4 w-4 align-[-3px]" /></span>
        </div>
        <div className="flex snap-x snap-mandatory gap-6 overflow-x-auto px-5 pb-6 [scrollbar-width:none]">
          {SLIDES.map((src, i) => (
            <div key={src} className="snap-start">
              {cards[i]}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default function Travel() {
  const { t } = useLang();
  const tr = t.travel;
  usePageTitle(t.meta.travel);

  return (
    <>
      <PageHero eyebrow={tr.eyebrow} title={tr.title} accent={tr.accent} intro={tr.intro} image={IMG.goldenTemple} alt="Gouden Tempel, Amritsar" position="50% 60%" />
      <HorizontalStrip hint={tr.scrollHint} />
      <section className="relative overflow-hidden bg-saffron py-28 text-linen sm:py-36">
        <div className="pointer-events-none absolute -left-32 top-1/2 h-[40rem] w-[40rem] -translate-y-1/2 rounded-full border border-linen/20" />
        <div className="pointer-events-none absolute -left-16 top-1/2 h-[28rem] w-[28rem] -translate-y-1/2 rounded-full border border-linen/20" />
        <div className="container-x relative text-center">
          <h2 className="display-lg">
            <RevealText text={tr.interestTitle} />
          </h2>
          <FadeUp delay={0.2}>
            <p className="mx-auto mt-6 max-w-md text-lg text-linen/85">{tr.interestText}</p>
            <div className="mt-10">
              <Button to={`${ROUTES.contact}?interest=3`} variant="light">
                {tr.interestCta}
              </Button>
            </div>
          </FadeUp>
        </div>
      </section>
    </>
  );
}
