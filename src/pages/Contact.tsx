import { Arrow } from "../components/Arrow";
import { motion } from "framer-motion";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { EMAIL, PHONE_DISPLAY, SOCIALS, WHATSAPP } from "../data/site";
import { FadeUp, RevealText } from "../components/Reveal";
import { Button } from "../components/Magnetic";
import { BreathingCircle } from "../components/Breathing";
import { usePageTitle } from "../components/usePageTitle";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="group block">
      <span className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-sage transition-colors group-focus-within:text-saffron">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "mt-2 w-full border-0 border-b border-forest/20 bg-transparent px-0 py-3 text-lg text-ink outline-none transition-colors placeholder:text-forest/30 focus:border-saffron focus-visible:outline-none";

export default function Contact() {
  const { t } = useLang();
  const c = t.contact;
  usePageTitle(t.meta.contact);
  const [params] = useSearchParams();
  const preset = Number(params.get("interest"));

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState(Number.isInteger(preset) && preset >= 0 && preset < c.form.interests.length ? preset : 0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  const body = () =>
    `${c.form.name}: ${name}\n${c.form.email}: ${email}\n${c.form.interest}: ${c.form.interests[interest]}\n\n${message}`;

  const valid = () => {
    const ok = name.trim().length > 0 && message.trim().length > 0;
    setError(!ok);
    return ok;
  };

  const sendMail = () => {
    if (!valid()) return;
    const subject = `${c.form.subject}: ${c.form.interests[interest]}`;
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body())}`;
  };
  const sendWhatsapp = () => {
    if (!valid()) return;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(body())}`, "_blank", "noopener");
  };

  return (
    <section className="relative overflow-hidden pb-28 pt-32 sm:pb-40 sm:pt-44">
      <div className="pointer-events-none absolute -right-40 top-20 hidden opacity-60 lg:block">
        <BreathingCircle />
      </div>
      <div className="container-x relative">
        <motion.span className="eyebrow" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.2 }}>
          {c.eyebrow}
        </motion.span>
        <h1 className="display-xl mt-6 text-ink">
          <RevealText text={c.title} immediate delay={0.25} />
          <RevealText text={c.accent} immediate delay={0.45} className="italic-accent" />
        </h1>
        <motion.p className="lead mt-8 max-w-xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 1 }}>
          {c.intro}
        </motion.p>

        <div className="mt-20 grid gap-16 lg:grid-cols-12">
          <FadeUp className="lg:col-span-7">
            <form
              className="grid gap-10 rounded-[2rem] bg-linen/80 p-8 shadow-[0_30px_80px_-40px_rgba(46,58,47,0.35)] backdrop-blur sm:grid-cols-2 sm:p-12"
              onSubmit={(e) => {
                e.preventDefault();
                sendMail();
              }}
              noValidate
            >
              <Field label={c.form.name}>
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
              </Field>
              <Field label={c.form.email}>
                <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </Field>
              <div className="sm:col-span-2">
                <span className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-sage">{c.form.interest}</span>
                <div className="mt-4 flex flex-wrap gap-2">
                  {c.form.interests.map((it, i) => (
                    <button
                      key={it}
                      type="button"
                      onClick={() => setInterest(i)}
                      aria-pressed={interest === i}
                      className={`rounded-full border px-4 py-2 text-sm transition-all duration-300 ${
                        interest === i ? "border-saffron bg-saffron text-linen" : "border-forest/20 text-forest hover:border-saffron hover:text-saffron"
                      }`}
                    >
                      {it}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <Field label={c.form.message}>
                  <textarea className={`${inputCls} min-h-[140px] resize-y`} value={message} onChange={(e) => setMessage(e.target.value)} required />
                </Field>
              </div>
              {error && (
                <p className="text-sm text-saffron sm:col-span-2" role="alert">
                  {c.form.required}
                </p>
              )}
              <div className="flex flex-wrap gap-4 sm:col-span-2">
                <Button type="submit">{c.form.sendMail}</Button>
                <Button variant="ghost" onClick={sendWhatsapp}>
                  {c.form.sendWhatsapp}
                </Button>
              </div>
            </form>
          </FadeUp>

          <div className="space-y-12 lg:col-span-4 lg:col-start-9">
            <FadeUp delay={0.1}>
              <span className="eyebrow">{c.direct}</span>
              <a href={`mailto:${EMAIL}`} className="mt-5 block break-all font-display text-[clamp(1.5rem,2.4vw,2.1rem)] text-ink transition-colors hover:text-saffron">
                {EMAIL}
              </a>
              <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" className="mt-3 block font-display text-2xl text-ink transition-colors hover:text-saffron">
                {PHONE_DISPLAY}
              </a>
              <p className="mt-3 text-forest/70">{c.location}</p>
            </FadeUp>
            <FadeUp delay={0.2}>
              <span className="eyebrow">{c.socials}</span>
              <ul className="mt-5 divide-y divide-forest/10 border-y border-forest/10">
                {SOCIALS.map((s) => (
                  <li key={s.name}>
                    <a href={s.href} target="_blank" rel="noreferrer" className="group flex items-center justify-between py-4 text-forest transition-colors hover:text-saffron">
                      <span className="font-display text-xl">{s.name}</span>
                      <span className="transition-transform duration-500 group-hover:-rotate-45"><Arrow className="h-5 w-5" /></span>
                    </a>
                  </li>
                ))}
              </ul>
            </FadeUp>
          </div>
        </div>
      </div>
    </section>
  );
}
