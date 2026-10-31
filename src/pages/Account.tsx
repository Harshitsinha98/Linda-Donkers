import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { ROUTES } from "../data/site";
import { fmtLong } from "../lib/api";
import { authApi, useAuth } from "../lib/auth";
import { Arrow } from "../components/Arrow";
import { RevealText } from "../components/Reveal";
import { usePageTitle } from "../components/usePageTitle";

type Pass = {
  id: string;
  code: string;
  name: { nl: string; en: string };
  creditsTotal: number;
  creditsLeft: number;
  validUntil: string | null;
  status: string;
};
type Booking = { ref: string; token: string; seats: number; title: { nl: string; en: string }; startsAt: string; isOnline: boolean; creditsUsed: number };

/** Only same-site paths, never "//evil.com" or "https://…". */
const safeNext = (v: string | null) => (v && v.startsWith("/") && !v.startsWith("//") ? v : "");

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function Login({ next }: { next: string }) {
  const { t } = useLang();
  const a = t.account;
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState("");
  const [error, setError] = useState("");
  const returnTo = `${ROUTES.account}${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  const google = async () => {
    setError("");
    try {
      await auth.signInWithGoogle(returnTo);
    } catch {
      setError(a.emailError);
    }
  };
  const link = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(t.booking.errors.email);
    setError("");
    try {
      await auth.signInWithEmail(email.trim(), returnTo);
      setSent(email.trim());
    } catch {
      setError(a.emailError);
    }
  };

  return (
    <div className="mt-12 max-w-md rounded-[2rem] bg-linen p-7 shadow-[0_30px_80px_-40px_rgba(46,58,47,0.35)] sm:p-9">
      <h2 className="font-display text-3xl font-light text-ink">{a.loginTitle}</h2>
      <p className="mt-3 text-forest/70">{a.loginText}</p>
      <button
        type="button"
        onClick={google}
        className="mt-7 inline-flex w-full items-center justify-center gap-3 rounded-full border border-forest/20 bg-white px-6 py-3.5 font-semibold text-ink transition-colors hover:border-forest/50"
      >
        <GoogleIcon /> {a.google}
      </button>
      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-forest/40">
        <span className="h-px flex-1 bg-forest/15" /> {a.or} <span className="h-px flex-1 bg-forest/15" />
      </div>
      {sent ? (
        <p className="rounded-xl bg-[#e8f3e4] px-4 py-3 text-sm font-semibold text-[#2f5d2a]" role="status">
          {a.emailSent(sent)}
        </p>
      ) : (
        <form onSubmit={link} noValidate>
          <label className="block">
            <span className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-sage">{a.emailLabel}</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-forest/15 bg-cream/60 px-4 py-3 outline-none focus:border-saffron"
            />
          </label>
          <button type="submit" className="mt-4 w-full rounded-full bg-forest px-6 py-3.5 text-[0.8rem] font-bold uppercase tracking-[0.14em] text-linen hover:bg-saffron">
            {a.emailBtn}
          </button>
        </form>
      )}
      {error && (
        <p className="mt-4 text-sm text-[#a2470b]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default function Account() {
  const { t, lang } = useLang();
  const a = t.account;
  usePageTitle(t.meta.account);
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const paidPass = params.get("paid") ? params.get("pass") : null;
  const [data, setData] = useState<{ passes: Pass[]; bookings: Booking[] } | null>(null);

  // Came here to log in for something else (booking, buying): go back once logged in.
  useEffect(() => {
    if (auth.session && next) navigate(next, { replace: true });
  }, [auth.session, next, navigate]);

  useEffect(() => {
    if (!auth.session || next) return;
    let alive = true;
    authApi<{ passes: Pass[]; bookings: Booking[] }>(auth.session, `/api/memberships${paidPass ? `?pass=${encodeURIComponent(paidPass)}` : ""}`)
      .then((d) => alive && setData({ passes: d.passes ?? [], bookings: d.bookings ?? [] }))
      .catch(() => alive && setData({ passes: [], bookings: [] }));
    return () => {
      alive = false;
    };
  }, [auth.session, next, paidPass]);

  const fmtDate = (iso: string) => new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "nl-BE", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
  const paidActive = paidPass && data?.passes.some((p) => p.id === paidPass && p.status === "active");

  return (
    <section className="relative pb-28 pt-32 sm:pb-40 sm:pt-44">
      <div className="container-x">
        <motion.span className="eyebrow" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.2 }}>
          {a.eyebrow}
        </motion.span>
        <h1 className="display-xl mt-6 text-ink">
          <RevealText text={a.title} immediate delay={0.25} />
          <RevealText text={a.accent} immediate delay={0.45} className="italic-accent" />
        </h1>

        {!auth.enabled ? (
          <p className="lead mt-10">{a.notConfigured}</p>
        ) : !auth.ready ? (
          <p className="mt-10 text-forest/60">{t.memberships.loading}</p>
        ) : !auth.session ? (
          <Login next={next} />
        ) : (
          <div className="mt-10">
            <div className="flex flex-wrap items-center gap-4 text-forest/70">
              <span>{a.loggedInAs(auth.email)}</span>
              <button type="button" onClick={() => auth.signOut()} className="text-sm font-semibold text-saffron underline underline-offset-4">
                {a.logout}
              </button>
            </div>

            {paidPass && (
              <div className="mt-8 rounded-2xl bg-[#e8f3e4] px-6 py-5 text-[#2f5d2a]">
                <p className="font-display text-2xl">{a.paidTitle}</p>
                <p className="mt-1">{paidActive ? a.paidText : a.paidPending}</p>
              </div>
            )}

            <div className="mt-12 grid gap-12 lg:grid-cols-2">
              <div>
                <h2 className="display-md text-ink">{a.passesTitle}</h2>
                {!data ? (
                  <p className="mt-6 text-forest/60">{t.memberships.loading}</p>
                ) : data.passes.length === 0 ? (
                  <div className="mt-6 rounded-2xl bg-sand/70 p-6">
                    <p className="text-forest/75">{a.noPasses}</p>
                    <Link to={ROUTES.memberships} className="mt-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-saffron">
                      {a.buy} <Arrow className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ) : (
                  <ul className="mt-6 grid gap-4">
                    {data.passes.map((p) => (
                      <li key={p.id} className={`rounded-2xl border border-forest/10 bg-linen p-6 ${p.status !== "active" ? "opacity-60" : ""}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <p className="font-display text-xl text-ink">{p.name[lang]}</p>
                          <span className={`rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] ${p.status === "active" ? "bg-saffron text-linen" : "bg-sand text-forest"}`}>
                            {a.status[p.status] ?? p.status}
                          </span>
                        </div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-sand">
                          <div className="h-full rounded-full bg-sage" style={{ width: `${(p.creditsLeft / p.creditsTotal) * 100}%` }} />
                        </div>
                        <p className="mt-3 text-sm font-semibold text-forest">{a.left(p.creditsLeft, p.creditsTotal)}</p>
                        <p className="mt-1 text-sm text-forest/60">
                          {p.validUntil ? a.validUntil(fmtDate(p.validUntil)) : ""} · {a.code} {p.code}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h2 className="display-md text-ink">{a.bookingsTitle}</h2>
                {!data ? null : data.bookings.length === 0 ? (
                  <div className="mt-6 rounded-2xl bg-sand/70 p-6">
                    <p className="text-forest/75">{a.noBookings}</p>
                    <Link to={ROUTES.agenda} className="mt-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-saffron">
                      {a.book} <Arrow className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ) : (
                  <ul className="mt-6 grid gap-3">
                    {data.bookings.map((b) => (
                      <li key={b.ref}>
                        <Link
                          to={`${ROUTES.booking}/${b.ref}?t=${b.token}`}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-forest/10 bg-linen p-5 transition-colors hover:border-saffron"
                        >
                          <span>
                            <span className="block font-display text-lg text-ink">{b.title[lang]}</span>
                            <span className="text-sm text-forest/60 first-letter:uppercase">{fmtLong(b.startsAt, lang)}</span>
                          </span>
                          <span className="text-xs font-bold uppercase tracking-[0.14em] text-saffron">{a.view} <Arrow className="ml-1 inline h-3.5 w-3.5" /></span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
