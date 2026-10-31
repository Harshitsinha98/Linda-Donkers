import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../lib/api";
import { adminApi, centsToText, euro, toCents, type AdminCoupon } from "./adminApi";
import { Badge, Btn, ErrorNote, input, Label, Modal } from "./ui";

const APPLIES_LABEL: Record<AdminCoupon["appliesTo"], string> = {
  all: "Everything (sessions & memberships)",
  sessions: "All sessions",
  yoga: "Yoga sessions only",
  massage: "Massages & healings only",
  online: "Online sessions only",
  memberships: "Memberships only",
};

type Form = {
  code: string;
  description: string;
  kind: "percent" | "fixed";
  value: string;
  appliesTo: AdminCoupon["appliesTo"];
  minAmount: string;
  maxUses: string;
  maxUsesPerEmail: string;
  validFrom: string;
  validUntil: string;
  active: boolean;
};

const fromCoupon = (c?: AdminCoupon): Form =>
  c
    ? {
        code: c.code, description: c.description, kind: c.kind, value: c.kind === "percent" ? String(c.value) : centsToText(c.value),
        appliesTo: c.appliesTo, minAmount: c.minAmountCents ? centsToText(c.minAmountCents) : "", maxUses: String(c.maxUses),
        maxUsesPerEmail: String(c.maxUsesPerEmail), validFrom: c.validFrom, validUntil: c.validUntil, active: c.active,
      }
    : { code: "", description: "", kind: "percent", value: "10", appliesTo: "all", minAmount: "", maxUses: "0", maxUsesPerEmail: "1", validFrom: "", validUntil: "", active: true };

function CouponForm({ coupon, onClose, onSaved }: { coupon?: AdminCoupon; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Form>(() => fromCoupon(coupon));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = f.code.trim().toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return setError("The code needs 3–30 letters or digits (also - and _ allowed), no spaces.");
    const value = f.kind === "percent" ? Number(f.value) : toCents(f.value);
    if (!(value >= 1) || (f.kind === "percent" && value > 100) || !Number.isInteger(value)) {
      return setError(f.kind === "percent" ? "Enter a whole percentage between 1 and 100." : "Enter the discount in euros, e.g. 5 or 7,50.");
    }
    const minAmountCents = f.minAmount.trim() ? toCents(f.minAmount) : 0;
    if (Number.isNaN(minAmountCents)) return setError("Minimum amount: enter euros, or leave it empty.");
    const maxUses = Number(f.maxUses || 0);
    const maxUsesPerEmail = Number(f.maxUsesPerEmail || 0);
    if (!(maxUses >= 0) || !(maxUsesPerEmail >= 0)) return setError("The limits must be 0 or more.");
    if (f.validFrom && f.validUntil && f.validFrom > f.validUntil) return setError("The end date is before the start date.");

    const payload = {
      code, description: f.description, kind: f.kind, value, appliesTo: f.appliesTo, minAmountCents, maxUses, maxUsesPerEmail,
      validFrom: f.validFrom, validUntil: f.validUntil, active: f.active,
    };
    setBusy(true);
    setError("");
    try {
      if (coupon) await adminApi(`/api/admin/coupons?id=${coupon.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await adminApi("/api/admin/coupons", { method: "POST", body: JSON.stringify(payload) });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Saving failed.");
      setBusy(false);
    }
  };

  return (
    <Modal title={coupon ? `Edit code ${coupon.code}` : "New discount code"} onClose={onClose}>
      <form onSubmit={save} noValidate className="grid gap-5 sm:grid-cols-2">
        <Label text="Code *" hint="What customers type, e.g. WELKOM10. Not case-sensitive.">
          <input className={`${input} uppercase`} value={f.code} onChange={(e) => set("code", e.target.value)} placeholder="WELKOM10" />
        </Label>
        <Label text="Note (only for you)">
          <input className={input} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="e.g. newsletter November" />
        </Label>
        <Label text="Discount type">
          <select className={input} value={f.kind} onChange={(e) => set("kind", e.target.value as Form["kind"])}>
            <option value="percent">Percentage (%)</option>
            <option value="fixed">Fixed amount (€)</option>
          </select>
        </Label>
        <Label text={f.kind === "percent" ? "Percentage off" : "Euros off"} hint={f.kind === "percent" ? "100 = free" : "Per booking, never more than the total"}>
          <input className={input} inputMode="decimal" value={f.value} onChange={(e) => set("value", e.target.value)} />
        </Label>
        <Label text="Valid for" className="sm:col-span-2">
          <select className={input} value={f.appliesTo} onChange={(e) => set("appliesTo", e.target.value as Form["appliesTo"])}>
            {Object.entries(APPLIES_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Label>
        <Label text="Valid from" hint="Empty = from now">
          <input type="date" className={input} value={f.validFrom} onChange={(e) => set("validFrom", e.target.value)} />
        </Label>
        <Label text="Valid until (incl.)" hint="Empty = no end date">
          <input type="date" className={input} value={f.validUntil} onChange={(e) => set("validUntil", e.target.value)} />
        </Label>
        <Label text="Total uses" hint="0 = unlimited. e.g. 10 for 'the first 10 people'.">
          <input type="number" min={0} className={input} value={f.maxUses} onChange={(e) => set("maxUses", e.target.value)} />
        </Label>
        <Label text="Uses per person (email)" hint="0 = unlimited">
          <input type="number" min={0} className={input} value={f.maxUsesPerEmail} onChange={(e) => set("maxUsesPerEmail", e.target.value)} />
        </Label>
        <Label text="Minimum amount (€)" hint="Optional">
          <input className={input} inputMode="decimal" value={f.minAmount} onChange={(e) => set("minAmount", e.target.value)} />
        </Label>
        <label className="flex items-center gap-3 self-end pb-3 text-sm font-semibold text-forest">
          <input type="checkbox" className="h-5 w-5 accent-[var(--color-saffron)]" checked={f.active} onChange={(e) => set("active", e.target.checked)} />
          Active (can be used)
        </label>
        <div className="sm:col-span-2">
          <ErrorNote text={error} />
        </div>
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Btn kind="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" disabled={busy}>
            {busy ? "Saving…" : coupon ? "Save changes" : "Create code"}
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
      .catch(() => setError("Could not load discount codes."));
  }, []);
  useEffect(load, [load]);

  const toggle = async (c: AdminCoupon) => {
    const body = {
      code: c.code, description: c.description, kind: c.kind, value: c.value, appliesTo: c.appliesTo, minAmountCents: c.minAmountCents,
      maxUses: c.maxUses, maxUsesPerEmail: c.maxUsesPerEmail, validFrom: c.validFrom, validUntil: c.validUntil, active: !c.active,
    };
    try {
      await adminApi(`/api/admin/coupons?id=${c.id}`, { method: "PATCH", body: JSON.stringify(body) });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update.");
    }
  };

  const remove = async (c: AdminCoupon) => {
    if (!window.confirm(c.usedCount ? `${c.code} was used ${c.usedCount}×, so it will be switched off (not deleted). Continue?` : `Delete ${c.code}?`)) return;
    try {
      await adminApi(`/api/admin/coupons?id=${c.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete.");
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-forest/70">Codes customers can enter when booking a session or buying a membership. The discount is applied before payment.</p>
        <Btn onClick={() => setEditing("new")}>+ New code</Btn>
      </div>
      <div className="mt-6 grid gap-3">
        <ErrorNote text={error} />
        {!list ? (
          <p className="text-forest/60">Loading…</p>
        ) : list.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center">
            <p className="font-display text-2xl text-ink">No discount codes yet</p>
            <Btn className="mt-6" onClick={() => setEditing("new")}>
              + New code
            </Btn>
          </div>
        ) : (
          list.map((c) => {
            const expired = !!c.validUntil && c.validUntil < today;
            const usedUp = c.maxUses > 0 && c.usedCount >= c.maxUses;
            return (
              <div key={c.id} className={`rounded-2xl border border-forest/10 bg-white p-4 sm:p-5 ${c.active ? "" : "opacity-60"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xl font-bold tracking-wider text-ink">{c.code}</p>
                    <p className="text-sm text-forest/70">
                      {c.kind === "percent" ? `${c.value}% off` : `${euro(c.value)} off`} · {APPLIES_LABEL[c.appliesTo]}
                      {c.description ? ` · ${c.description}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!c.active ? <Badge tone="grey">off</Badge> : expired ? <Badge tone="red">expired</Badge> : usedUp ? <Badge tone="amber">used up</Badge> : <Badge tone="green">active</Badge>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-forest/80">
                  <span>
                    Used <strong>{c.usedCount}</strong>
                    {c.maxUses ? ` / ${c.maxUses}` : ""}×
                  </span>
                  <span>{c.maxUsesPerEmail ? `${c.maxUsesPerEmail}× per person` : "unlimited per person"}</span>
                  {(c.validFrom || c.validUntil) && (
                    <span>
                      {c.validFrom || "now"} → {c.validUntil || "no end"}
                    </span>
                  )}
                  {c.minAmountCents > 0 && <span>min. {euro(c.minAmountCents)}</span>}
                  <span>Discount given: {euro(c.discountGivenCents)}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Btn kind="ghost" onClick={() => setEditing(c)}>
                    Edit
                  </Btn>
                  <Btn kind="ghost" onClick={() => toggle(c)}>
                    {c.active ? "Switch off" : "Switch on"}
                  </Btn>
                  <Btn kind="danger" onClick={() => remove(c)}>
                    Delete
                  </Btn>
                </div>
              </div>
            );
          })
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
