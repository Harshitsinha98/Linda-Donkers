import { useState } from "react";
import { useLang } from "../i18n/LanguageContext";
import { api, ApiError } from "../lib/api";
import { Arrow } from "./Arrow";
import { FadeUp, RevealText } from "./Reveal";

type Status = "idle" | "sending" | "done" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Newsletter signup: future events & workshops. Posts to /api/newsletter. */
export function Newsletter() {
  const { t, lang } = useLang();
  const c = t.newsletter;
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "sending") return;
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setStatus("error");
      setError(c.errorInvalid);
      return;
    }
    setStatus("sending");
    setError("");
    try {
      await api("/api/newsletter", { method: "POST", body: JSON.stringify({ email: value, lang, company }) });
      setStatus("done");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof ApiError && err.status === 400 ? c.errorInvalid : c.errorGeneric);
    }
  };

  return (
    <section className="relative overflow-hidden bg-forest text-linen">
      <div className="container-x py-20 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <FadeUp>
            <span className="eyebrow text-saffron-soft">{c.eyebrow}</span>
          </FadeUp>
          <h2 className="display-md mt-5">
            <RevealText text={c.title} />
            <RevealText text={c.accent} className="font-display italic text-saffron-soft" delay={0.15} />
          </h2>
          <FadeUp delay={0.2}>
            <p className="mx-auto mt-4 max-w-md text-linen/70">{c.text}</p>
          </FadeUp>

          {status === "done" ? (
            <p className="mx-auto mt-8 max-w-md rounded-full bg-linen/10 px-6 py-4 text-sm font-semibold text-saffron-soft" role="status">
              {c.success}
            </p>
          ) : (
            <FadeUp delay={0.3}>
              <form onSubmit={submit} noValidate className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
                {/* honeypot, visually hidden from users */}
                <input
                  type="text"
                  name="company"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="absolute left-[-9999px] h-0 w-0 opacity-0"
                />
                <label htmlFor="newsletter-email" className="sr-only">
                  {c.placeholder}
                </label>
                <input
                  id="newsletter-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  placeholder={c.placeholder}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status === "error") setStatus("idle");
                  }}
                  className="min-w-0 flex-1 rounded-full border border-linen/25 bg-linen/5 px-5 py-3.5 text-sm text-linen placeholder:text-linen/40 focus:border-saffron-soft focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-saffron px-6 py-3.5 text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-linen transition-colors duration-300 hover:bg-saffron-soft hover:text-ink disabled:opacity-60"
                >
                  {status === "sending" ? c.sending : c.button}
                  <Arrow className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </form>
            </FadeUp>
          )}

          {status === "error" && (
            <p className="mt-3 text-sm text-saffron-soft" role="alert">
              {error}
            </p>
          )}
          <p className="mt-5 text-xs text-linen/40">{c.privacy}</p>
        </div>
      </div>
    </section>
  );
}
