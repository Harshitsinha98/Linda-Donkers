import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { ROUTES, sm, waLink } from "../data/site";
import { api, ApiError, fmtEuro, fmtLong, sessionImage, type PublicSession } from "../lib/api";
import { Arrow } from "../components/Arrow";
import { FadeUp } from "../components/Reveal";
import { Button } from "../components/Magnetic";
import { usePageTitle } from "../components/usePageTitle";

const inputCls =
  "mt-2 w-full rounded-xl border border-forest/15 bg-cream/60 px-4 py-3 text-base text-ink outline-none transition-colors placeholder:text-forest/30 focus:border-saffron";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-sage">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-forest/50">{hint}</span>}
    </label>
  );
}

function BookingForm({ s }: { s: PublicSession }) {
  const { t, lang } = useLang();
  const b = t.booking;
  const navigate = useNavigate();
  const maxSeats = Math.max(1, Math.min(s.maxPerBooking, s.spotsLeft));
  const [form, setForm] = useState({ name: "", email: "", phone: "", note: "", seats: 1, terms: false });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const total = s.priceCents * form.seats;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || form.phone.trim().length < 6) return setError(b.errors.required);
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError(b.errors.email);
    if (!form.terms) return setError(b.errors.terms);
    setError("");
    setBusy(true);
    try {
      const res = await api<{ url?: string; ref?: string; token?: string }>("/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          sessionId: s.id,
          name: form.name,
          email: form.email,
          phone: form.phone,
          note: form.note,
          seats: form.seats,
          lang,
          acceptTerms: true,
        }),
      });
      if (res.url) {
        window.location.href = res.url; // Stripe Checkout
        return;
      }
      navigate(`${ROUTES.booking}/${res.ref}?t=${res.token}`);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      setError(
        code === "full"
          ? b.errors.full
          : code === "unavailable"
            ? b.errors.unavailable
            : code === "payments_unavailable"
              ? b.errors.payments
              : code === "rate_limited"
                ? b.errors.rate
                : code === "invalid_input"
                  ? b.errors.email
                  : b.errors.generic,
      );
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="rounded-[2rem] bg-linen p-6 shadow-[0_30px_80px_-40px_rgba(46,58,47,0.35)] sm:p-9">
      <h2 className="font-display text-3xl font-light text-ink">{b.formTitle}</h2>
      <div className="mt-7 grid gap-5">
        <Field label={b.name}>
          <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" required />
        </Field>
        <Field label={b.email}>
          <input className={inputCls} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" required />
        </Field>
        <Field label={b.phone} hint={b.phoneHint}>
          <input className={inputCls} type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" placeholder="+32" required />
        </Field>
        {maxSeats > 1 && (
          <Field label={b.seats}>
            <select className={inputCls} value={form.seats} onChange={(e) => set("seats", Number(e.target.value))}>
              {Array.from({ length: maxSeats }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label={b.note}>
          <textarea className={`${inputCls} min-h-[90px] resize-y`} value={form.note} onChange={(e) => set("note", e.target.value)} />
        </Field>

        <div className="rounded-2xl bg-sand/60 p-5 text-sm text-forest/80">
          <p className="font-bold text-forest">{b.policyTitle}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {b.policy.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <label className="mt-4 flex cursor-pointer items-start gap-3 font-semibold text-forest">
            <input type="checkbox" checked={form.terms} onChange={(e) => set("terms", e.target.checked)} className="mt-0.5 h-5 w-5 accent-[var(--color-saffron)]" />
            <span>{b.terms}</span>
          </label>
        </div>

        <div className="flex items-baseline justify-between border-t border-forest/10 pt-5">
          <span className="text-sm font-bold uppercase tracking-[0.16em] text-sage">{b.total}</span>
          <span className="font-display text-3xl text-ink">{total > 0 ? fmtEuro(total, lang) : t.agenda.free}</span>
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
          {busy ? b.sending : total > 0 ? b.pay : b.confirmFree}
          {!busy && <Arrow className="h-4 w-4" />}
        </button>
        {total > 0 && <p className="text-center text-xs text-forest/55">{b.payNote}</p>}
      </div>
    </form>
  );
}

export default function SessionDetail() {
  const { id = "" } = useParams();
  const { t, lang } = useLang();
  const a = t.agenda;
  const [s, setS] = useState<PublicSession | null>(null);
  const [missing, setMissing] = useState(false);
  usePageTitle(s ? `${s.title[lang]} | Linda Donkers` : t.meta.agenda);

  useEffect(() => {
    api<{ session: PublicSession }>(`/api/sessions?id=${encodeURIComponent(id)}`)
      .then((d) => setS(d.session))
      .catch(() => setMissing(true));
  }, [id]);

  const past = s ? Date.parse(s.startsAt) <= Date.now() : false;
  const blocked = s && (s.status === "cancelled" ? a.cancelled : past ? a.past : s.spotsLeft <= 0 ? a.full : "");
  const desc = s?.description[lang] ?? "";

  return (
    <section className="pb-28 pt-28 sm:pb-40 sm:pt-36">
      <div className="container-x">
        <Link to={ROUTES.agenda} className="inline-flex items-center gap-2 text-sm font-semibold text-forest hover:text-saffron">
          <Arrow dir="left" className="h-4 w-4" /> {a.back}
        </Link>

        {missing ? (
          <p className="lead mt-12">{a.notFound}</p>
        ) : !s ? (
          <p className="mt-12 text-forest/60" role="status">
            {a.loading}
          </p>
        ) : (
          <div className="mt-8 grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <FadeUp>
                <div className="relative aspect-[16/9] overflow-hidden rounded-[2rem]">
                  <img src={sessionImage(s.category)} srcSet={`${sm(sessionImage(s.category))} 720w, ${sessionImage(s.category)} 1600w`} sizes="(min-width:1024px) 55vw, 100vw" alt="" className="h-full w-full object-cover" />
                </div>
                <span className="eyebrow mt-10">{t.categories[s.category] ?? t.categories.other}</span>
                <h1 className="mt-5 font-display text-[clamp(2.4rem,5vw,4.4rem)] font-light leading-[1.05] text-ink">{s.title[lang]}</h1>
              </FadeUp>

              <dl className="mt-10 grid gap-x-8 gap-y-6 border-y border-forest/10 py-8 sm:grid-cols-2">
                <div>
                  <dt className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-sage">{t.booking.status.when}</dt>
                  <dd className="mt-1 text-lg text-ink first-letter:uppercase">{fmtLong(s.startsAt, lang)}</dd>
                  <dd className="text-sm text-forest/60">
                    {s.durationMin} {a.min} · {a.timezone}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-sage">{t.booking.status.where}</dt>
                  <dd className="mt-1 text-lg text-ink">{s.isOnline ? a.online : s.venue || "-"}</dd>
                  {!s.isOnline && s.address && (
                    <dd className="text-sm text-forest/60">
                      <a href={`https://maps.google.com/?q=${encodeURIComponent(s.address)}`} target="_blank" rel="noreferrer" className="underline decoration-forest/30 underline-offset-4 hover:text-saffron">
                        {s.address}
                      </a>
                    </dd>
                  )}
                </div>
                <div>
                  <dt className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-sage">{t.booking.total}</dt>
                  <dd className="mt-1 text-lg text-ink">
                    {s.priceCents > 0 ? `${fmtEuro(s.priceCents, lang)} ${a.perPerson}` : a.free}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-sage">{t.booking.seats}</dt>
                  <dd className={`mt-1 text-lg ${s.spotsLeft > 0 ? "text-saffron" : "text-forest/50"}`}>{s.spotsLeft > 0 ? a.spots(s.spotsLeft) : a.full}</dd>
                </div>
              </dl>

              {desc && <p className="lead mt-8 whitespace-pre-line">{desc}</p>}
            </div>

            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-28">
                {blocked ? (
                  <div className="rounded-[2rem] bg-sand p-8 sm:p-10">
                    <p className="font-display text-2xl text-ink">{blocked}</p>
                    <div className="mt-8 flex flex-wrap gap-4">
                      <Button to={ROUTES.agenda} variant="ghost">
                        {a.back}
                      </Button>
                      <Button href={waLink(t.mobileBar.whatsappText)}>{a.emptyCta}</Button>
                    </div>
                  </div>
                ) : (
                  <BookingForm s={s} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
