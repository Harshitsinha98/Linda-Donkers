import { Link } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { IMG, MASSAGE_PRICES, ROUTES, sm, waLink } from "../data/site";
import { fmtEuro } from "../lib/api";
import { bookLink } from "../lib/booking";
import { FadeUp, RevealImage, RevealText } from "../components/Reveal";
import { Button } from "../components/Magnetic";
import { MassagePrices, PackageCards, Testimonials, XmasOffers } from "../components/Offers";
import { Arrow } from "../components/Arrow";
import { usePageTitle } from "../components/usePageTitle";

const PHOTO: Record<string, { src: string; pos: string }> = {
  lomi: { src: IMG.lomi1, pos: "50% 32%" },
  mer: { src: IMG.lomi3, pos: "50% 22%" },
  chinei: { src: IMG.lomi2, pos: "50% 30%" },
};

export default function Massage() {
  const { t, lang } = useLang();
  const m = t.massage;
  usePageTitle(t.meta.massage);

  return (
    <>
      <section className="relative overflow-hidden pb-16 pt-32 sm:pb-24 sm:pt-40">
        <div className="container-x grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <FadeUp>
              <span className="eyebrow">{m.eyebrow}</span>
            </FadeUp>
            <h1 className="mt-6 font-display text-[clamp(2.7rem,6.4vw,6rem)] font-light leading-[1] text-ink">
              <RevealText text={m.title} immediate delay={0.2} />
              <RevealText text={m.accent} immediate delay={0.35} className="italic-accent" />
            </h1>
            <FadeUp delay={0.3}>
              <p className="lead mt-7 max-w-xl">{m.intro}</p>
              <div className="mt-8 max-w-md">
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-sage">{m.pricesTitle}</p>
                <div className="mt-3 text-ink">
                  <MassagePrices />
                </div>
                <p className="mt-2 text-sm text-forest/60">{m.pricesNote}</p>
              </div>
              <div className="mt-8 flex flex-wrap gap-4">
                <Button to={bookLink({ tab: "massage" })}>{m.bookCta}</Button>
                <Button href={waLink(m.askText)} variant="ghost">
                  {m.askCta}
                </Button>
              </div>
            </FadeUp>
          </div>
          <div className="lg:col-span-5">
            <RevealImage src={IMG.lomi1} alt="Lomi Lomi Nui" className="aspect-[4/5] rounded-[2rem]" />
          </div>
        </div>
      </section>

      <section className="border-t border-forest/10 py-20 sm:py-28" aria-labelledby="treatments-title">
        <div className="container-x">
          <h2 id="treatments-title" className="display-lg text-ink">
            <RevealText text={m.listTitle} />
            <RevealText text={m.listAccent} className="italic-accent" delay={0.15} />
          </h2>
          <div className="mt-12 grid gap-8">
            {m.treatments.map((tr, i) => (
              <FadeUp key={tr.key} delay={0.05}>
                <article id={tr.key} className="grid scroll-mt-28 gap-8 rounded-[2rem] bg-linen p-6 sm:p-9 md:grid-cols-12">
                  <div className={`overflow-hidden rounded-[1.5rem] md:col-span-4 ${i % 2 ? "md:order-2" : ""}`}>
                    <img
                      src={sm(PHOTO[tr.key].src)}
                      alt={tr.name}
                      loading="lazy"
                      style={{ objectPosition: PHOTO[tr.key].pos }}
                      className="aspect-[4/3] h-full w-full object-cover md:aspect-auto"
                    />
                  </div>
                  <div className="md:col-span-8">
                    <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-saffron">{tr.sub}</p>
                    <h3 className="mt-2 font-display text-[clamp(1.8rem,3.4vw,2.8rem)] font-light leading-tight text-ink">{tr.name}</h3>
                    {tr.text.map((p) => (
                      <p key={p} className="mt-3 text-forest/80">
                        {p}
                      </p>
                    ))}
                    <p className="mt-6 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-sage">{m.benefitsTitle}</p>
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      {tr.benefits.map((x) => (
                        <li key={x} className="flex items-start gap-2 text-forest">
                          <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rotate-45 bg-saffron" />
                          {x}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-7 flex flex-wrap gap-3">
                      {MASSAGE_PRICES.map((p, j) => (
                        <Link
                          key={p.minutes}
                          to={bookLink({ tab: "massage", treatment: tr.key, min: p.minutes })}
                          className={`inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[0.8rem] font-bold uppercase tracking-[0.14em] transition-colors ${
                            j === 0 ? "bg-saffron text-linen hover:bg-forest" : "border-2 border-forest text-forest hover:bg-forest hover:text-linen"
                          }`}
                        >
                          {m.bookWith(p.minutes, fmtEuro(p.cents, lang))}
                        </Link>
                      ))}
                    </div>
                  </div>
                </article>
              </FadeUp>
            ))}

            <FadeUp>
              <div className="flex flex-wrap items-center justify-between gap-6 rounded-[2rem] bg-lavender px-7 py-8 text-aubergine sm:px-10">
                <div className="max-w-xl">
                  <p className="font-display text-2xl">{m.healingTitle}</p>
                  <p className="mt-1 text-aubergine/75">{m.healingText}</p>
                </div>
                <Button to={ROUTES.healing} variant="violet">
                  {m.healingCta}
                </Button>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      <section className="bg-sand/40 py-20 sm:py-28" aria-labelledby="packages-title">
        <div className="container-x">
          <h2 id="packages-title" className="display-lg text-ink">
            <RevealText text={t.offers.packagesTitle} />
            <RevealText text={t.offers.packagesAccent} className="italic-accent" delay={0.15} />
          </h2>
          <div className="mt-10">
            <PackageCards />
          </div>
          <Link to={ROUTES.offers} className="mt-6 inline-flex items-center gap-2 font-semibold text-forest hover:text-saffron">
            {t.home.offerAll} <Arrow className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <XmasOffers />
      <Testimonials />

      <section className="py-20 sm:py-28">
        <div className="container-x grid gap-10 lg:grid-cols-2">
          <FadeUp>
            <div>
              <h2 className="display-md text-ink">{m.forTitle}</h2>
              <p className="lead mt-4 max-w-lg">{m.forText}</p>
              <p className="mt-8 max-w-lg font-display text-2xl font-light italic text-forest">“{m.quote}”</p>
            </div>
          </FadeUp>
          <FadeUp delay={0.1}>
            <div className="rounded-[2rem] bg-forest p-8 text-linen sm:p-10">
              <span className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-saffron-soft">{m.giftEyebrow}</span>
              <p className="mt-3 font-display text-3xl font-light">
                {m.giftTitle}
                <em className="italic-accent text-saffron-soft">{m.giftAccent}</em>
              </p>
              <p className="mt-3 text-linen/75">{m.giftText}</p>
              <div className="mt-7">
                <Button to={ROUTES.gift} variant="light">
                  {m.giftCta}
                </Button>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>
    </>
  );
}
