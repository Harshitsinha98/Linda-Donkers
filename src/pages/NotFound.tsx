import { useLang } from "../i18n/LanguageContext";
import { ROUTES } from "../data/site";
import { BreathingCircle } from "../components/Breathing";
import { Button } from "../components/Magnetic";
import { RevealText } from "../components/Reveal";
import { usePageTitle } from "../components/usePageTitle";

export default function NotFound() {
  const { t } = useLang();
  usePageTitle(t.meta.notFound);
  return (
    <section className="flex min-h-screen items-center pb-20 pt-32">
      <div className="container-x grid items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="font-display text-8xl font-light text-sand">404</p>
          <h1 className="display-lg mt-4 text-ink">
            <RevealText text={t.notFound.title} immediate />
            <RevealText text={t.notFound.accent} immediate delay={0.2} className="italic-accent" />
          </h1>
          <p className="lead mt-6 max-w-md">{t.notFound.text}</p>
          <div className="mt-10">
            <Button to={ROUTES.home}>{t.notFound.cta}</Button>
          </div>
        </div>
        <BreathingCircle />
      </div>
    </section>
  );
}
