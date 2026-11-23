import { useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { ROUTES } from "../data/site";
import { FadeUp, RevealText } from "./Reveal";

/**
 * Linda's "connected diamonds": seven diamonds that touch each other (2 – 3 – 2), each one a way
 * into her work. Massages sit in the middle and stand out, because that is where most people start.
 */
const LAYOUT: { key: string; to: string; left: string; top: string; tone: string }[] = [
  { key: "yoga", to: ROUTES.yoga, left: "16.667%", top: "0%", tone: "bg-sage-soft text-forest" },
  { key: "healing", to: ROUTES.healing, left: "50%", top: "0%", tone: "bg-lavender text-aubergine" },
  { key: "about", to: ROUTES.about, left: "0%", top: "25%", tone: "bg-sand text-forest" },
  { key: "massage", to: ROUTES.massage, left: "33.333%", top: "25%", tone: "bg-saffron text-linen" },
  { key: "travel", to: ROUTES.travel, left: "66.667%", top: "25%", tone: "bg-sand text-forest" },
  { key: "events", to: ROUTES.events, left: "16.667%", top: "50%", tone: "bg-lavender text-aubergine" },
  { key: "contact", to: ROUTES.contact, left: "50%", top: "50%", tone: "bg-sage-soft text-forest" },
];

export function DiamondNav() {
  const { t } = useLang();
  const d = t.diamonds;
  const [active, setActive] = useState("massage");
  const current = d.items[active];

  return (
    <section className="relative overflow-hidden py-20 sm:py-28" aria-labelledby="diamonds-title">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <FadeUp>
            <span className="eyebrow justify-center">{d.eyebrow}</span>
          </FadeUp>
          <h2 id="diamonds-title" className="display-lg mt-5 text-ink">
            <RevealText text={d.title} />
            <RevealText text={d.accent} className="italic-accent" delay={0.15} />
          </h2>
          <FadeUp delay={0.1}>
            <p className="lead mx-auto mt-4 max-w-md">{d.text}</p>
          </FadeUp>
        </div>

        <FadeUp delay={0.15}>
          <nav aria-label={d.eyebrow} className="relative mx-auto mt-12 aspect-[3/2] w-full max-w-[640px]" onPointerLeave={() => setActive("massage")}>
            {LAYOUT.map((x) => {
              const item = d.items[x.key];
              const on = active === x.key;
              return (
                <Link
                  key={x.key}
                  to={x.to}
                  onPointerEnter={() => setActive(x.key)}
                  onFocus={() => setActive(x.key)}
                  data-cursor="hover"
                  className={`group absolute flex aspect-square w-1/3 items-center justify-center text-center outline-none transition-[transform,filter] duration-500 [clip-path:polygon(50%_0,100%_50%,50%_100%,0_50%)] focus-visible:brightness-90 ${x.tone} ${
                    on ? "z-10 scale-100" : "scale-[0.96]"
                  } hover:brightness-95`}
                  style={{ left: x.left, top: x.top }}
                >
                  <span className="block w-[62%] leading-tight">
                    <span className={`block font-display text-[clamp(0.72rem,2.9vw,1.25rem)] ${x.key === "massage" ? "font-normal" : "font-light"}`}>{item.title}</span>
                    {item.sub && <span className="mt-0.5 block text-[clamp(0.58rem,2.1vw,0.82rem)] opacity-75">{item.sub}</span>}
                  </span>
                </Link>
              );
            })}
          </nav>
        </FadeUp>

        <p className="mx-auto mt-8 min-h-[3.5rem] max-w-md text-center text-forest/75" aria-live="polite">
          <span className="font-semibold text-ink">{current.title}{current.sub ? ` ${current.sub}` : ""}:</span> {current.text}
        </p>
      </div>
    </section>
  );
}
