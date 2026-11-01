import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

type ForWhom = "gift" | "self";
import { useLang } from "../i18n/LanguageContext";
import { IMG, ROUTES, sm } from "../data/site";
import { api, ApiError, fmtDate, fmtEuro } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Arrow } from "../components/Arrow";
import { Button } from "../components/Magnetic";
import { RevealText } from "../components/Reveal";
import { usePageTitle } from "../components/usePageTitle";

const PRESETS = [5000, 10000, 15000, 20000];
const MIN = 10;
const MAX = 1000;

const inputCls =
  "mt-2 w-full rounded-xl border border-forest/15 bg-cream/60 px-4 py-3 text-base text-ink outline-none transition-colors placeholder:text-forest/30 focus:border-saffron";

type Status = {
  ref: string;
  status: "pending" | "active" | "expired" | "cancelled";
  code: string;
  initialCents: number;
  balanceCents: number;
  expiresAt: string | null;
  recipientName: string;
  recipientEmail: string;
  buyerEmail: string;
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-sage">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-forest/50">{hint}</span>}
    </label>
  );
}

function BuyForm({ initialFor }: { initialFor: ForWhom }) {
  const { t, lang } = useLang();
  const g = t.gift;
  const auth = useAuth();
  const [amount, setAmount] = useState(10000);
  const [custom, setCustom] = useState("");
  const [forWhom, setForWhom] = useState<ForWhom>(initialFor);
  const forSomeone = forWhom === "gift";
  const [f, setF] = useState({ buyerName: auth.name, buyerEmail: auth.email, recipientName: "", recipientEmail: "", message: "", terms: false });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  useEffect(() => setF((x) => ({ ...x, buyerName: x.buyerName || auth.name, buyerEmail: x.buyerEmail || auth.email })), [auth.name, auth.email]);

  const customCents = custom.trim() ? Math.round(Number(custom.replace(",", ".")) * 100) : NaN;
  const cents = custom.trim() ? customCents : amount;
  const valid = Number.isFinite(cents) && cents >= MIN * 100 && cents <= MAX * 100;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return setError(g.errorAmount);
    if (!f.buyerName.trim() || !/^\S+@\S+\.\S+$/.test(f.buyerEmail.trim())) return setError(g.errorRequired);
    if (forSomeone && f.recipientEmail.trim() && !/^\S+@\S+\.\S+$/.test(f.recipientEmail.trim())) return setError(t.booking.errors.email);
    if (!f.terms) return setError(t.booking.errors.terms);
    setBusy(true);
    setError("");
    try {
      const r = await api<{ url: string }>("/api/checkout?giftcard=buy", {
        method: "POST",
        body: JSON.stringify({
          amountCents: cents,
          buyerName: f.buyerName,
          buyerEmail: f.buyerEmail,
          forSelf: !forSomeone,
          recipientName: forSomeone ? f.recipientName : "",
          recipientEmail: forSomeone ? f.recipientEmail : "",
          message: forSomeone ? f.message : "",
          lang,
          acceptTerms: true,
        }),
      });
      window.location.href = r.url;
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      setError(code === "payments_unavailable" ? t.booking.errors.payments : code === "rate_limited" ? t.booking.errors.rate : g.errorGeneric);
      setBusy(false);
    }
  };

  const chip = (on: boolean) =>
    `rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors ${on ? "border-saffron bg-saffron text-linen" : "border-forest/20 text-forest hover:border-saffron hover:text-saffron"}`;

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 rounded-[2rem] bg-linen p-6 shadow-[0_30px_80px_-40px_rgba(46,58,47,0.35)] sm:p-9">
      <fieldset>
        <legend className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-sage">{g.forWhom}</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["gift", g.asGift, g.asGiftText],
              ["self", g.forMe, g.forMeText],
            ] as const
          ).map(([k, title, text]) => (
            <label
              key={k}
              className={`flex cursor-pointer gap-3 rounded-2xl border-2 p-4 transition-colors ${forWhom === k ? "border-saffron bg-saffron/5" : "border-forest/10 hover:border-forest/30"}`}
            >
              <input type="radio" name="forWhom" checked={forWhom === k} onChange={() => setForWhom(k)} className="mt-1 accent-[var(--color-saffron)]" />
              <span>
                <span className="block font-semibold text-ink">{title}</span>
                <span className="mt-1 block text-sm text-forest/70">{text}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <span className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-sage">{g.amount}</span>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={!custom.trim() && amount === p}
              onClick={() => {
                setAmount(p);
                setCustom("");
              }}
              className={chip(!custom.trim() && amount === p)}
            >
              {fmtEuro(p, lang).replace(/[,.]00/, "")}
            </button>
          ))}
        </div>
      </div>
      <Field label={g.custom} hint={g.amountHint(MIN, MAX)}>
        <input className={inputCls} inputMode="decimal" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="75" />
      </Field>
      <p className="-mb-2 font-display text-xl text-ink">{g.yourDetails}</p>
      <Field label={g.buyerName}>
        <input className={inputCls} value={f.buyerName} onChange={(e) => set("buyerName", e.target.value)} autoComplete="name" />
      </Field>
      <Field label={g.buyerEmail}>
        <input className={inputCls} type="email" value={f.buyerEmail} onChange={(e) => set("buyerEmail", e.target.value)} autoComplete="email" />
      </Field>
      {!forSomeone && <p className="-mt-2 text-xs text-forest/60">{g.forMeNote}</p>}
      {forSomeone && (
        <>
          <p className="-mb-2 font-display text-xl text-ink">{g.recipientDetails}</p>
          <Field label={g.recipientName}>
            <input className={inputCls} value={f.recipientName} onChange={(e) => set("recipientName", e.target.value)} />
          </Field>
          <Field label={g.recipientEmail} hint={g.recipientHint}>
            <input className={inputCls} type="email" value={f.recipientEmail} onChange={(e) => set("recipientEmail", e.target.value)} />
          </Field>
          <Field label={g.message}>
            <textarea className={`${inputCls} min-h-[90px] resize-y`} maxLength={500} value={f.message} onChange={(e) => set("message", e.target.value)} />
          </Field>
        </>
      )}
      <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold text-forest">
        <input type="checkbox" checked={f.terms} onChange={(e) => set("terms", e.target.checked)} className="mt-0.5 h-5 w-5 accent-[var(--color-saffron)]" />
        <span>{g.terms}</span>
      </label>
      <div className="flex items-baseline justify-between border-t border-forest/10 pt-5">
        <span className="text-sm font-bold uppercase tracking-[0.16em] text-sage">{g.total}</span>
        <span className="font-display text-3xl text-ink">{valid ? fmtEuro(cents, lang) : "–"}</span>
      </div>
      {error && (
        <p className="rounded-xl bg-saffron/10 px-4 py-3 text-sm font-medium text-[#a2470b]" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-saffron px-7 py-4 text-[0.85rem] font-bold uppercase tracking-[0.16em] text-linen transition-colors duration-300 hover:bg-forest disabled:opacity-60"
      >
        {busy ? t.booking.sending : g.pay}
        {!busy && <Arrow className="h-4 w-4" />}
      </button>
      <p className="text-center text-xs text-forest/55">{t.booking.payNote}</p>
    </form>
  );
}

function StatusView({ ref_, token }: { ref_: string; token: string }) {
  const { t, lang } = useLang();
  const g = t.gift;
  const [s, setS] = useState<Status | null>(null);
  const [missing, setMissing] = useState(false);
  const [polls, setPolls] = useState(0);
  useEffect(() => {
    if (s && s.status !== "pending") return;
    if (polls > 24) return;
    const id = window.setTimeout(
      () => {
        api<{ giftCard: Status }>(`/api/checkout?giftcard=status&ref=${encodeURIComponent(ref_)}&t=${encodeURIComponent(token)}`)
          .then((d) => setS(d.giftCard))
          .catch(() => setMissing(true))
          .finally(() => setPolls((p) => p + 1));
      },
      polls === 0 ? 0 : 2500,
    );
    return () => window.clearTimeout(id);
  }, [s, polls, ref_, token]);

  if (missing) return <p className="lead">{t.booking.status.notFound}</p>;
  if (!s || s.status === "pending") {
    return (
      <div className="rounded-[2rem] bg-linen p-8 text-center" role="status" aria-live="polite">
        <div className="mx-auto h-14 w-14 animate-spin rounded-full border-2 border-sand border-t-saffron" />
        <p className="mt-6 font-display text-2xl text-ink">{g.statusLoading}</p>
        <p className="mt-2 text-forest/70">{g.statusPending}</p>
      </div>
    );
  }
  return (
    <div className="rounded-[2rem] bg-linen p-7 sm:p-9">
      <h2 className="font-display text-3xl font-light text-ink">{g.statusTitle}</h2>
      <p className="mt-3 text-forest/75">{g.statusText(s.recipientEmail || s.buyerEmail)}</p>
      <p className="mt-6 rounded-2xl bg-cream px-5 py-5 text-center font-display text-3xl tracking-[0.2em] text-ink">{s.code}</p>
      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.16em] text-sage">{g.value}</dt>
          <dd className="mt-1 text-ink">{fmtEuro(s.initialCents, lang)}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.16em] text-sage">{g.balance}</dt>
          <dd className="mt-1 text-ink">{fmtEuro(s.balanceCents, lang)}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.16em] text-sage">{g.validUntil}</dt>
          <dd className="mt-1 text-ink">{s.expiresAt ? fmtDate(s.expiresAt, lang) : "-"}</dd>
        </div>
      </dl>
      <p className="mt-6 text-sm text-forest/70">{g.how}</p>
      <div className="mt-8 flex flex-wrap gap-4">
        <Button to={ROUTES.agenda}>{t.nav.book}</Button>
        <Button to={ROUTES.gift} variant="ghost">
          {g.another}
        </Button>
      </div>
    </div>
  );
}

export default function GiftCard() {
  const { t } = useLang();
  const g = t.gift;
  usePageTitle(t.meta.gift);
  const [params] = useSearchParams();
  const ref = params.get("ref") ?? "";
  const token = params.get("t") ?? "";
  const aborted = params.get("aborted") === "1";
  const initialFor: ForWhom = params.get("for") === "me" ? "self" : "gift";

  return (
    <section className="relative pb-28 pt-32 sm:pb-40 sm:pt-44">
      <div className="container-x grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <motion.span className="eyebrow" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.2 }}>
            {g.eyebrow}
          </motion.span>
          <h1 className="display-xl mt-6 text-ink">
            <RevealText text={g.title} immediate delay={0.25} />
            <RevealText text={g.accent} immediate delay={0.45} className="italic-accent" />
          </h1>
          <motion.p className="lead mt-8 max-w-xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 1 }}>
            {g.intro}
          </motion.p>
          <div className="mt-10 hidden aspect-[4/3] overflow-hidden rounded-[2rem] lg:block">
            <img src={sm(IMG.lomi1)} alt="" className="h-full w-full object-cover" style={{ objectPosition: "50% 32%" }} />
          </div>
        </div>
        <div className="lg:col-span-6">
          {aborted && <p className="mb-6 rounded-xl bg-saffron/10 px-4 py-3 text-sm text-[#a2470b]">{g.aborted}</p>}
          {ref && token ? <StatusView ref_={ref} token={token} /> : <BuyForm initialFor={initialFor} />}
        </div>
      </div>
    </section>
  );
}
