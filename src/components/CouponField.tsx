import { useState } from "react";
import { useLang } from "../i18n/LanguageContext";
import { api, ApiError, fmtEuro } from "../lib/api";

export type AppliedCoupon = { code: string; discountCents: number; totalCents: number };

const inputCls =
  "w-full rounded-xl border border-forest/15 bg-cream/60 px-4 py-3 text-base uppercase text-ink outline-none transition-colors placeholder:normal-case placeholder:text-forest/30 focus:border-saffron";

/**
 * Discount code input. Checks the code with the server (/api/coupon) so the visitor sees the
 * new total before paying; the server checks it again at checkout.
 */
export function CouponField({
  target,
  applied,
  onChange,
}: {
  target: { sessionId: string; seats: number; email?: string } | { planId: string; email?: string };
  applied: AppliedCoupon | null;
  onChange: (c: AppliedCoupon | null) => void;
}) {
  const { t, lang } = useLang();
  const b = t.booking;
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    const c = code.trim();
    if (!c) return;
    setBusy(true);
    setError("");
    try {
      const r = await api<AppliedCoupon>("/api/coupon", { method: "POST", body: JSON.stringify({ code: c, ...target }) });
      onChange({ code: r.code, discountCents: r.discountCents, totalCents: r.totalCents });
    } catch (err) {
      const k = err instanceof ApiError ? err.code : "";
      setError(b.couponErrors[k] ?? (k === "rate_limited" ? b.errors.rate : b.couponErrors.generic));
      onChange(null);
    }
    setBusy(false);
  };

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl bg-[#e7f3e4] px-4 py-3 text-sm text-forest">
        <span className="font-semibold">{b.couponApplied(applied.code, fmtEuro(applied.discountCents, lang))}</span>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setCode("");
          }}
          className="text-xs font-bold uppercase tracking-[0.14em] underline underline-offset-4"
        >
          {b.couponRemove}
        </button>
      </div>
    );
  }

  return (
    <div>
      <span className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-sage">{b.coupon}</span>
      <div className="mt-2 flex gap-2">
        <input
          className={inputCls}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
          aria-label={b.coupon}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={apply}
          disabled={busy || !code.trim()}
          className="shrink-0 rounded-xl border border-forest/20 px-4 text-sm font-semibold text-forest transition-colors hover:border-saffron hover:text-saffron disabled:opacity-50"
        >
          {busy ? "…" : b.couponApply}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-[#a2470b]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
