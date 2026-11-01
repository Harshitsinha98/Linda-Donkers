import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { ROUTES, sm, waLink } from "../data/site";
import { api, ApiError, fmtEuro, photoFocus, photoSrc, type MembershipPlan } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Arrow } from "../components/Arrow";
import { CouponField, type AppliedCoupon } from "../components/CouponField";
import { LoginBox } from "../components/LoginBox";
import { Button } from "../components/Magnetic";
import { FadeUp, RevealText } from "../components/Reveal";
import { usePageTitle } from "../components/usePageTitle";
import { scrollToElement } from "../components/SmoothScroll";

const inputCls =
  "mt-2 w-full rounded-xl border border-forest/15 bg-cream/60 px-4 py-3 text-base text-ink outline-none transition-colors placeholder:text-forest/30 focus:border-saffron";

function BuyPanel({ plan, onClose }: { plan: MembershipPlan; onClose: () => void }) {
  const { t, lang } = useLang();
  const m = t.memberships;
  const auth = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(auth.name);
  const [phone, setPhone] = useState("");
  const [terms, setTerms] = useState(false);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setName((n) => n || auth.name), [auth.name]);

  const total = coupon ? coupon.totalCents : plan.priceCents;

  const buy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError(t.booking.errors.required);
    if (!terms) return setError(t.booking.errors.terms);
    setBusy(true);
    setError("");
    try {
      const r = await auth.authApi<{ url?: string; ref?: string }>("/api/membership-checkout", {
        method: "POST",
        body: JSON.stringify({ planId: plan.id, name, phone, lang, couponCode: coupon?.code ?? "", acceptTerms: true }),
      });
      if (r.url) {
        window.location.href = r.url;
        return;
      }
      navigate(`${ROUTES.account}?membership=${r.ref}&paid=1`);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      if (code.startsWith("coupon_")) setCoupon(null);
      setError(
        code.startsWith("coupon_")
          ? (t.booking.couponErrors[code] ?? t.booking.couponErrors.generic)
          : code === "payments_unavailable"
            ? t.booking.errors.payments
            : code === "login_required"
              ? t.booking.errors.login
              : m.errorGeneric,
      );
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 rounded-[1.6rem] bg-cream p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <p className="font-display text-2xl font-light text-ink">{m.formTitle(plan.name[lang])}</p>
        <button type="button" onClick={onClose} aria-label={m.close} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-forest/20 text-lg">
          ×
        </button>
      </div>
      {!auth.ready ? null : !auth.email ? (
        <div className="mt-4">
          <p className="font-semibold text-ink">{m.loginTitle}</p>
          <p className="mb-4 mt-1 text-sm text-forest/70">{m.loginText}</p>
          <LoginBox returnTo={`${ROUTES.memberships}?plan=${plan.id}`} compact />
        </div>
      ) : (
        <form onSubmit={buy} noValidate className="mt-4 grid gap-4">
          <p className="text-sm text-forest/70">{m.loggedInAs(auth.email)}</p>
          <label className="block">
            <span className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-sage">{m.name}</span>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
          <label className="block">
            <span className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-sage">{m.phone}</span>
            <input className={inputCls} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="+32" />
          </label>
          {plan.priceCents > 0 && <CouponField target={{ planId: plan.id, email: auth.email }} applied={coupon} onChange={setCoupon} />}
          <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold text-forest">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[var(--color-saffron)]" />
            <span>{m.terms}</span>
          </label>
          <div className="flex items-baseline justify-between border-t border-forest/10 pt-4">
            <span className="text-sm font-bold uppercase tracking-[0.16em] text-sage">{m.total}</span>
            <span className="font-display text-3xl text-ink">
              {coupon && <s className="mr-2 text-lg text-forest/40">{fmtEuro(plan.priceCents, lang)}</s>}
              {fmtEuro(total, lang)}
            </span>
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
            {busy ? t.booking.sending : total > 0 ? m.pay : m.confirmFree}
            {!busy && <Arrow className="h-4 w-4" />}
          </button>
          {total > 0 && <p className="text-center text-xs text-forest/55">{t.booking.payNote}</p>}
        </form>
      )}
    </div>
  );
}

function PlanCard({ plan, open, onOpen, onClose }: { plan: MembershipPlan; open: boolean; onOpen: () => void; onClose: () => void }) {
  const { t, lang } = useLang();
  const m = t.memberships;
  const photo = photoSrc(plan.photo || "portrait");
  return (
    <article id={`plan-${plan.id}`} className="flex h-full scroll-mt-28 flex-col overflow-hidden rounded-[1.6rem] border border-forest/10 bg-linen">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={photo}
          srcSet={`${sm(photo)} 720w, ${photo} 1600w`}
          sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
          alt=""
          loading="lazy"
          style={{ objectPosition: photoFocus(plan.photo || "portrait") }}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/60 to-transparent" />
        <span className="absolute bottom-3 left-4 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-linen">
          {m.sessions(plan.credits)} · {m.valid(plan.validityDays)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h2 className="font-display text-2xl font-light leading-snug text-ink">{plan.name[lang]}</h2>
        {plan.description[lang] && <p className="mt-3 whitespace-pre-line text-sm text-forest/75">{plan.description[lang]}</p>}
        <div className="mt-auto flex items-end justify-between gap-4 pt-6">
          <div>
            <p className="font-display text-2xl text-ink">{fmtEuro(plan.priceCents, lang)}</p>
            {plan.credits > 1 && (
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-saffron">{m.perSession(fmtEuro(Math.round(plan.priceCents / plan.credits), lang))}</p>
            )}
          </div>
          {!open && (
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-3 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-linen transition-colors hover:bg-saffron"
            >
              {m.buy} <Arrow className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {open && <BuyPanel plan={plan} onClose={onClose} />}
      </div>
    </article>
  );
}

export default function Memberships() {
  const { t } = useLang();
  const m = t.memberships;
  usePageTitle(t.meta.memberships);
  const [params, setParams] = useSearchParams();
  const [plans, setPlans] = useState<MembershipPlan[] | null>(null);
  const [error, setError] = useState(false);
  const openId = params.get("plan") ?? "";
  const aborted = params.get("aborted") === "1";

  useEffect(() => {
    api<{ plans: MembershipPlan[] }>("/api/memberships")
      .then((d) => setPlans(d.plans))
      .catch(() => setError(true));
  }, []);

  // Coming from a "buy this card" link (?plan=…): bring that card into view. The intro and the page
  // curtain can reset or pause scrolling for a moment, so keep trying for a few seconds until the card
  // is in place, and stop as soon as the visitor scrolls or taps themselves.
  const linkedPlan = useRef(openId); // only the card from the link, not cards opened later on this page
  useEffect(() => {
    const target = linkedPlan.current;
    if (!plans || !target) return;
    let stop = false;
    const cancel = () => (stop = true);
    const events = ["wheel", "touchstart", "keydown"] as const;
    events.forEach((e) => window.addEventListener(e, cancel, { passive: true, once: true }));
    const started = Date.now();
    const id = window.setInterval(() => {
      const el = document.getElementById(`plan-${target}`);
      if (stop || !el || Date.now() - started > 9000) return window.clearInterval(id);
      if (Math.abs(el.getBoundingClientRect().top - 110) > 40) scrollToElement(el);
    }, 600);
    return () => {
      window.clearInterval(id);
      events.forEach((e) => window.removeEventListener(e, cancel));
    };
  }, [plans]);

  const setOpen = (id: string) => setParams(id ? { plan: id } : {}, { replace: true });

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

        {aborted && <p className="mt-8 max-w-xl rounded-xl bg-saffron/10 px-4 py-3 text-sm text-[#a2470b]">{m.aborted}</p>}

        <div className="mt-14">
          {error ? (
            <p className="lead">{m.error}</p>
          ) : !plans ? (
            <p className="text-forest/60" role="status">
              {m.loading}
            </p>
          ) : plans.length === 0 ? (
            <div className="rounded-[2rem] bg-sand px-8 py-14 sm:px-14">
              <p className="lead max-w-xl">{m.empty}</p>
              <div className="mt-8">
                <Button href={waLink(t.mobileBar.whatsappText)}>{t.agenda.emptyCta}</Button>
              </div>
            </div>
          ) : (
            <div className="grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((p, i) => (
                <FadeUp key={p.id} delay={Math.min(i, 5) * 0.06}>
                  <PlanCard plan={p} open={openId === p.id} onOpen={() => setOpen(p.id)} onClose={() => setOpen("")} />
                </FadeUp>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
