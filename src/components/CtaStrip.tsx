import { Link } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { ROUTES } from "../data/site";
import { Button } from "./Magnetic";
import { FadeUp, RevealText } from "./Reveal";
import { LogoMark } from "./Logo";

export function CtaStrip() {
  const { t } = useLang();
  return (
    <section className="relative overflow-hidden bg-forest py-28 text-linen sm:py-36 grain">
      <LogoMark
        className="pointer-events-none absolute -right-20 -top-10 h-[34rem] w-[34rem] text-linen/[0.05]"
        strokeWidth={1}
      />
      <div className="container-x relative text-center">
        <h2 className="display-lg mx-auto max-w-4xl">
          <RevealText text={t.cta.title} />
          <RevealText text={t.cta.accent} className="font-display italic text-saffron-soft" delay={0.2} />
        </h2>
        <FadeUp delay={0.3}>
          <p className="mx-auto mt-6 max-w-md text-lg text-linen/70">{t.cta.text}</p>
          <div className="mt-10 flex flex-col items-center gap-5">
            <Button to={ROUTES.agenda}>{t.cta.button}</Button>
            <Link to={ROUTES.contact} className="text-sm font-semibold text-linen/70 underline underline-offset-4 hover:text-saffron-soft">
              {t.cta.secondary}
            </Link>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
