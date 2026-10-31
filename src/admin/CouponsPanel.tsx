import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../lib/api";
import { OFFER_KEYS, OFFERS, type OfferKey } from "../../shared/catalog";
import { adminApi, euro } from "./adminApi";
import { Badge, Btn, ErrorNote, input, Label, Modal } from "./ui";

export type AdminCoupon = {
  id: string;
  code: string;
  description: string;
  kind: "percent" | "amount";
  value: number;
  appliesTo: "all" | "sessions" | "memberships";
  offers: OfferKey[];
  maxUses: number | null;
  oncePerEmail: boolean;
  validFrom: string | null;
  validUntil: string | null;
  active: boolean;
  uses: number;
};

const APPLIES = { all: "Sessions and memberships", sessions: "Sessions only", memberships: "Memberships only" } as const;

const describe = (c: AdminCoupon) => (c.kind === "percent" ? `${c.value}% off` : `${euro(c.value)} off`);

/** Random code like LINDA-7K3F. */
const suggest = () => `LINDA-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

function CouponForm({ coupon, onClose, onSaved }: { coupon?: AdminCoupon; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    code: coupon?.code ?? suggest(),
    description: coupon?.description ?? "",
    kind: coupon?.kind ?? ("percent" as "percent" | "amount"),
    value: coupon ? (coupon.kind === "amount" ? String(coupon.value / 100) : String(coupon.value)) : "10",
    appliesTo: coupon?.appliesTo ?? ("all" as AdminCoupon["appliesTo"]),
    offers: coupon?.offers ?? ([] as OfferKey[]),
    maxUses: coupon?.maxUses ? String(coupon.maxUses) : "",
    oncePerEmail: coupon?.oncePerEmail ?? false,
    validFrom: coupon?.validFrom ?? "",
    validUntil: coupon?.validUntil ?? "",
    active: coupon?.active ?? true,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const toggleOffer = (k: OfferKey) => set("offers", f.offers.includes(k) ? f.offers.filter((x) => x !== k) : [...f.offers, k]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(f.value.replace(",", "."));
    if (!(n > 0)) return setError("Enter a discount above 0.");
    if (f.kind === "percent" && n > 100) return setError("A percentage can be at most 100.");
    const body = {
      code: f.code.trim(),
      description: f.description,
      kind: f.kind,
      value: f.kind === "amount" ? Math.round(n * 100) : Math.round(n),
      appliesTo: f.appliesTo,
      offers: f.appliesTo === "memberships" ? [] : f.offers,
      maxUses: f.maxUses ? Number(f.maxUses) : null,
      oncePerEmail: f.oncePerEmail,
      validFrom: f.validFrom || null,
      validUntil: f.validUntil || null,
      active: f.active,
    };
    setBusy(true);
    setError("");
    try {
      await adminApi(coupon ? `/api/admin/coupons?id=${coupon.id}` : "/api/admin/coupons", { method: coupon ? "PATCH" : "POST", body: JSON.stringify(body) });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Saving failed.");
      setBusy(false);
    }
  };

  return (
    <Modal title={coupon ? "Edit coupon" : "New coupon"} onClose={onClose}>
      <form onSubmit={save} className="grid gap-5 sm:grid-cols-2" noValidate>
        <Label text="Code *" hint="Customers type this at checkout. Letters, numbers, - and _.">
          <input className={`${input} uppercase`} value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase())} />
        </Label>
        <Label text="Note (only for you)">
          <input className={input} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="e.g. Newsletter November" />
        </Label>
        <Label text="Discount type">
          <select className={input} value={f.kind} onChange={(e) => set("kind", e.target.value as "percent" | "amount")}>
            <option value="percent">Percentage (%)</option>
            <option value="amount">Fixed amount (€)</option>
          </select>
        </Label>
        <Label text={f.kind === "percent" ? "Percentage off" : "Euros off"}>
          <input className={input} inputMode="decimal" value={f.value} onChange={(e) => set("value", e.target.value)} />
        </Label>
        <Label text="Valid for" className="sm:col-span-2">
          <select className={input} value={f.appliesTo} onChange={(e) => set("appliesTo", e.target.value as AdminCoupon["appliesTo"])}>
            {Object.entries(APPLIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Label>
        {f.appliesTo !== "memberships" && (
          <div className="sm:col-span-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-forest/70">Only these sessions (optional)</span>
            <p className="mt-1 text-xs text-forest/50">Leave all unticked for every session.</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {OFFER_KEYS.map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm text-forest">
                  <input type="checkbox" checked={f.offers.includes(k)} onChange={() => toggleOffer(k)} className="h-4 w-4 accent-[var(--color-saffron)]" />
                  {OFFERS[k].en}
                </label>
              ))}
            </div>
          </div>
        )}
        <Label text="Start date (optional)">
          <input type="date" className={input} value={f.validFrom} onChange={(e) => set("validFrom", e.target.value)} />
        </Label>
        <Label text="End date (optional)" hint="Last day the code works.">
          <input type="date" className={input} value={f.validUntil} onChange={(e) => set("validUntil", e.target.value)} />
        </Label>
        <Label text="Max number of uses (optional)" hint="Empty = unlimited.">
          <input type="number" min={1} className={input} value={f.maxUses} onChange={(e) => set("maxUses", e.target.value)} />
        </Label>
        <div className="grid content-end gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-forest">
            <input type="checkbox" checked={f.oncePerEmail} onChange={(e) => set("oncePerEmail", e.target.checked)} className="h-4 w-4 accent-[var(--color-saffron)]" />
            Once per email address
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-forest">
            <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 accent-[var(--color-saffron)]" />
            Active
          </label>
        </div>
        <div className="sm:col-span-2">
          <ErrorNote text={error} />
        </div>
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Btn kind="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" disabled={busy}>
            {busy ? "Saving…" : coupon ? "Save" : "Create coupon"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

export function CouponsTab() {
  const [list, setList] = useState<AdminCoupon[] | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<AdminCoupon | "new" | null>(null);
  const load = useCallback(() => {
    adminApi<{ coupons: AdminCoupon[] }>("/api/admin/coupons")
      .then((d) => setList(d.coupons))
      .catch(() => setError("Could not load coupons."));
  }, []);
  useEffect(load, [load]);

  const remove = async (c: AdminCoupon) => {
    if (!window.confirm(`Delete coupon ${c.code}?${c.uses ? "\n\nIt has been used, so it will be switched off instead." : ""}`)) return;
    try {
      await adminApi(`/api/admin/coupons?id=${c.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete.");
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-forest/70">Discount codes for bookings and memberships. Customers enter the code in the booking or membership form.</p>
        <Btn onClick={() => setEditing("new")}>+ New coupon</Btn>
      </div>
      <div className="mt-6 grid gap-3">
        <ErrorNote text={error} />
        {!list ? (
          <p className="text-forest/60">Loading…</p>
        ) : list.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-forest/60">No coupons yet.</p>
        ) : (
          list.map((c) => (
            <div key={c.id} className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-linen p-5 ${c.active ? "" : "opacity-60"}`}>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-forest px-2.5 py-1 font-mono text-sm font-bold text-linen">{c.code}</span>
                  <span className="font-semibold text-ink">{describe(c)}</span>
                  {c.active ? <Badge tone="green">active</Badge> : <Badge tone="grey">off</Badge>}
                </div>
                <p className="mt-2 text-sm text-forest/70">
                  {APPLIES[c.appliesTo]}
                  {c.offers.length ? ` · ${c.offers.map((o) => OFFERS[o].en).join(", ")}` : ""}
                  {c.validFrom ? ` · from ${c.validFrom}` : ""}
                  {c.validUntil ? ` · until ${c.validUntil}` : ""}
                  {c.oncePerEmail ? " · once per email" : ""}
                </p>
                <p className="mt-1 text-sm font-semibold text-forest">
                  Used {c.uses}
                  {c.maxUses ? ` / ${c.maxUses}` : ""} ×{c.description ? <span className="font-normal text-forest/60"> · {c.description}</span> : null}
                </p>
              </div>
              <div className="flex gap-2">
                <Btn kind="ghost" onClick={() => setEditing(c)}>
                  Edit
                </Btn>
                <Btn kind="danger" onClick={() => remove(c)}>
                  Delete
                </Btn>
              </div>
            </div>
          ))
        )}
      </div>
      {editing && (
        <CouponForm
          coupon={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </>
  );
}
