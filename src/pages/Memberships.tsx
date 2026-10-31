import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { ROUTES, sm, waLink } from "../data/site";
import { api, ApiError, fmtEuro } from "../lib/api";
import { authApi, useAuth } from "../lib/auth";
import { Arrow } from "../components/Arrow";
import { FadeUp, RevealText } from "../components/Reveal";
import { Button } from "../components/Magnetic";
import { usePageTitle } from "../components/usePageTitle";
import { COVERS, isCoverKey, OFFERS, OFFER_COVER, type OfferKey } from "../../shared/catalog";

export type Plan = {
  id: string;
  name: { nl: string; en: string };
  description: { nl: string; en: string };
  priceCents: number;
  credits: number;
  validityDays: number;
  offers: OfferKey[];
  cover: string;
};

const planCover = (p: Plan) => COVERS[isCoverKey(p.cover) ? p.cover : p.offers[0] ? OFFER_COVER[p.offers[0]] : "happy"];

function Buy({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const { t, lang } = useLang();
  const m = t.memberships;
  const c = t.booking.coupon;
  const auth = useAuth();
  const [code, setCode] = useState("");
  const [quote, setQuote] = useState<{ code: string; discountCents: number; totalCents: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const total = quote ? quote.totalCents : plan.priceCents;

  const apply = async () => {
    if (!code.trim()) return;
    setCouponMsg("");
    try {
      setQuote(await api("/api/coupon", { method: "POST", body: JSON.stringify({ code, planId: plan.id, email: auth.email }) }));
    } catch (err) {
      setQuote(null);
      const k = err instanceof ApiError ? err.code : "";
      setCouponMsg(m.errors[k] ?? c.errors[k] ?? c.errors.coupon_invalid);
    }
  };

  const pay = async () => {
    if (!terms) return setError(m.termsError);
    setError("");
    setBusy(true);
    try {
      const res = await authApi<{ url?: string; passId?: string }>(auth.session, "/api/memberships", {
        method: "POST",
        body: JSON.stringify({ planId: plan.id, couponCode: quote?.code ?? "", name: auth.name, lang, acceptTerms: true }),
      });
      window.location.href = res.url ?? `${ROUTES.account}?pass=${res.passId}&paid=1`;
    } catch (err) {
      const k = err instanceof ApiError ? err.code : "";
      setError(m.errors[k] ?? c.errors[k] ?? m.errors.generic);
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-saffron/30 bg-cream/70 p-5">
      <p className="text-xs text-forest/60">{t.account.loggedInAs(auth.email)}</p>
      <div className="mt-4">
        <span className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-sage">{c.label}</span>
        {quote ? (
          <div className="mt-2 flex items-center justify-between rounded-xl bg-[#e8f3e4] px-4 py-2.5 text-sm font-semibold text-[#2f5d2a]">
            <span>✓ {c.applied(quote.code)}</span>
            <button type="button" className="text-xs uppercase underline" onClick={() => (setQuote(null), setCode(""))}>
              {c.remove}
            </button>
          </div>
        ) : (
          <div className="mt-2 flex gap-2">
            <input
              value={code}
              onChange={(e) => (setCode(e.target.value), setCouponMsg(""))}
              placeholder={c.placeholder}
              className="w-full rounded-xl border border-forest/15 bg-white px-4 py-2.5 uppercase outline-none focus:border-saffron"
            />
            <button type="button" onClick={apply} disabled={!code.trim()} className="rounded-xl border border-forest/20 px-4 text-sm font-semibold disabled:opacity-50">
              {c.apply}
            </button>
          </div>
        )}
        {couponMsg && <p className="mt-2 text-sm text-[#a2470b]">{couponMsg}</p>}
      </div>
      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm font-semibold text-forest">
        <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[var(--color-saffron)]" />
        <span>{m.terms}</span>
      </label>
      <div className="mt-4 flex items-baseline justify-between border-t border-forest/10 pt-4">
        <span className="text-sm font-bold uppercase tracking-[0.16em] text-sage">{m.total}</span>
        <span className="font-display text-2xl text-ink">
          {quote && quote.discountCents > 0 && <s className="mr-2 text-base text-forest/40">{fmtEuro(plan.priceCents, lang)}</s>}
          {fmtEuro(total, lang)}
        </span>
      </div>
      {error && (
        <p className="mt-3 rounded-xl bg-saffron/10 px-4 py-3 text-sm text-[#a2470b]" role="alert">
          {error}
        </p>
      )}
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={pay}
          disabled={busy}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-saffron px-6 py-3.5 text-[0.8rem] font-bold uppercase tracking-[0.16em] text-linen hover:bg-forest disabled:opacity-60"
        >
          {busy ? t.booking.sending : t.booking.pay} {!busy && <Arrow className="h-4 w-4" />}
        </button>
        <button type="button" onClick={onClose} className="rounded-full border border-forest/20 px-5 text-sm font-semibold text-forest">
          ×
        </button>
      </div>
    </div>
  );
}

export default function Memberships() {
  const { t, lang } = useLang();
  const m = t.memberships;
  usePageTitle(t.meta.memberships);
  const auth = useAuth();
  const [params] = useSearchParams();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [authOn, setAuthOn] = useState(true);
  const [open, setOpen] = useState(params.get("plan") ?? "");

  useEffect(() => {
    api<{ plans: Plan[]; authConfigured: boolean }>("/api/memberships")
      .then((d) => {
        setPlans(d.plans);
        setAuthOn(d.authConfigured);
      })
      .catch(() => setPlans([]));
  }, []);

  const canBuy = auth.enabled && authOn;

  return (
    <section className="relative pb-28 pt-32 sm:pb-40 sm:pt-44">
      <div className="container-x">
        <motion.span className="eyebrow" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.2 }}>
          {m.eyebrow}
        </motion.span>
        <h1 className="display-xl mt-6 text-ink">
          <RevealText text={m.title} immediate delay={0.25} />
          <RevealText text={m.accent} immediate delay={0.45} className="italic-accent" />
        </h1>
        <motion.p className="lead mt-8 max-w-xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 1 }}>
          {m.intro}
        </motion.p>

        {params.get("aborted") && <p className="mt-8 rounded-2xl bg-sand px-6 py-4 text-forest">{m.aborted}</p>}
        {!canBuy && plans && plans.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center gap-4 rounded-2xl bg-sand px-6 py-5">
            <p className="text-forest">{m.notConfigured}</p>
            <Button href={waLink(t.mobileBar.whatsappText)} variant="ghost">
              WhatsApp
            </Button>
          </div>
        )}

        <div className="mt-14">
          {!plans ? (
            <p className="text-forest/60">{m.loading}</p>
          ) : plans.length === 0 ? (
            <p className="lead">{m.empty}</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {plans.map((p, i) => {
                const cover = planCover(p);
                const next = `${ROUTES.memberships}?plan=${p.id}`;
                return (
                  <FadeUp key={p.id} delay={(i % 3) * 0.1} className="h-full">
                    <article className="flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-forest/10 bg-linen">
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <img src={sm(cover.src)} alt="" loading="lazy" className="h-full w-full object-cover" style={{ objectPosition: cover.focus }} />
                        <span className="absolute left-4 top-4 rounded-full bg-linen/90 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-forest">
                          {m.credits(p.credits)}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col p-7">
                        <h2 className="font-display text-[1.8rem] font-light leading-tight text-ink">{p.name[lang]}</h2>
                        <p className="mt-4 flex items-baseline gap-3">
                          <span className="font-display text-4xl text-saffron">{fmtEuro(p.priceCents, lang)}</span>
                          <span className="text-sm text-forest/60">{m.perCredit(fmtEuro(Math.round(p.priceCents / p.credits), lang))}</span>
                        </p>
                        <ul className="mt-4 space-y-1.5 text-sm font-semibold text-forest">
                          <li className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-saffron" aria-hidden />
                            {m.validity(p.validityDays)}
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-saffron" aria-hidden />
                            <span>
                              {m.covers}: {p.offers.map((o) => OFFERS[o][lang]).join(", ")}
                            </span>
                          </li>
                        </ul>
                        {p.description[lang] && <p className="mt-4 text-sm leading-relaxed text-forest/70">{p.description[lang]}</p>}
                        <div className="mt-auto pt-6">
                          {open === p.id && auth.session ? (
                            <Buy plan={p} onClose={() => setOpen("")} />
                          ) : canBuy ? (
                            auth.session ? (
                              <button
                                type="button"
                                onClick={() => setOpen(p.id)}
                                className="inline-flex items-center gap-2 rounded-full bg-forest px-6 py-3.5 text-[0.75rem] font-bold uppercase tracking-[0.14em] text-linen hover:bg-saffron"
                              >
                                {m.buy} <Arrow className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <Link
                                to={`${ROUTES.account}?next=${encodeURIComponent(next)}`}
                                className="inline-flex items-center gap-2 rounded-full bg-forest px-6 py-3.5 text-[0.75rem] font-bold uppercase tracking-[0.14em] text-linen hover:bg-saffron"
                              >
                                {m.loginToBuy} <Arrow className="h-3.5 w-3.5" />
                              </Link>
                            )
                          ) : null}
                        </div>
                      </div>
                    </article>
                  </FadeUp>
                );
              })}
            </div>
          )}
        </div>

        <FadeUp>
          <div className="mt-20 rounded-[2rem] bg-sand px-8 py-12 sm:px-14">
            <h2 className="display-md text-ink">{m.howTitle}</h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-4">
              {m.how.map((step, i) => (
                <li key={step} className="text-forest/80">
                  <span className="font-display text-4xl font-light text-saffron">0{i + 1}</span>
                  <p className="mt-2 text-sm leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
