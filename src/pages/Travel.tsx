import { useLang } from "../i18n/LanguageContext";
import { EMAIL, IMG, sm, waLink } from "../data/site";
import { PageHero } from "../components/PageHero";
import { FadeUp, RevealImage, RevealText } from "../components/Reveal";
import { Button } from "../components/Magnetic";
import { WhatsAppIcon } from "../components/MobileBar";
import { usePageTitle } from "../components/usePageTitle";

/** Ayurveda retreats: no online booking, only "book a call", WhatsApp or email. */
export default function Travel() {
  const { t } = useLang();
  const tr = t.travel;
  usePageTitle(t.meta.travel);
  const mail = `mailto:${EMAIL}?subject=${encodeURIComponent(tr.emailSubject)}`;

  return (
    <>
      <PageHero eyebrow={tr.eyebrow} title={tr.title} accent={tr.accent} intro={tr.intro} image={IMG.heart} alt="Linda in India" position="50% 22%" />

      <section className="py-14">
        <div className="container-x flex flex-wrap items-center gap-6">
          <Button href={waLink(tr.callText)}>{tr.bookCall}</Button>
          <p className="max-w-md text-sm text-forest/70">{tr.noOnline}</p>
        </div>
      </section>

      <section className="border-t border-forest/10 py-20 sm:py-28" aria-labelledby="retreats-title">
        <div className="container-x">
          <FadeUp>
            <span className="eyebrow">{tr.retreatsEyebrow}</span>
          </FadeUp>
          <h2 id="retreats-title" className="display-lg mt-5 text-ink">
            <RevealText text={tr.retreatsTitle} />
            <RevealText text={tr.retreatsAccent} className="italic-accent" delay={0.15} />
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {tr.retreats.map((r, i) => (
              <FadeUp key={r.key} delay={i * 0.08} className="h-full">
                <article className={`flex h-full flex-col overflow-hidden rounded-[2rem] ${i === 1 ? "bg-forest text-linen" : "bg-linen text-ink ring-1 ring-forest/10"}`}>
                  <img
                    src={sm(i === 1 ? IMG.banyan : IMG.ayurveda)}
                    alt=""
                    loading="lazy"
                    className={`h-56 w-full object-cover ${i === 1 ? "object-[50%_60%]" : "object-[50%_35%]"}`}
                  />
                  <div className="flex flex-1 flex-col p-7 sm:p-9">
                    <span className={`text-[0.7rem] font-bold uppercase tracking-[0.24em] ${i === 1 ? "text-saffron-soft" : "text-saffron"}`}>{r.season}</span>
                    <h3 className="mt-2 font-display text-3xl font-light">{r.title}</h3>
                    <p className="mt-2 font-semibold">{r.date}</p>
                    <p className={`mt-3 flex-1 ${i === 1 ? "text-linen/75" : "text-forest/75"}`}>{r.text}</p>
                    <div className="mt-6">
                      <Button href={waLink(r.wa)} variant={i === 1 ? "light" : "primary"}>
                        {tr.interestCta}
                      </Button>
                    </div>
                  </div>
                </article>
              </FadeUp>
            ))}
          </div>
          <p className="mt-6 max-w-xl text-sm text-forest/65">{tr.detailsNote}</p>
        </div>
      </section>

      <section className="bg-sand/40 py-20 sm:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-2">
          <FadeUp>
            <div>
              <h2 className="display-md text-ink">{tr.panchaTitle}</h2>
              {tr.panchaText.map((p) => (
                <p key={p} className="lead mt-5">
                  {p}
                </p>
              ))}
              <div className="mt-8 rounded-[1.6rem] bg-linen p-6">
                <p className="font-display text-2xl text-ink">{tr.doctorsTitle}</p>
                <p className="mt-2 text-forest/75">{tr.doctorsText}</p>
                <div className="mt-5">
                  <Button href={waLink(tr.doctorText)} variant="ghost">
                    {tr.doctorCta}
                  </Button>
                </div>
              </div>
            </div>
          </FadeUp>
          <FadeUp delay={0.1}>
            <div>
              <h2 className="display-md text-ink">{tr.navTitle}</h2>
              <p className="lead mt-5">{tr.navText}</p>
              <RevealImage src={IMG.indiaPortrait} alt="" className="mt-8 aspect-[4/3] rounded-[1.6rem]" />
            </div>
          </FadeUp>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="container-x grid items-start gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <FadeUp>
              <span className="eyebrow">{tr.storyEyebrow}</span>
            </FadeUp>
            <h2 className="display-lg mt-5 text-ink">
              <RevealText text={tr.storyTitle} />
              <RevealText text={tr.storyAccent} className="italic-accent" delay={0.15} />
            </h2>
            <FadeUp delay={0.1}>
              <blockquote className="mt-8 border-l-4 border-saffron pl-6 font-display text-2xl font-light italic leading-snug text-forest">
                “{tr.storyQuote}”
                <footer className="mt-4 font-sans text-sm not-italic text-forest/60">— Linda Donkers</footer>
              </blockquote>
            </FadeUp>
          </div>
          <FadeUp delay={0.1} className="lg:col-span-5 lg:col-start-8">
            <div className="rounded-[2rem] bg-linen p-8 ring-1 ring-forest/10 sm:p-10">
              <p className="font-display text-3xl font-light text-ink">{tr.benefitsTitle}</p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {tr.benefits.map((x) => (
                  <li key={x} className="flex items-start gap-3 text-forest">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rotate-45 bg-saffron" />
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          </FadeUp>
        </div>
      </section>

      <section className="pb-28">
        <div className="container-x">
          <FadeUp>
            <div className="rounded-[2rem] bg-forest px-8 py-12 text-linen sm:px-14">
              <p className="font-display text-[clamp(2rem,4vw,3rem)] font-light">{tr.contactTitle}</p>
              <p className="mt-2 max-w-xl text-linen/75">{tr.contactText}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href={waLink(tr.callText)}>{tr.bookCall}</Button>
                <a
                  href={waLink(tr.callText)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-linen/40 px-6 py-4 text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-linen hover:bg-linen hover:text-ink"
                >
                  <WhatsAppIcon className="h-4 w-4" /> {tr.whatsapp}
                </a>
                <a href={mail} className="inline-flex items-center gap-2 rounded-full border border-linen/40 px-6 py-4 text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-linen hover:bg-linen hover:text-ink">
                  {tr.email}
                </a>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>
    </>
  );
}
