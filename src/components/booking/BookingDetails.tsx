import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../../i18n/LanguageContext";
import { ROUTES } from "../../data/site";
import { ApiError, fmtEuro, type MembershipView, type PublicSession } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { CouponField, type AppliedCoupon } from "../CouponField";
import { GiftCardField, giftSplit, type AppliedGift } from "../GiftCardField";
import { LoginBox } from "../LoginBox";
import { Arrow } from "../Arrow";

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

/**
 * Step 3 of the booking page: name, email, phone, pay. Gift cards and discount codes sit behind
 * one link; the class-card choice only appears for logged-in visitors who have a usable card.
 * `pick` is the chosen day and time (null = not chosen yet). Appointment sessions without a weekly
 * calendar ask for a preferred moment instead.
 */
export function BookingDetails({ s, pick }: { s: PublicSession; pick: { date: string; time: string } | null }) {
  const { t, lang } = useLang();
  const b = t.booking;
  const k = t.book;
  const navigate = useNavigate();
  const auth = useAuth();
  const appt = s.bookingMode === "appointment";
  const withCalendar = !appt || !!s.availability?.enabled;
  const ready = withCalendar ? !!pick : true;
  const maxSeats = Math.max(1, Math.min(s.maxPerBooking, s.spotsLeft));

  const [form, setForm] = useState({ name: "", email: "", phone: "", note: "", preferred: "", seats: 1, terms: false });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [codesOpen, setCodesOpen] = useState(false);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [gift, setGift] = useState<AppliedGift | null>(null);
  const [cards, setCards] = useState<MembershipView[]>([]);
  const [cardId, setCardId] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const set = <K extends keyof typeof form>(key: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: v }));

  // Another session (other treatment, duration or class date): codes are checked per session.
  useEffect(() => {
    setCoupon(null);
    setGift(null);
    setError("");
    setForm((f) => ({ ...f, seats: 1 }));
  }, [s.id]);

  // Logged in: prefill and look up class cards / packages that can pay for this session.
  useEffect(() => {
    if (!auth.email) {
      setCards([]);
      setCardId("");
      return;
    }
    setForm((f) => ({ ...f, email: f.email || auth.email, name: f.name || auth.name }));
    let alive = true;
    auth
      .authApi<{ memberships: MembershipView[] }>(`/api/account?sessionId=${encodeURIComponent(s.id)}`)
      .then((d) => {
        if (!alive) return;
        setCards(d.memberships);
        setCardId(d.memberships[0]?.id ?? "");
      })
      .catch(() => alive && setCards([]));
    return () => {
      alive = false;
    };
  }, [auth.email, auth.name, auth.authApi, s.id]);

  const useCard = !!cardId && cards.some((c) => c.id === cardId);
  const seats = useCard ? 1 : form.seats;
  const gross = s.priceCents * seats;
  const afterCoupon = useCard ? 0 : coupon ? coupon.totalCents : gross;
  const split = giftSplit(useCard ? null : gift, afterCoupon);
  const total = split.rest;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return setError(b.errors.slotRequired);
    if (!form.name.trim() || !form.email.trim() || form.phone.trim().length < 6) return setError(b.errors.required);
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError(b.errors.email);
    if (appt && !withCalendar && form.preferred.trim().length < 3) return setError(b.errors.preferred);
    if (!form.terms) return setError(b.errors.terms);
    setError("");
    setBusy(true);
    try {
      const res = await auth.authApi<{ url?: string; ref?: string; token?: string }>("/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          sessionId: s.id,
          name: form.name,
          email: form.email,
          phone: form.phone,
          note: form.note,
          preferred: appt && !withCalendar ? form.preferred : "",
          appointmentDate: appt && withCalendar && pick ? pick.date : "",
          appointmentTime: appt && withCalendar && pick ? pick.time : "",
          seats,
          lang,
          acceptTerms: true,
          couponCode: !useCard && coupon ? coupon.code : "",
          giftCode: !useCard && gift && split.used > 0 ? gift.code : "",
          membershipId: useCard ? cardId : "",
        }),
      });
      if (res.url) {
        window.location.href = res.url; // Stripe Checkout
        return;
      }
      navigate(`${ROUTES.booking}/${res.ref}?t=${res.token}`);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      if (code.startsWith("coupon_")) setCoupon(null);
      if (code.startsWith("gift_")) setGift(null);
      const byCode: Record<string, string> = {
        full: b.errors.full,
        unavailable: b.errors.unavailable,
        payments_unavailable: b.errors.payments,
        rate_limited: b.errors.rate,
        preferred_required: b.errors.preferred,
        slot_required: b.errors.slotUnavailable,
        slot_unavailable: b.errors.slotUnavailable,
        membership_not_usable: b.errors.membership,
        membership_one_seat: b.errors.membership,
        login_required: b.errors.login,
      };
      setError(
        code.startsWith("gift_")
          ? (t.gift.errors[code] ?? t.gift.errors.generic)
          : code.startsWith("coupon_")
            ? (b.couponErrors[code] ?? b.couponErrors.generic)
            : code === "invalid_input" && err instanceof ApiError && err.message
              ? err.message
              : (byCode[code] ?? b.errors.generic),
      );
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className={`grid gap-5 transition-opacity ${ready ? "" : "opacity-60"}`}>
      {cards.length > 0 && s.priceCents > 0 && (
        <fieldset className="rounded-2xl border border-forest/10 p-4">
          <legend className="px-1 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-sage">{b.payWith}</legend>
          <div className="grid gap-2">
            {cards.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-start gap-3 rounded-xl bg-cream/60 px-4 py-3">
                <input type="radio" name="pay" checked={cardId === c.id} onChange={() => setCardId(c.id)} className="mt-1 accent-[var(--color-saffron)]" />
                <span>
                  <span className="block font-semibold text-ink">{b.payMembership}</span>
                  <span className="block text-sm text-forest/70">
                    {c.name[lang]} · {b.membershipLeft(c.creditsLeft)}
                  </span>
                </span>
              </label>
            ))}
            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-cream/60 px-4 py-3">
              <input type="radio" name="pay" checked={!useCard} onChange={() => setCardId("")} className="accent-[var(--color-saffron)]" />
              <span className="font-semibold text-ink">{b.payOnline}</span>
            </label>
          </div>
          {useCard && <p className="mt-3 text-xs text-forest/60">{b.membershipNote}</p>}
        </fieldset>
      )}

      <Field label={b.name}>
        <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" required />
      </Field>
      <Field label={b.email}>
        <input className={inputCls} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" readOnly={useCard} required />
      </Field>
      <Field label={b.phone} hint={b.phoneHint}>
        <input className={inputCls} type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" placeholder="+32" required />
      </Field>
      {appt && !withCalendar && (
        <Field label={b.preferred} hint={b.preferredHint}>
          <input className={inputCls} value={form.preferred} onChange={(e) => set("preferred", e.target.value)} required />
        </Field>
      )}
      {maxSeats > 1 && !useCard && (
        <Field label={b.seats}>
          <select
            className={inputCls}
            value={form.seats}
            onChange={(e) => {
              set("seats", Number(e.target.value));
              setCoupon(null); // the discount depends on the amount: check the code again
            }}
          >
            {Array.from({ length: maxSeats }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label={b.note}>
        <textarea className={`${inputCls} min-h-[80px] resize-y`} value={form.note} onChange={(e) => set("note", e.target.value)} />
      </Field>

      {!useCard && gross > 0 && (
        <div>
          <button
            type="button"
            aria-expanded={codesOpen}
            onClick={() => setCodesOpen((o) => !o)}
            className="text-sm font-semibold text-forest underline decoration-forest/30 underline-offset-4 hover:text-saffron"
          >
            {k.codeToggle}
          </button>
          {codesOpen && (
            <div className="mt-4 grid gap-4 rounded-2xl bg-sand/40 p-4">
              <CouponField target={{ sessionId: s.id, seats, email: form.email.trim() || undefined }} applied={coupon} onChange={setCoupon} />
              {afterCoupon > 0 && <GiftCardField dueCents={afterCoupon} applied={gift} onChange={setGift} />}
            </div>
          )}
        </div>
      )}

      {auth.enabled && auth.ready && !auth.email && s.priceCents > 0 && (
        <div className="text-sm text-forest/70">
          {showLogin ? (
            <div className="rounded-2xl bg-sand/40 p-4">
              <LoginBox compact />
            </div>
          ) : (
            <p>
              {b.membershipLogin}{" "}
              <button type="button" onClick={() => setShowLogin(true)} className="font-semibold text-forest underline underline-offset-4 hover:text-saffron">
                {b.login}
              </button>
            </p>
          )}
        </div>
      )}

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-sand/50 p-4 text-sm text-forest">
        <input type="checkbox" checked={form.terms} onChange={(e) => set("terms", e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-saffron)]" />
        <span>
          <span className="font-semibold">{b.terms}</span>
          <span className="mt-1 block text-forest/70">{b.policy.join(" ")}</span>
        </span>
      </label>

      <div className="border-t border-forest/10 pt-5">
        {coupon && !useCard && (
          <div className="mb-2 flex items-baseline justify-between text-sm text-forest/70">
            <span>{b.discount}</span>
            <span>
              <s className="mr-2 text-forest/40">{fmtEuro(gross, lang)}</s>−{fmtEuro(coupon.discountCents, lang)}
            </span>
          </div>
        )}
        {split.used > 0 && (
          <div className="mb-2 flex items-baseline justify-between text-sm text-forest/70">
            <span>{t.gift.field}</span>
            <span>−{fmtEuro(split.used, lang)}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-bold uppercase tracking-[0.16em] text-sage">{b.total}</span>
          <span className="font-display text-3xl text-ink">{useCard ? b.oneCredit : total > 0 || split.used > 0 ? fmtEuro(total, lang) : t.agenda.free}</span>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-saffron/10 px-4 py-3 text-sm font-medium text-[#a2470b]" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !ready}
        className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-saffron px-7 py-4 text-[0.85rem] font-bold uppercase tracking-[0.16em] text-linen transition-colors duration-300 hover:bg-forest disabled:cursor-not-allowed disabled:opacity-60"
      >
        {!ready ? k.chooseTime : busy ? b.sending : useCard ? b.confirmMembership : total > 0 ? b.pay : b.confirmFree}
        {ready && !busy && <Arrow className="h-4 w-4" />}
      </button>
      <p className="text-center text-xs text-forest/55">
        {k.noAccount} {total > 0 && b.payNote}
      </p>
    </form>
  );
}
