import { motion } from "framer-motion";
import { useLang } from "../i18n/LanguageContext";
import { IMG } from "../data/site";
import { PageHero } from "../components/PageHero";
import { FadeUp, RevealImage, RevealText } from "../components/Reveal";
import { LogoMark } from "../components/Logo";
import { CtaStrip } from "../components/CtaStrip";
import { usePageTitle } from "../components/usePageTitle";

export default function About() {
  const { t } = useLang();
  const a = t.about;
  usePageTitle(t.meta.about);

  return (
    <>
      <PageHero eyebrow={a.eyebrow} title={a.title} accent={a.accent} intro={a.intro} image={IMG.happy} alt="Linda Donkers" position="50% 30%" />

      <section className="py-28 sm:py-40">
        <div className="container-x grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-32">
              <FadeUp>
                <span className="eyebrow">{a.storyTitle}</span>
              </FadeUp>
              <RevealImage src={IMG.twist} alt="Kundalini Yoga" className="mt-8 aspect-[3/4] rounded-[1.5rem]" />
            </div>
          </div>
          <div className="space-y-12 lg:col-span-7 lg:col-start-6">
            {a.story.map((p, i) => (
              <FadeUp key={i} delay={0.05}>
                <p
                  className={
                    i === 0
                      ? "font-display text-[clamp(1.6rem,2.8vw,2.5rem)] font-light leading-[1.3] text-ink"
                      : "lead"
                  }
                >
                  {p}
                </p>
              </FadeUp>
            ))}
            <RevealImage src={IMG.indiaPortrait} alt="Linda in India" direction="right" className="aspect-[16/11] rounded-[1.5rem]" />
          </div>
        </div>
      </section>

      <section className="bg-linen py-28 sm:py-36">
        <div className="container-x">
          <FadeUp>
            <span className="eyebrow">{a.valuesTitle}</span>
          </FadeUp>
          <div className="mt-14 grid gap-px overflow-hidden rounded-[1.75rem] bg-forest/10 md:grid-cols-3">
            {a.values.map((v, i) => (
              <FadeUp key={v.title} delay={i * 0.12} className="h-full">
                <div className="group h-full bg-linen p-10 transition-colors duration-700 hover:bg-forest sm:p-12">
                  <span className="font-sans text-sm text-saffron">0{i + 1}</span>
                  <h3 className="mt-10 font-display text-4xl font-light text-ink transition-colors duration-700 group-hover:text-linen">
                    {v.title}
                  </h3>
                  <p className="mt-4 text-forest/70 transition-colors duration-700 group-hover:text-linen/70">{v.text}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-ink py-28 text-linen sm:py-40">
        <div className="container-x grid items-center gap-16 lg:grid-cols-2">
          <motion.div
            className="mx-auto"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div animate={{ y: [0, -14, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
              <LogoMark draw className="h-64 w-64 text-linen sm:h-80 sm:w-80" strokeWidth={1.6} />
            </motion.div>
          </motion.div>
          <div>
            <FadeUp>
              <span className="eyebrow">{a.symbolTitle}</span>
            </FadeUp>
            <h2 className="display-md mt-6">
              <RevealText text={a.symbolText} stagger={0.025} />
            </h2>
          </div>
        </div>
      </section>

      <CtaStrip />
    </>
  );
}
