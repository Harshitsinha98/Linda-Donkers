import { Link } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { IMG, ROUTES, sm } from "../data/site";
import { fmtEuro, photoFocus, photoSrc, planFor, planLink, usePlans } from "../lib/api";
import { Arrow } from "./Arrow";
import { FadeUp, RevealText } from "./Reveal";

const CTA =
  "inline-flex items-center gap-2 rounded-full text-center px-5 py-3 text-[0.72rem] font-bold uppercase tracking-[0.14em] transition-colors duration-300";

/** Home page: class cards (beurtenkaarten) and gift cards side by side. */
export function CardsAndGifts() {
  const { t, lang } = useLang();
  const h = t.home;
  const plans = usePlans();
  const yogaCard = planFor(plans, "yoga-group", 10);
  const cheapest = (plans ?? []).filter((p) => p.status === "active").sort((a, b) => a.priceCents - b.priceCents)[0];
  const cardPhoto = yogaCard?.photo || "waterfall";

  return (
    <section className="relative bg-linen py-24 sm:py-32" aria-labelledby="cards-title">
      <div className="container-x">
        <div className="max-w-2xl">
          <FadeUp>
            <span className="eyebrow">{h.cardsEyebrow}</span>
          </FadeUp>
          <h2 id="cards-title" className="display-lg mt-6 text-ink">
            <RevealText text={h.cardsTitle} />
            <RevealText text={h.cardsAccent} className="italic-accent" delay={0.2} />
          </h2>
          <FadeUp delay={0.15}>
            <p className="lead mt-5">{h.cardsText}</p>
          </FadeUp>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2 [&>*]:min-w-0">
          <FadeUp className="h-full">
            <article className="flex h-full flex-col overflow-hidden rounded-[1.6rem] border border-forest/10 bg-cream">
              <div className="relative aspect-[16/9] overflow-hidden">
                <img
                  src={sm(photoSrc(cardPhoto))}
                  srcSet={`${sm(photoSrc(cardPhoto))} 720w, ${photoSrc(cardPhoto)} 1600w`}
                  sizes="(min-width:1024px) 50vw, 100vw"
                  alt=""
                  loading="lazy"
                  style={{ objectPosition: photoFocus(cardPhoto) }}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col p-6 sm:p-8">
                <h3 className="font-display text-3xl font-light text-ink">{h.classCardTitle}</h3>
                {cheapest && <p className="mt-1 text-sm font-bold uppercase tracking-[0.14em] text-saffron">{h.classCardFrom(fmtEuro(cheapest.priceCents, lang))}</p>}
                <p className="mt-3 text-forest/75">{h.classCardText}</p>
                <div className="mt-auto flex flex-wrap gap-3 pt-6">
                  <Link to={yogaCard ? planLink(yogaCard) : ROUTES.memberships} className={`${CTA} bg-forest text-linen hover:bg-saffron`}>
                    {yogaCard ? t.yoga.askCta : h.classCardCta} <Arrow className="h-3.5 w-3.5" />
                  </Link>
                  {yogaCard && (
                    <Link to={ROUTES.memberships} className={`${CTA} border border-forest/20 text-forest hover:border-saffron hover:text-saffron`}>
                      {h.classCardCta}
                    </Link>
                  )}
                </div>
              </div>
            </article>
          </FadeUp>

          <FadeUp delay={0.1} className="h-full">
            <article className="flex h-full flex-col overflow-hidden rounded-[1.6rem] bg-forest text-linen">
              <div className="relative aspect-[16/9] overflow-hidden">
                <img
                  src={sm(IMG.heart)}
                  srcSet={`${sm(IMG.heart)} 720w, ${IMG.heart} 1600w`}
                  sizes="(min-width:1024px) 50vw, 100vw"
                  alt=""
                  loading="lazy"
                  style={{ objectPosition: photoFocus("heart") }}
                  className="h-full w-full object-cover"
                />
                <span className="absolute left-4 top-4 rounded-full bg-saffron px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-linen">
                  {t.gift.eyebrow}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6 sm:p-8">
                <h3 className="font-display text-3xl font-light">{h.giftTitle}</h3>
                <p className="mt-3 text-linen/75">{h.giftText}</p>
                <div className="mt-auto flex flex-wrap gap-3 pt-6">
                  <Link to={`${ROUTES.gift}?for=gift`} className={`${CTA} bg-saffron text-linen hover:bg-linen hover:text-ink`}>
                    {h.giftAsGift} <Arrow className="h-3.5 w-3.5" />
                  </Link>
                  <Link to={`${ROUTES.gift}?for=me`} className={`${CTA} border border-linen/40 text-linen hover:bg-linen hover:text-ink`}>
                    {h.giftForMe}
                  </Link>
                </div>
              </div>
            </article>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
