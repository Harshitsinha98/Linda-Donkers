import { motion } from "framer-motion";
import { useLang } from "../i18n/LanguageContext";
import { IMG, YOUTUBE } from "../data/site";
import { PageHero } from "../components/PageHero";
import { FadeUp, RevealImage, RevealText } from "../components/Reveal";
import { Gong } from "../components/Gong";
import { Button } from "../components/Magnetic";
import { Marquee } from "../components/Marquee";
import { CtaStrip } from "../components/CtaStrip";
import { usePageTitle } from "../components/usePageTitle";

export default function Yoga() {
  const { t } = useLang();
  const y = t.yoga;
  usePageTitle(t.meta.yoga);

  return (
    <>
      <PageHero eyebrow={y.eyebrow} title={y.title} accent={y.accent} intro={y.intro} image={IMG.smile} alt="Kundalini Yoga met Linda" position="50% 0%" />

      <section className="py-28 sm:py-40">
        <div className="container-x">
          <FadeUp>
            <span className="eyebrow">{y.elementsTitle}</span>
          </FadeUp>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {y.elements.map((el, i) => (
              <motion.div
                key={el.title}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ duration: 1, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -8 }}
                className="group relative flex min-h-[260px] flex-col overflow-hidden rounded-[1.5rem] border border-forest/10 bg-linen p-8"
              >
                <span className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sage-soft/50 transition-transform duration-700 group-hover:scale-[4]" />
                <span className="relative mb-12 font-display text-5xl font-light text-saffron">0{i + 1}</span>
                <div className="relative">
                  <h3 className="font-display text-2xl text-ink">{el.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-forest/75">{el.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-linen py-28 sm:py-40">
        <div className="container-x grid items-center gap-20 lg:grid-cols-2">
          <Gong hint={y.gongHint} />
          <div>
            <h2 className="display-lg text-ink">
              <RevealText text={y.gongTitle} />
              <RevealText text={y.gongAccent} className="italic-accent" delay={0.2} />
            </h2>
            <FadeUp delay={0.2}>
              <p className="lead mt-8 max-w-lg">{y.gongText}</p>
            </FadeUp>
            <RevealImage src={IMG.arms} alt="Linda bij de gong" direction="left" className="mt-12 aspect-[16/10] rounded-[1.5rem]" />
          </div>
        </div>
      </section>

      <Marquee items={t.home.marquee} dark />

      <section className="py-28 sm:py-40">
        <div className="container-x">
          <div className="grid gap-16 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <FadeUp>
                <span className="eyebrow">{y.offerTitle}</span>
              </FadeUp>
              <RevealImage src={IMG.selflove} alt="Meditatie" className="mt-8 aspect-[4/5] rounded-[1.5rem]" />
            </div>
            <div className="flex flex-col justify-center lg:col-span-6 lg:col-start-7">
              {y.offers.map((o, i) => (
                <FadeUp key={o.title} delay={i * 0.1}>
                  <div className="group border-t border-forest/15 py-9 last:border-b">
                    <div className="flex items-baseline justify-between gap-6">
                      <h3 className="font-display text-[clamp(1.9rem,3vw,2.8rem)] font-light text-ink transition-all duration-500 group-hover:italic group-hover:text-saffron">
                        {o.title}
                      </h3>
                      <span className="text-sm text-sage">0{i + 1}</span>
                    </div>
                    <p className="mt-3 max-w-md text-forest/70">{o.text}</p>
                  </div>
                </FadeUp>
              ))}
              <FadeUp>
                <p className="mt-8 text-sm font-semibold uppercase tracking-[0.16em] text-saffron">{y.offerNote}</p>
              </FadeUp>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-28 sm:pb-40">
        <div className="container-x">
          <FadeUp>
            <div className="relative overflow-hidden rounded-[2rem] bg-sand px-8 py-16 sm:px-16 sm:py-20">
              <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-saffron/20 blur-3xl" />
              <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_auto]">
                <div>
                  <span className="inline-flex h-12 w-16 items-center justify-center rounded-xl bg-[#ff0033] text-linen" aria-hidden>
                    ▶
                  </span>
                  <h2 className="display-md mt-6 text-ink">{y.youtubeTitle}</h2>
                  <p className="lead mt-4 max-w-xl">{y.youtubeText}</p>
                </div>
                <Button href={YOUTUBE}>{y.youtubeCta}</Button>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      <CtaStrip />
    </>
  );
}
