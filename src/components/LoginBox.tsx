import { useState } from "react";
import { useLang } from "../i18n/LanguageContext";
import { useAuth } from "../lib/auth";

const inputCls =
  "w-full rounded-xl border border-forest/15 bg-cream/60 px-4 py-3 text-base text-ink outline-none transition-colors placeholder:text-forest/30 focus:border-saffron";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** "Continue with Google" + "email me a login link". After login the visitor comes back to `returnTo` (default: this page). */
export function LoginBox({ returnTo, compact = false }: { returnTo?: string; compact?: boolean }) {
  const { t } = useLang();
  const a = t.account;
  const { enabled, signInWithGoogle, signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!enabled) return <p className="text-sm text-forest/70">{a.notConfigured}</p>;

  const google = async () => {
    setError("");
    setBusy(true);
    try {
      await signInWithGoogle(returnTo);
    } catch {
      setError(a.loginError);
      setBusy(false);
    }
  };

  const link = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(v)) return setError(t.booking.errors.email);
    setError("");
    setBusy(true);
    try {
      await signInWithEmail(v, returnTo);
      setSent(v);
    } catch {
      setError(a.loginError);
    }
    setBusy(false);
  };

  return (
    <div className={compact ? "grid gap-3" : "grid gap-4"}>
      <button
        type="button"
        onClick={google}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-forest/20 bg-white px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-forest/50 disabled:opacity-60"
      >
        <GoogleIcon /> {a.google}
      </button>
      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-forest/40">
        <span className="h-px flex-1 bg-forest/10" />
        {a.or}
        <span className="h-px flex-1 bg-forest/10" />
      </div>
      {sent ? (
        <p className="rounded-xl bg-[#e7f3e4] px-4 py-3 text-sm text-forest" role="status">
          {a.linkSent(sent)}
        </p>
      ) : (
        <form onSubmit={link} className="flex flex-col gap-2 sm:flex-row" noValidate>
          <input
            type="email"
            autoComplete="email"
            className={inputCls}
            placeholder={a.email}
            aria-label={a.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy}
            className="shrink-0 rounded-full bg-forest px-5 py-3 text-sm font-semibold text-linen transition-colors hover:bg-saffron disabled:opacity-60"
          >
            {a.sendLink}
          </button>
        </form>
      )}
      {error && (
        <p className="text-sm text-[#a2470b]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
