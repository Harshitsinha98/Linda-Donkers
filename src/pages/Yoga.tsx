import { motion } from "framer-motion";
import { useLang } from "../i18n/LanguageContext";
import { Link } from "react-router-dom";
import { IMG, ROUTES, YOUTUBE, sm } from "../data/site";
import { planFor, planLink, usePlans } from "../lib/api";
import { Arrow } from "../components/Arrow";
import { PageHero } from "../components/PageHero";
import { FadeUp, RevealImage, RevealText } from "../components/Reveal";
import { Gong } from "../components/Gong";
import { Button } from "../components/Magnetic";
import { Marquee } from "../components/Marquee";
import { CtaStrip } from "../components/CtaStrip";
import { usePageTitle } from "../components/usePageTitle";

/** Linda's own photo that fits each offer best. */
const OFFER_IMG: Record<string, string> = {
  group: IMG.twist,
  card: IMG.happy,
  private: IMG.smile,
  onlineEn: IMG.arms,
};

const OFFER_CTA =
  "inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-forest px-5 py-3 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-linen transition-colors duration-300 hover:bg-saffron";

export default function Yoga() {
  const { t } = useLang();
  const y = t.yoga;
  usePageTitle(t.meta.yoga);
  const plans = usePlans();
  // The 10-class card is bought online: link to it on the class cards page (overview while loading or if it is missing).
  const classCardLink = planLink(planFor(plans, "yoga-group", 10));

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
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <FadeUp>
                <span className="eyebrow">{y.offerTitle}</span>
              </FadeUp>
              <FadeUp delay={0.1}>
                <p className="lead mt-6 max-w-xl">{y.offerIntro}</p>
              </FadeUp>
            </div>
            <FadeUp delay={0.15}>
              <Link to={`${ROUTES.agenda}?cat=yoga`} className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-saffron hover:text-forest">
                {y.offerNote} <Arrow className="h-4 w-4" />
              </Link>
            </FadeUp>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {y.offers.map((o, i) => {
              const cta =
                o.action === "ask" ? (
                  <Link to={classCardLink} className={OFFER_CTA}>
                    {y.askCta} <Arrow className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <Link to={`${ROUTES.agenda}?cat=yoga${o.action === "bookOnline" ? "&online=1" : ""}`} className={OFFER_CTA}>
                    {y.bookCta} <Arrow className="h-3.5 w-3.5" />
                  </Link>
                );
              return (
                <FadeUp key={o.key} delay={(i % 4) * 0.1} className="h-full">
                  <article className="group flex h-full flex-col overflow-hidden rounded-[1.6rem] border border-forest/10 bg-linen">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={sm(OFFER_IMG[o.key] ?? IMG.twist)}
                        alt={o.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-105"
                        style={{ objectPosition: o.key === "private" ? "50% 20%" : "50% 35%" }}
                      />
                      {o.mode !== "live" && (
                        <span className="absolute right-3 top-3 rounded-full bg-saffron px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-linen">
                          {o.mode === "online" ? y.onlineTag : y.alsoOnlineTag}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-sage">{o.sub}</p>
                      <h3 className="mt-2 font-display text-[1.7rem] font-light leading-tight text-ink">{o.title}</h3>
                      <div className="mt-4 flex items-baseline gap-3">
                        <span className="font-display text-3xl text-saffron">{o.price}</span>
                        <span className="text-sm text-forest/60">{o.duration}</span>
                      </div>
                      <ul className="mt-4 space-y-1.5 text-sm font-semibold text-forest">
                        {o.schedule.map((line) => (
                          <li key={line} className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-saffron" aria-hidden />
                            {line}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-4 text-sm leading-relaxed text-forest/70">{o.text}</p>
                      <div className="mt-auto pt-6">{cta}</div>
                    </div>
                  </article>
                </FadeUp>
              );
            })}
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
