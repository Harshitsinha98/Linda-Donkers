import { Link } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { MASSAGE_PRICES, ROUTES, TESTIMONIALS, waLink } from "../data/site";
import { fmtEuro, planFor, planLink, usePlans } from "../lib/api";
import { bookLink } from "../lib/booking";
import { Arrow } from "./Arrow";
import { FadeUp, RevealText } from "./Reveal";

/** "60 minutes €100 / 90 minutes €140", optionally each row a booking link for one treatment. */
export function MassagePrices({ treatment, light = false }: { treatment?: string; light?: boolean }) {
  const { t, lang } = useLang();
  return (
    <ul className={`divide-y border-y ${light ? "divide-linen/15 border-linen/15" : "divide-forest/10 border-forest/10"}`}>
      {MASSAGE_PRICES.map((p) => (
        <li key={p.minutes}>
          <Link
            to={bookLink({ tab: "massage", treatment, min: p.minutes })}
            className={`group flex items-baseline justify-between gap-4 py-3.5 transition-colors ${light ? "hover:text-saffron-soft" : "hover:text-saffron"}`}
          >
            <span className="text-[1.02rem]">{t.massage.minutes(p.minutes)}</span>
            <span className="flex items-baseline gap-3">
              <span className="font-display text-3xl">{fmtEuro(p.cents, lang)}</span>
              <Arrow className="h-4 w-4 opacity-40 transition-opacity group-hover:opacity-100" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * The massage packages. The button goes straight to the matching card on the class cards page
 * (it is added automatically, see server/memberships.ts). While the cards are loading it goes to
 * that page's overview. Only when Linda has taken the package off sale does it fall back to WhatsApp.
 */
export function PackageCards({ only }: { only?: string }) {
  const { t, lang } = useLang();
  const o = t.offers;
  const plans = usePlans();
  const list = o.packages.filter((p) => !only || p.key === only);
  return (
    <div className={`grid gap-6 ${list.length > 1 ? "md:grid-cols-2" : ""}`}>
      {list.map((p, i) => {
        // The package itself (with its free session), not a plain card with the same number of sessions.
        const plan = planFor(plans?.filter((x) => x.bonusCredits > 0) ?? null, "massage-90", p.credits);
        const price = plan ? plan.priceCents : p.priceCents;
        const cls =
          "inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[0.8rem] font-bold uppercase tracking-[0.16em] transition-colors duration-300";
        return (
          <FadeUp key={p.key} delay={i * 0.08} className="h-full">
            <article className={`flex h-full flex-col rounded-[2rem] p-7 sm:p-9 ${i === 0 ? "bg-forest text-linen" : "bg-linen text-ink ring-1 ring-forest/10"}`}>
              <span className={`text-[0.7rem] font-bold uppercase tracking-[0.24em] ${i === 0 ? "text-saffron-soft" : "text-saffron"}`}>{o.packagesEyebrow}</span>
              <h3 className="mt-3 font-display text-[clamp(1.6rem,3vw,2.2rem)] font-light leading-tight">{p.title}</h3>
              <p className={`mt-3 flex-1 ${i === 0 ? "text-linen/75" : "text-forest/70"}`}>{p.text}</p>
              <p className="mt-6 font-display text-4xl">{fmtEuro(price, lang)}</p>
              <div className="mt-6">
                {plan || plans === null ? (
                  <Link to={planLink(plan)} className={`${cls} ${i === 0 ? "bg-saffron text-linen hover:bg-linen hover:text-ink" : "bg-saffron text-linen hover:bg-forest"}`}>
                    {o.packageCta} <Arrow className="h-4 w-4" />
                  </Link>
                ) : (
                  <a
                    href={waLink(o.packageWa(p.title))}
                    target="_blank"
                    rel="noreferrer"
                    className={`${cls} ${i === 0 ? "bg-saffron text-linen hover:bg-linen hover:text-ink" : "bg-saffron text-linen hover:bg-forest"}`}
                  >
                    {o.packageAsk} <Arrow className="h-4 w-4" />
                  </a>
                )}
              </div>
            </article>
          </FadeUp>
        );
      })}
    </div>
  );
}

/** Christmas offers are shown from 1 November until 6 January. */
export function xmasYear(now = new Date()): number | null {
  const m = now.getMonth();
  if (m === 10 || m === 11) return now.getFullYear();
  if (m === 0 && now.getDate() <= 6) return now.getFullYear() - 1;
  return null;
}

/** Christmas gift cards for a massage or a healing. Hidden outside the Christmas period. */
export function XmasOffers() {
  const { t, lang } = useLang();
  const x = t.xmas;
  const year = xmasYear();
  if (year === null) return null;
  return (
    <section className="relative overflow-hidden bg-plum-deep py-20 text-linen sm:py-28" aria-labelledby="xmas-title">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-neon/20 blur-[100px]" />
      <div className="container-x relative">
        <div className="max-w-2xl">
          <FadeUp>
            <span className="eyebrow eyebrow-neon text-lilac">{x.eyebrow(year)}</span>
          </FadeUp>
          <h2 id="xmas-title" className="display-lg mt-5 text-linen">
            <RevealText text={x.title} />
            <RevealText text={x.accent} className="italic-accent text-neon-soft" delay={0.15} />
          </h2>
          <FadeUp delay={0.1}>
            <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-linen/75">{x.text}</p>
          </FadeUp>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {x.items.map((it, i) => (
            <FadeUp key={it.key} delay={i * 0.06} className="h-full">
              <Link
                to={`${ROUTES.gift}?amount=${it.cents}`}
                className="group flex h-full flex-col justify-between rounded-[1.6rem] border border-linen/15 bg-linen/5 p-6 transition-colors hover:border-neon-soft hover:bg-linen/10"
              >
                <span className="font-display text-2xl font-light leading-snug">{it.title}</span>
                <span className="mt-6 flex items-end justify-between">
                  <span className="font-display text-4xl">{fmtEuro(it.cents, lang)}</span>
                  <span className="inline-flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-neon-soft">
                    {x.cta} <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </span>
              </Link>
            </FadeUp>
          ))}
        </div>
        <p className="mt-8 max-w-xl text-sm text-linen/60">{x.codeNote}</p>
      </div>
    </section>
  );
}

/** Real client quotes from src/data/site.ts. Renders nothing while there are none. */
export function Testimonials() {
  const { t, lang } = useLang();
  const h = t.home;
  if (TESTIMONIALS.length === 0) return null;
  return (
    <section className="relative bg-sand/40 py-20 sm:py-28" aria-labelledby="testimonials-title">
      <div className="container-x">
        <FadeUp>
          <span className="eyebrow">{h.testimonialsEyebrow}</span>
        </FadeUp>
        <h2 id="testimonials-title" className="display-lg mt-5 text-ink">
          <RevealText text={h.testimonialsTitle} />
          <RevealText text={h.testimonialsAccent} className="italic-accent" delay={0.15} />
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((q, i) => (
            <FadeUp key={i} delay={i * 0.06} className="h-full">
              <figure className="flex h-full flex-col rounded-[1.6rem] bg-linen p-7">
                <span className="font-display text-5xl leading-none text-saffron" aria-hidden>“</span>
                <blockquote className="mt-2 flex-1 font-display text-xl font-light italic leading-snug text-ink">{q.quote[lang]}</blockquote>
                <figcaption className="mt-5 text-sm text-forest/70">
                  <span className="font-semibold text-forest">{q.name}</span> · {q.service[lang]}
                </figcaption>
              </figure>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
