import { useLang } from "../i18n/LanguageContext";
import { ROUTES } from "../data/site";
import { FadeUp, RevealText } from "../components/Reveal";
import { Button } from "../components/Magnetic";
import { PackageCards, XmasOffers } from "../components/Offers";
import { usePageTitle } from "../components/usePageTitle";

export default function Offers() {
  const { t } = useLang();
  const o = t.offers;
  usePageTitle(t.meta.offers);

  return (
    <>
      <section className="relative pb-16 pt-32 sm:pb-20 sm:pt-40">
        <div className="container-x">
          <FadeUp>
            <span className="eyebrow">{o.eyebrow}</span>
          </FadeUp>
          <h1 className="mt-6 font-display text-[clamp(2.6rem,6vw,5.6rem)] font-light leading-[1.02] text-ink">
            <RevealText text={o.title} immediate delay={0.2} />
            <RevealText text={o.accent} immediate delay={0.35} className="italic-accent" />
          </h1>
          <FadeUp delay={0.3}>
            <p className="lead mt-7 max-w-2xl">{o.intro}</p>
          </FadeUp>
        </div>
      </section>

      <section className="pb-20 sm:pb-28" aria-labelledby="packages-title">
        <div className="container-x">
          <h2 id="packages-title" className="display-md text-ink">
            {o.packagesTitle}
            <em className="italic-accent">{o.packagesAccent}</em>
          </h2>
          <div className="mt-8">
            <PackageCards />
          </div>
          <FadeUp>
            <div className="mt-8 rounded-[2rem] bg-sand/50 p-7 sm:p-9">
              <p className="font-display text-2xl text-ink">{o.howTitle}</p>
              <ol className="mt-4 grid gap-3 sm:grid-cols-3">
                {o.howSteps.map((s, i) => (
                  <li key={s} className="flex gap-3 text-forest">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest text-sm font-bold text-linen">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </FadeUp>
        </div>
      </section>

      <XmasOffers />

      <section className="py-20 sm:py-28">
        <div className="container-x grid gap-6 md:grid-cols-2">
          <FadeUp className="h-full">
            <div className="flex h-full flex-col rounded-[2rem] bg-linen p-8 ring-1 ring-forest/10 sm:p-10">
              <p className="font-display text-3xl font-light text-ink">{o.giftTitle}</p>
              <p className="mt-3 flex-1 text-forest/75">{o.giftText}</p>
              <div className="mt-7">
                <Button to={ROUTES.gift}>{o.giftCta}</Button>
              </div>
            </div>
          </FadeUp>
          <FadeUp delay={0.08} className="h-full">
            <div className="flex h-full flex-col rounded-[2rem] bg-linen p-8 ring-1 ring-forest/10 sm:p-10">
              <p className="font-display text-3xl font-light text-ink">{o.cardsTitle}</p>
              <p className="mt-3 flex-1 text-forest/75">{o.cardsText}</p>
              <div className="mt-7">
                <Button to={ROUTES.memberships} variant="ghost">
                  {o.cardsCta}
                </Button>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>
    </>
  );
}
