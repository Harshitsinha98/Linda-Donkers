import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { EMAIL, IMG, LOCATION, MAPS_URL, PHONE_DISPLAY, PHONE_TEL, ROUTES, sm, waLink } from "../data/site";
import { useIntroReady } from "../components/IntroContext";
import { Button } from "../components/Magnetic";
import { FadeUp, RevealText } from "../components/Reveal";
import { DiamondNav } from "../components/DiamondNav";
import { MassagePrices, PackageCards, Testimonials, XmasOffers } from "../components/Offers";
import { WhatsAppIcon } from "../components/MobileBar";
import { Arrow } from "../components/Arrow";
import { usePageTitle } from "../components/usePageTitle";
import { bookLink } from "../lib/booking";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Who Linda is, where, and the three actions: book a massage, book a yoga class, contact. */
function Hero() {
  const { t } = useLang();
  const h = t.home;
  const ready = useIntroReady();
  const show = (delay: number) => ({
    initial: { opacity: 0, y: 24 },
    animate: ready ? { opacity: 1, y: 0 } : undefined,
    transition: { duration: 1, delay, ease: EASE },
  });

  return (
    <section className="relative overflow-hidden pb-16 pt-32 sm:pb-24 sm:pt-40">
      <div className="container-x grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <motion.span className="eyebrow" {...show(0.2)}>
            {h.heroWhere}
          </motion.span>
          <motion.h1 className="mt-6 font-display text-[clamp(2.5rem,6.2vw,5.6rem)] font-light leading-[1.02] text-ink" {...show(0.3)}>
            {h.heroH1}
            <em className="italic-accent">{h.heroH1Accent}</em>
          </motion.h1>
          <motion.p className="lead mt-7 max-w-xl" {...show(0.45)}>
            {h.heroWho}
          </motion.p>
          <motion.ul className="mt-6 flex flex-wrap gap-2" {...show(0.55)}>
            {h.heroFacts.map((f) => (
              <li key={f} className="rounded-full bg-sand/70 px-4 py-1.5 text-sm font-medium text-forest">
                {f}
              </li>
            ))}
          </motion.ul>

          <motion.div className="mt-9 grid max-w-xl gap-3" {...show(0.65)}>
            <Link
              to={bookLink({ tab: "massage" })}
              className="group inline-flex items-center justify-center gap-3 rounded-full bg-saffron px-8 py-5 text-[0.95rem] font-bold uppercase tracking-[0.16em] text-linen shadow-[0_18px_40px_-18px_rgba(232,118,43,0.8)] transition-colors duration-300 hover:bg-forest"
              data-cursor="hover"
            >
              {t.nav.bookMassage}
              <Arrow className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                to={bookLink({ tab: "yoga" })}
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-forest px-6 py-4 text-[0.8rem] font-bold uppercase tracking-[0.16em] text-forest transition-colors hover:bg-forest hover:text-linen"
              >
                {t.nav.bookYoga}
              </Link>
              <a
                href={waLink(t.mobileBar.whatsappText)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-forest px-6 py-4 text-[0.8rem] font-bold uppercase tracking-[0.16em] text-forest transition-colors hover:bg-forest hover:text-linen"
              >
                <WhatsAppIcon className="h-4 w-4" /> {h.ctaContact}
              </a>
            </div>
            <p className="text-sm text-forest/60">
              <a href={`mailto:${EMAIL}`} className="underline decoration-forest/30 underline-offset-4 hover:text-saffron">
                {EMAIL}
              </a>{" "}
              ·{" "}
              <a href={PHONE_TEL} className="underline decoration-forest/30 underline-offset-4 hover:text-saffron">
                {PHONE_DISPLAY}
              </a>
            </p>
          </motion.div>
        </div>

        <motion.div
          className="relative mx-auto w-full max-w-md lg:col-span-5"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={ready ? { opacity: 1, scale: 1 } : undefined}
          transition={{ duration: 1.4, delay: 0.4, ease: EASE }}
        >
          <div className="aspect-[4/5] overflow-hidden rounded-[2rem] bg-sand">
            <img
              src={sm(IMG.portrait)}
              srcSet={`${sm(IMG.portrait)} 720w, ${IMG.portrait} 1200w`}
              sizes="(min-width:1024px) 34vw, 90vw"
              alt="Linda Donkers"
              fetchPriority="high"
              className="h-full w-full object-cover object-[50%_38%]"
            />
          </div>
          <div className="absolute -bottom-5 -left-4 w-[46%] overflow-hidden rounded-[1.4rem] border-[6px] border-cream shadow-xl sm:-left-8">
            <img src={sm(IMG.lomi1)} alt="Lomi Lomi Nui massage" loading="lazy" className="aspect-square w-full object-cover object-[50%_32%]" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Massages() {
  const { t } = useLang();
  const h = t.home;
  const m = t.massage;
  return (
    <section className="relative bg-forest py-20 text-linen sm:py-28" aria-labelledby="massages-title">
      <div className="container-x grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <FadeUp>
            <span className="eyebrow text-saffron-soft">{h.massagesEyebrow}</span>
          </FadeUp>
          <h2 id="massages-title" className="display-lg mt-5 text-linen">
            <RevealText text={h.massagesTitle} />
            <RevealText text={h.massagesAccent} className="italic-accent text-saffron-soft" delay={0.15} />
          </h2>
          <FadeUp delay={0.1}>
            <p className="mt-5 max-w-md text-linen/75">{m.pricesNote}</p>
            <div className="mt-6 max-w-md text-linen">
              <MassagePrices light />
            </div>
            <div className="mt-8">
              <Button to={bookLink({ tab: "massage" })}>{t.nav.bookMassage}</Button>
            </div>
          </FadeUp>
        </div>
        <div className="grid gap-4 lg:col-span-7">
          {m.treatments.map((tr, i) => (
            <FadeUp key={tr.key} delay={i * 0.06}>
              <Link
                to={bookLink({ tab: "massage", treatment: tr.key })}
                className="group flex items-start justify-between gap-6 rounded-[1.6rem] border border-linen/15 p-6 transition-colors hover:border-saffron-soft hover:bg-linen/5"
              >
                <span>
                  <span className="block font-display text-2xl font-light sm:text-3xl">{tr.name}</span>
                  <span className="mt-1 block text-sm text-linen/60">{tr.sub}</span>
                  <span className="mt-3 block text-[0.95rem] text-linen/75">{tr.benefits.slice(0, 3).join(" · ")}</span>
                </span>
                <span className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full border border-linen/25 transition-colors group-hover:border-saffron group-hover:bg-saffron">
                  <Arrow className="h-4 w-4" />
                </span>
              </Link>
            </FadeUp>
          ))}
          <Link to={ROUTES.massage} className="mt-2 inline-flex items-center gap-2 self-start font-semibold text-saffron-soft hover:text-linen">
            {h.massagesMore} <Arrow className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Online() {
  const { t } = useLang();
  const h = t.home;
  return (
    <section className="py-6">
      <div className="container-x">
        <FadeUp>
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-[2rem] bg-lavender px-7 py-8 text-aubergine sm:px-10">
            <div className="max-w-2xl">
              <p className="font-display text-2xl">{h.onlineTitle}</p>
              <p className="mt-1 text-aubergine/75">{h.onlineText}</p>
            </div>
            <Button to={bookLink({ tab: "online" })} variant="violet">
              {h.onlineCta}
            </Button>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function Offer() {
  const { t } = useLang();
  const h = t.home;
  return (
    <section className="py-20 sm:py-24" aria-label={h.offerEyebrow}>
      <div className="container-x">
        <PackageCards only="p3" />
        <div className="mt-6">
          <Link to={ROUTES.offers} className="inline-flex items-center gap-2 font-semibold text-forest hover:text-saffron">
            {h.offerAll} <Arrow className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Location() {
  const { t } = useLang();
  const h = t.home;
  const btn =
    "inline-flex items-center justify-center gap-2 rounded-full border-2 border-forest px-6 py-4 text-[0.8rem] font-bold uppercase tracking-[0.14em] text-forest transition-colors hover:bg-forest hover:text-linen";
  return (
    <section className="border-t border-forest/10 py-20 sm:py-28" aria-labelledby="location-title">
      <div className="container-x grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <FadeUp>
            <span className="eyebrow">{h.locationEyebrow}</span>
          </FadeUp>
          <h2 id="location-title" className="display-lg mt-5 text-ink">
            <RevealText text={h.locationTitle} />
            <RevealText text={h.locationAccent} className="italic-accent" delay={0.15} />
          </h2>
          <FadeUp delay={0.1}>
            <p className="lead mt-5 max-w-lg">{h.locationText}</p>
            <p className="mt-6 font-display text-2xl text-ink">{LOCATION}</p>
            <a href={MAPS_URL} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 font-semibold text-forest underline decoration-forest/30 underline-offset-4 hover:text-saffron">
              {h.locationMap} <Arrow dir="up-right" className="h-4 w-4" />
            </a>
          </FadeUp>
        </div>
        <FadeUp delay={0.15} className="lg:col-span-5 lg:col-start-8">
          <div className="grid gap-3">
            <a href={waLink(t.mobileBar.whatsappText)} target="_blank" rel="noreferrer" className={`${btn} border-[#25d366] bg-[#25d366] text-white hover:border-forest`}>
              <WhatsAppIcon className="h-5 w-5" /> WhatsApp {PHONE_DISPLAY}
            </a>
            <a href={`mailto:${EMAIL}`} className={btn}>
              {EMAIL}
            </a>
            <a href={PHONE_TEL} className={btn}>
              {h.call} {PHONE_DISPLAY}
            </a>
            <Link to={ROUTES.contact} className="mt-1 text-center text-sm font-semibold text-forest/70 underline underline-offset-4 hover:text-saffron">
              {t.nav.contact}
            </Link>
          </div>
        </FadeUp>
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
      <DiamondNav />
      <Massages />
      <Online />
      <Offer />
      <XmasOffers />
      <Testimonials />
      <Location />
    </>
  );
}
