import { Link } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { HEALING_PRICE_CENTS, IMG, ROUTES } from "../data/site";
import { fmtEuro } from "../lib/api";
import { bookLink } from "../lib/booking";
import { FadeUp, RevealImage, RevealText } from "../components/Reveal";
import { Button } from "../components/Magnetic";
import { XmasOffers } from "../components/Offers";
import { Arrow } from "../components/Arrow";
import { usePageTitle } from "../components/usePageTitle";

export default function Healing() {
  const { t, lang } = useLang();
  const h = t.healing;
  usePageTitle(t.meta.healing);
  const price = fmtEuro(HEALING_PRICE_CENTS, lang);

  return (
    <>
      <section className="relative overflow-hidden pb-16 pt-32 sm:pb-24 sm:pt-40">
        <div className="container-x grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <FadeUp>
              <span className="eyebrow eyebrow-violet text-violet">{h.eyebrow}</span>
            </FadeUp>
            <h1 className="mt-6 font-display text-[clamp(2.7rem,6.4vw,6rem)] font-light leading-[1] text-ink">
              <RevealText text={h.title} immediate delay={0.2} />
              <RevealText text={h.accent} immediate delay={0.35} className="italic-accent text-violet" />
            </h1>
            <FadeUp delay={0.3}>
              <p className="lead mt-7 max-w-xl">{h.intro}</p>
              <ul className="mt-8 max-w-md divide-y divide-forest/10 border-y border-forest/10">
                {[
                  [h.live, false],
                  [h.online, true],
                ].map(([label, online]) => (
                  <li key={String(label)}>
                    <Link
                      to={bookLink({ tab: "healing", treatment: "satnam", online: online as boolean })}
                      className="group flex items-baseline justify-between gap-4 py-3.5 hover:text-saffron"
                    >
                      <span>
                        {label} · {h.duration}
                      </span>
                      <span className="flex items-baseline gap-3">
                        <span className="font-display text-3xl">{price}</span>
                        <Arrow className="h-4 w-4 opacity-40 group-hover:opacity-100" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-4">
                <Button to={bookLink({ tab: "healing", treatment: "satnam", online: false })}>{h.bookLive}</Button>
                <Button to={bookLink({ tab: "healing", treatment: "satnam", online: true })} variant="violet">
                  {h.bookOnline}
                </Button>
              </div>
            </FadeUp>
          </div>
          <div className="lg:col-span-5">
            <RevealImage src={IMG.selflove} alt="Sat Nam Rasayan" className="aspect-[4/5] rounded-[2rem]" />
          </div>
        </div>
      </section>

      <section className="border-t border-forest/10 py-20 sm:py-28">
        <div className="container-x grid gap-10 lg:grid-cols-2">
          <FadeUp>
            <div className="rounded-[2rem] bg-lavender p-8 text-aubergine sm:p-10">
              <h2 className="font-display text-3xl font-light">{h.benefitsTitle}</h2>
              <ul className="mt-6 grid gap-3">
                {h.benefits.map((x) => (
                  <li key={x} className="flex items-start gap-3">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rotate-45 bg-violet" />
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          </FadeUp>
          <FadeUp delay={0.1}>
            <div className="p-2 sm:p-4">
              <h2 className="font-display text-3xl font-light text-ink">{h.howTitle}</h2>
              <p className="lead mt-4">{h.howText}</p>
              <div className="mt-8 rounded-[1.6rem] bg-linen p-6">
                <p className="font-display text-2xl text-ink">{h.giftTitle}</p>
                <p className="mt-2 text-forest/75">{h.giftText}</p>
                <Link to={`${ROUTES.gift}?amount=${HEALING_PRICE_CENTS}`} className="mt-4 inline-flex items-center gap-2 font-semibold text-forest hover:text-saffron">
                  {h.giftCta} <Arrow className="h-4 w-4" />
                </Link>
              </div>
              <p className="mt-6 text-forest/75">
                {h.packageText}{" "}
                <Link to={ROUTES.offers} className="font-semibold text-forest underline underline-offset-4 hover:text-saffron">
                  {h.packageCta}
                </Link>
              </p>
            </div>
          </FadeUp>
        </div>
      </section>

      <XmasOffers />
    </>
  );
}
