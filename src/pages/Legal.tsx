import { useLang } from "../i18n/LanguageContext";
import { FadeUp, RevealText } from "../components/Reveal";
import { usePageTitle } from "../components/usePageTitle";

export default function Legal({ kind }: { kind: "privacy" | "terms" }) {
  const { t } = useLang();
  const title = kind === "privacy" ? t.legal.privacyTitle : t.legal.termsTitle;
  const paras = kind === "privacy" ? t.legal.privacy : t.legal.terms;
  usePageTitle(kind === "privacy" ? t.meta.privacy : t.meta.terms);

  return (
    <section className="pb-28 pt-36 sm:pb-40 sm:pt-48">
      <div className="container-x max-w-3xl">
        <h1 className="display-lg text-ink">
          <RevealText text={title} immediate />
        </h1>
        <div className="mt-14 space-y-8">
          {paras.map((p, i) => (
            <FadeUp key={i} delay={i * 0.08}>
              <p className="lead">{p}</p>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
