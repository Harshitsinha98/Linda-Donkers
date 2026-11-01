import { useState } from "react";
import { useLang } from "../i18n/LanguageContext";
import { api, ApiError, fmtEuro } from "../lib/api";

export type AppliedGift = { code: string; balanceCents: number };

/** How much of `dueCents` a gift card pays, and what is left to pay via Stripe. */
export const giftSplit = (gift: AppliedGift | null, dueCents: number) => {
  const used = gift ? Math.min(gift.balanceCents, Math.max(0, dueCents)) : 0;
  return { used, rest: Math.max(0, dueCents - used), left: gift ? gift.balanceCents - used : 0 };
};

const inputCls =
  "w-full rounded-xl border border-forest/15 bg-cream/60 px-4 py-3 text-base uppercase text-ink outline-none transition-colors placeholder:normal-case placeholder:text-forest/30 focus:border-saffron";

/**
 * Gift card code input. Checks the balance with the server so the visitor sees the split
 * (gift card + Stripe) before paying; the server takes the balance again, atomically, at checkout.
 */
export function GiftCardField({ dueCents, applied, onChange }: { dueCents: number; applied: AppliedGift | null; onChange: (g: AppliedGift | null) => void }) {
  const { t, lang } = useLang();
  const g = t.gift;
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    const c = code.trim();
    if (!c) return;
    setBusy(true);
    setError("");
    try {
      const r = await api<{ giftCard: { code: string; balanceCents: number } }>("/api/checkout?giftcard=check", {
        method: "POST",
        body: JSON.stringify({ code: c }),
      });
      onChange({ code: r.giftCard.code, balanceCents: r.giftCard.balanceCents });
    } catch (err) {
      const k = err instanceof ApiError ? err.code : "";
      setError(g.errors[k] ?? (k === "rate_limited" ? t.booking.errors.rate : g.errors.generic));
      onChange(null);
    }
    setBusy(false);
  };

  if (applied) {
    const split = giftSplit(applied, dueCents);
    return (
      <div className="rounded-xl bg-[#e7f3e4] px-4 py-3 text-sm text-forest">
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold">{g.applied(fmtEuro(split.used, lang), fmtEuro(split.left, lang))}</span>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setCode("");
            }}
            className="shrink-0 text-xs font-bold uppercase tracking-[0.14em] underline underline-offset-4"
          >
            {g.remove}
          </button>
        </div>
        {split.rest > 0 && <p className="mt-1 text-forest/70">{g.rest(fmtEuro(split.rest, lang))}</p>}
      </div>
    );
  }

  return (
    <div>
      <span className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-sage">{g.field}</span>
      <div className="mt-2 flex gap-2">
        <input
          className={inputCls}
          value={code}
          placeholder={g.fieldPlaceholder}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
          aria-label={g.field}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={apply}
          disabled={busy || !code.trim()}
          className="shrink-0 rounded-xl border border-forest/20 px-4 text-sm font-semibold text-forest transition-colors hover:border-saffron hover:text-saffron disabled:opacity-50"
        >
          {busy ? "…" : g.apply}
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
