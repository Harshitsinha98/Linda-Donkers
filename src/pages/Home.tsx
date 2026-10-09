import { Arrow } from "../components/Arrow";
import { AnimatePresence, motion, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { IMG, ROUTES, sm } from "../data/site";
import { useIntroReady } from "../components/IntroContext";
import { Button } from "../components/Magnetic";
import { FadeUp, RevealImage, RevealText } from "../components/Reveal";
import { RotatingBadge } from "../components/RotatingBadge";
import { BreathingCircle } from "../components/Breathing";
import { ScrollWords } from "../components/ScrollWords";
import { Marquee } from "../components/Marquee";
import { CtaStrip } from "../components/CtaStrip";
import { Filmstrip } from "../components/gallery/Filmstrip";
import { ParallaxFrames } from "../components/gallery/ParallaxFrames";
import { usePageTitle } from "../components/usePageTitle";

const EASE = [0.22, 1, 0.36, 1] as const;

function HeroLine({ children, delay, ready }: { children: React.ReactNode; delay: number; ready: boolean }) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span
        className="block"
        initial={{ y: "105%" }}
        animate={ready ? { y: "0%" } : undefined}
        transition={{ duration: 1.3, delay, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  );
}

function Hero() {
  const { t } = useLang();
  const ready = useIntroReady();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgScale = useTransform(scrollYProgress, [0, 1], [1, 1.18]);
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const panelRadius = useTransform(scrollYProgress, [0, 0.6], ["1.75rem", "4rem"]);
  const [l1, l2, l3, l4] = t.home.heroTitle;

  return (
    <section ref={ref} className="relative overflow-hidden pb-16 pt-28 sm:pt-36">
      <div className="container-x">
        <motion.span
          className="eyebrow"
          initial={{ opacity: 0, x: -24 }}
          animate={ready ? { opacity: 1, x: 0 } : undefined}
          transition={{ duration: 1, delay: 0.2, ease: EASE }}
        >
          {t.home.heroEyebrow}
        </motion.span>
        <h1 className="display-xl mt-5 text-ink" aria-label={t.home.heroTitle.join(" ")}>
          <HeroLine delay={0.3} ready={ready}>
            {l1} <em className="italic-accent">{l2}</em>
          </HeroLine>
        </h1>
      </div>

      {/* The "opening arms" moment: Linda's photo unfolds from the centre outward. */}
      <div className="container-x relative mt-6 sm:mt-8">
        <motion.div
          className="relative h-[52vh] min-h-[320px] overflow-hidden bg-sand sm:h-[68vh]"
          style={{ borderRadius: panelRadius }}
          initial={{ clipPath: "inset(0% 50% 0% 50%)" }}
          animate={ready ? { clipPath: "inset(0% 0% 0% 0%)" } : undefined}
          transition={{ duration: 1.8, delay: 0.55, ease: [0.76, 0, 0.24, 1] }}
        >
          <motion.img
            src={IMG.arms}
            srcSet={`${sm(IMG.arms)} 720w, ${IMG.arms} 1600w`}
            sizes="100vw"
            alt="Linda Donkers met gespreide armen bij de gong"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-[50%_35%]"
            style={{ scale: imgScale, y: imgY }}
            initial={{ filter: "blur(12px)" }}
            animate={ready ? { filter: "blur(0px)" } : undefined}
            transition={{ duration: 1.8, delay: 0.7 }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/30 via-transparent to-transparent" />
        </motion.div>

        <motion.div
          className="absolute -bottom-12 right-8 hidden sm:block lg:right-20"
          initial={{ scale: 0, rotate: -90 }}
          animate={ready ? { scale: 1, rotate: 0 } : undefined}
          transition={{ duration: 1.2, delay: 1.6, ease: EASE }}
        >
          <Link to={ROUTES.yoga} aria-label={t.home.heroCta2}>
            <RotatingBadge text="DIAMOND YOGA • 2LOVINGHANDS • " className="h-32 w-32 lg:h-40 lg:w-40" />
          </Link>
        </motion.div>
      </div>

      <div className="container-x mt-8 grid items-end gap-8 lg:mt-10 lg:grid-cols-12">
        <motion.div
          className="order-2 lg:order-1 lg:col-span-5"
          initial={{ opacity: 0, y: 30 }}
          animate={ready ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 1.1, delay: 1.3, ease: EASE }}
        >
          <p className="lead max-w-md">{t.home.heroSub}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button to={ROUTES.contact}>{t.home.heroCta}</Button>
            <Link
              to={ROUTES.yoga}
              className="group inline-flex items-center gap-2 px-2 py-3 text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-forest"
            >
              <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-1 transition-[background-size] duration-500 group-hover:bg-[length:100%_1px]">
                {t.home.heroCta2}
              </span>
            </Link>
          </div>
        </motion.div>
        <p className="display-xl order-1 text-right text-ink lg:order-2 lg:col-span-7" aria-hidden>
          <HeroLine delay={0.85} ready={ready}>
            {l3} <em className="italic-accent">{l4}</em>
          </HeroLine>
        </p>
      </div>
    </section>
  );
}

function Intro() {
  const { t } = useLang();
  return (
    <section className="relative py-28 sm:py-40">
      <div className="container-x grid items-center gap-16 lg:grid-cols-12">
        <div className="relative lg:col-span-5">
          <RevealImage
            src={IMG.portrait}
            alt="Portret van Linda Donkers"
            className="aspect-[4/5] w-[86%] rounded-[1.75rem]"
          />
          <div className="absolute -bottom-14 right-0 w-[44%] rounded-[1.4rem] bg-cream p-[6px] shadow-2xl">
            <RevealImage
              src={IMG.selflove}
              alt="Self-love meditatie"
              direction="left"
              parallax={40}
              className="aspect-[3/4] rounded-[1.1rem]"
            />
          </div>
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <FadeUp>
            <span className="eyebrow">{t.home.introEyebrow}</span>
          </FadeUp>
          <h2 className="display-lg mt-6 text-ink">
            <RevealText text={t.home.introTitle} />
            <RevealText text={t.home.introAccent} className="italic-accent" delay={0.25} />
          </h2>
          <FadeUp delay={0.2}>
            <p className="lead mt-8 max-w-xl">{t.home.introText}</p>
            <div className="mt-10">
              <Button to={ROUTES.about} variant="ghost">
                {t.home.introLink}
              </Button>
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}

const PILLAR_IMG: Record<string, string> = { yoga: IMG.twist, massage: IMG.lomi1, travel: IMG.goldenTemple };
const PILLAR_ROUTE: Record<string, string> = { yoga: ROUTES.yoga, massage: ROUTES.massage, travel: ROUTES.travel };

function Pillars() {
  const { t } = useLang();
  const [active, setActive] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 150, damping: 20 });
  const y = useSpring(my, { stiffness: 150, damping: 20 });

  const onMove = (e: React.PointerEvent) => {
    const r = listRef.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  };

  return (
    <section className="relative bg-linen py-28 sm:py-36">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <FadeUp>
              <span className="eyebrow">{t.home.pillarsEyebrow}</span>
            </FadeUp>
            <h2 className="display-lg mt-6 text-ink">
              <RevealText text={t.home.pillarsTitle} />
              <RevealText text={t.home.pillarsAccent} className="italic-accent" delay={0.2} />
            </h2>
          </div>
        </div>

        {/* Desktop: editorial list with an image that follows the cursor */}
        <div
          ref={listRef}
          className="relative mt-16 hidden lg:block"
          onPointerMove={onMove}
          onPointerLeave={() => setActive(null)}
        >
          {t.home.pillars.map((p, i) => (
            <FadeUp key={p.key} delay={i * 0.1} y={20}>
              <Link
                to={PILLAR_ROUTE[p.key]}
                onPointerEnter={() => setActive(p.key)}
                className="group grid grid-cols-12 items-center gap-6 border-t border-forest/15 py-10 last:border-b"
              >
                <span className="col-span-1 font-sans text-sm text-sage">0{i + 1}</span>
                <span className="col-span-6 font-display text-[clamp(2.4rem,4.6vw,4.6rem)] font-light leading-none text-ink transition-all duration-700 group-hover:translate-x-4 group-hover:italic group-hover:text-saffron">
                  {p.title}
                </span>
                <span className="col-span-4 text-[0.98rem] leading-relaxed text-forest/70 transition-opacity duration-500 group-hover:opacity-100">
                  {p.text}
                </span>
                <span className="col-span-1 flex justify-end">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-forest/20 transition-all duration-500 group-hover:rotate-[-45deg] group-hover:border-saffron group-hover:bg-saffron group-hover:text-linen">
                    <Arrow className="h-5 w-5" />
                  </span>
                </span>
              </Link>
            </FadeUp>
          ))}

          <motion.div className="pointer-events-none absolute left-0 top-0 z-10" style={{ x, y }}>
            <div className="relative h-72 w-56 -translate-x-1/2 -translate-y-1/2">
            <AnimatePresence>
              {active && (
                <motion.div
                  key={active}
                  className="absolute inset-0 overflow-hidden rounded-2xl shadow-2xl"
                  initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.6, rotate: 8 }}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  <img src={sm(PILLAR_IMG[active])} alt="" className="h-full w-full object-cover" />
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Mobile & tablet: cards */}
        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:hidden">
          {t.home.pillars.map((p, i) => (
            <FadeUp key={p.key} delay={i * 0.08}>
              <Link to={PILLAR_ROUTE[p.key]} className="group block">
                <RevealImage
                  src={PILLAR_IMG[p.key]}
                  alt={p.title}
                  className="aspect-[4/5] rounded-[1.5rem]"
                  parallax={30}
                />
                <div className="mt-5 flex items-baseline gap-3">
                  <span className="text-sm text-sage">0{i + 1}</span>
                  <h3 className="font-display text-3xl font-light text-ink">{p.title}</h3>
                </div>
                <p className="mt-2 text-forest/70">{p.text}</p>
                <span className="mt-3 inline-block text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-saffron">
                  {p.cta} <Arrow className="ml-1 h-4 w-4 align-[-3px]" />
                </span>
              </Link>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

function Breathe() {
  const { t } = useLang();
  return (
    <section className="relative overflow-hidden py-28 sm:py-40">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[120vmin] w-[120vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,210,191,0.55),transparent_65%)]" />
      <div className="container-x relative grid items-center gap-16 lg:grid-cols-2">
        <div className="text-center lg:text-left">
          <FadeUp>
            <span className="eyebrow">{t.home.breatheEyebrow}</span>
          </FadeUp>
          <h2 className="display-lg mt-6 text-ink">
            <RevealText text={t.home.breatheTitle} />
          </h2>
          <FadeUp delay={0.2}>
            <p className="lead mx-auto mt-6 max-w-md lg:mx-0">{t.home.breatheText}</p>
          </FadeUp>
        </div>
        <BreathingCircle />
      </div>
    </section>
  );
}

function Quote() {
  const { t } = useLang();
  return (
    <section className="relative bg-sand/50 py-28 sm:py-40">
      <div className="container-x max-w-5xl text-center">
        <span className="font-display text-7xl leading-none text-saffron">“</span>
        <ScrollWords
          text={t.home.quote}
          className="mt-2 font-display text-[clamp(2rem,5vw,4.4rem)] font-light italic leading-[1.15] text-ink"
        />
        <FadeUp>
          <p className="mt-10 text-[0.72rem] font-bold uppercase tracking-[0.34em] text-sage">— {t.home.quoteBy}</p>
        </FadeUp>
      </div>
    </section>
  );
}

function GalleryTeaser() {
  const { t } = useLang();
  return (
    <section className="relative border-t border-forest/10 py-28 sm:py-36">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div>
            <FadeUp>
              <span className="eyebrow">{t.gallery.framesEyebrow}</span>
            </FadeUp>
            <h2 className="display-lg mt-6 text-ink">
              <RevealText text={t.gallery.framesTitle} />
              <RevealText text={t.gallery.framesAccent} className="italic-accent" delay={0.2} />
            </h2>
          </div>
        </div>
        <div className="mt-16">
          <ParallaxFrames />
        </div>
        <div className="mt-14 flex justify-end">
          <Link to={ROUTES.gallery} className="group inline-flex items-center gap-2 font-semibold text-forest">
            <span className="border-b border-forest pb-0.5 transition-colors group-hover:border-saffron group-hover:text-saffron">
              {t.home.galleryCta}
            </span>
            <Arrow dir="up-right" className="h-4 w-4 transition-transform duration-500 group-hover:rotate-45" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { t } = useLang();
  usePageTitle(t.meta.home);
  return (
    <>
      <Hero />
      <Marquee items={t.home.marquee} />
      <Intro />
      <Pillars />
      <Filmstrip />
      <Breathe />
      <Quote />
      <GalleryTeaser />
      <CtaStrip />
    </>
  );
}
