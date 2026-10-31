import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../lib/api";
import { sm } from "../data/site";
import { COVERS, COVER_KEYS, OFFER_KEYS, OFFERS, type OfferKey } from "../../shared/catalog";
import { adminApi, euro } from "./adminApi";
import { Badge, Btn, ErrorNote, input, Label, Modal } from "./ui";

type Plan = {
  id: string;
  name: { nl: string; en: string };
  description: { nl: string; en: string };
  priceCents: number;
  credits: number;
  validityDays: number;
  offers: OfferKey[];
  cover: string;
  active: boolean;
  sort: number;
};

type Pass = {
  id: string;
  code: string;
  planId: string | null;
  name: { nl: string; en: string };
  email: string;
  buyerName: string;
  creditsTotal: number;
  creditsUsed: number;
  creditsLeft: number;
  validUntil: string | null;
  amountCents: number;
  discountCents: number;
  source: "web" | "manual";
  status: "pending" | "active" | "expired" | "cancelled";
  note: string;
  createdAt: string;
  bookings: number;
  paidOnline: boolean;
};

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" }) : "");
const fmtDay = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { timeZone: "Europe/Brussels", day: "numeric", month: "short", year: "numeric" }) : "-");

function PlanForm({ plan, onClose, onSaved }: { plan?: Plan; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    nameNl: plan?.name.nl ?? "",
    nameEn: plan && plan.name.en !== plan.name.nl ? plan.name.en : "",
    descriptionNl: plan?.description.nl ?? "",
    descriptionEn: plan && plan.description.en !== plan.description.nl ? plan.description.en : "",
    price: plan ? String(plan.priceCents / 100) : "",
    credits: plan ? String(plan.credits) : "10",
    validityDays: plan ? String(plan.validityDays) : "365",
    offers: plan?.offers ?? ([] as OfferKey[]),
    cover: plan?.cover ?? "",
    active: plan?.active ?? true,
    sort: plan ? String(plan.sort) : "0",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const toggle = (k: OfferKey) => set("offers", f.offers.includes(k) ? f.offers.filter((x) => x !== k) : [...f.offers, k]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(f.price.replace(",", "."));
    if (!f.nameNl.trim()) return setError("Give the membership a name (Dutch).");
    if (!(price >= 0) || f.price.trim() === "") return setError("Enter a price in euros.");
    if (!(Number(f.credits) >= 1)) return setError("Number of sessions must be at least 1.");
    if (!(Number(f.validityDays) >= 1)) return setError("Validity must be at least 1 day.");
    if (!f.offers.length) return setError("Tick at least one session type it can be used for.");
    const body = {
      nameNl: f.nameNl,
      nameEn: f.nameEn,
      descriptionNl: f.descriptionNl,
      descriptionEn: f.descriptionEn,
      priceCents: Math.round(price * 100),
      credits: Number(f.credits),
      validityDays: Number(f.validityDays),
      offers: f.offers,
      cover: f.cover,
      active: f.active,
      sort: Number(f.sort) || 0,
    };
    setBusy(true);
    setError("");
    try {
      await adminApi("/api/admin/memberships", {
        method: "POST",
        body: JSON.stringify(plan ? { action: "update-plan", id: plan.id, plan: body } : { action: "create-plan", plan: body }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Saving failed.");
      setBusy(false);
    }
  };

  return (
    <Modal title={plan ? "Edit membership" : "New membership"} onClose={onClose} wide>
      <form onSubmit={save} className="grid gap-5 sm:grid-cols-2" noValidate>
        <Label text="Name (Dutch) *">
          <input className={input} value={f.nameNl} onChange={(e) => set("nameNl", e.target.value)} placeholder="bv. 10-beurtenkaart Kundalini Yoga" />
        </Label>
        <Label text="Name (English)" hint="Optional.">
          <input className={input} value={f.nameEn} onChange={(e) => set("nameEn", e.target.value)} placeholder="e.g. 10-class card Kundalini Yoga" />
        </Label>
        <div className="grid grid-cols-3 gap-4 sm:col-span-2">
          <Label text="Price (€)">
            <input className={input} inputMode="decimal" value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="200" />
          </Label>
          <Label text="Number of sessions">
            <input type="number" min={1} className={input} value={f.credits} onChange={(e) => set("credits", e.target.value)} />
          </Label>
          <Label text="Valid (days)" hint="365 = 1 year, from purchase.">
            <input type="number" min={1} className={input} value={f.validityDays} onChange={(e) => set("validityDays", e.target.value)} />
          </Label>
        </div>
        <div className="sm:col-span-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-forest/70">Can be used for *</span>
          <p className="mt-1 text-xs text-forest/50">Sessions with this type can be booked with the membership (1 session per person).</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {OFFER_KEYS.map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm text-forest">
                <input type="checkbox" checked={f.offers.includes(k)} onChange={() => toggle(k)} className="h-4 w-4 accent-[var(--color-saffron)]" />
                {OFFERS[k].en}
              </label>
            ))}
          </div>
        </div>
        <Label text="Description (Dutch)" className="sm:col-span-2">
          <textarea className={`${input} min-h-[80px]`} value={f.descriptionNl} onChange={(e) => set("descriptionNl", e.target.value)} />
        </Label>
        <Label text="Description (English)" hint="Optional." className="sm:col-span-2">
          <textarea className={`${input} min-h-[80px]`} value={f.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} />
        </Label>
        <div className="sm:col-span-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-forest/70">Photo</span>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
            {COVER_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => set("cover", f.cover === k ? "" : k)}
                title={COVERS[k].label}
                className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${f.cover === k ? "border-saffron" : "border-transparent opacity-70 hover:opacity-100"}`}
              >
                <img src={sm(COVERS[k].src)} alt={COVERS[k].label} loading="lazy" className="h-full w-full object-cover" style={{ objectPosition: COVERS[k].focus }} />
              </button>
            ))}
          </div>
        </div>
        <Label text="Order on the website" hint="Lower numbers come first.">
          <input type="number" min={0} className={input} value={f.sort} onChange={(e) => set("sort", e.target.value)} />
        </Label>
        <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold text-forest">
          <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 accent-[var(--color-saffron)]" />
          For sale on the website
        </label>
        <div className="sm:col-span-2">
          <ErrorNote text={error} />
        </div>
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Btn kind="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" disabled={busy}>
            {busy ? "Saving…" : plan ? "Save" : "Create membership"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

function ManualPassForm({ plans, onClose, onSaved }: { plans: Plan[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ planId: plans[0]?.id ?? "", email: "", buyerName: "", amount: plans[0] ? String(plans[0].priceCents / 100) : "", note: "", sendEmail: true });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return setError("Enter the customer's email address. They log in with it to use the membership.");
    const amount = Number(f.amount.replace(",", ".") || "0");
    setBusy(true);
    setError("");
    try {
      await adminApi("/api/admin/memberships", {
        method: "POST",
        body: JSON.stringify({ action: "manual-pass", pass: { planId: f.planId, email: f.email, buyerName: f.buyerName, amountCents: Math.round(amount * 100), note: f.note, sendEmail: f.sendEmail } }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Saving failed.");
      setBusy(false);
    }
  };

  return (
    <Modal title="Add a membership sold by you" onClose={onClose}>
      <p className="-mt-3 mb-5 text-sm text-forest/70">For cash or bank transfer. It starts today. The customer logs in on the website with this email to book with it.</p>
      <form onSubmit={save} className="grid gap-5 sm:grid-cols-2" noValidate>
        <Label text="Membership" className="sm:col-span-2">
          <select
            className={input}
            value={f.planId}
            onChange={(e) => {
              const p = plans.find((x) => x.id === e.target.value);
              setF((x) => ({ ...x, planId: e.target.value, amount: p ? String(p.priceCents / 100) : x.amount }));
            }}
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name.nl} · {euro(p.priceCents)}
              </option>
            ))}
          </select>
        </Label>
        <Label text="Customer email *">
          <input type="email" className={input} value={f.email} onChange={(e) => set("email", e.target.value)} />
        </Label>
        <Label text="Customer name">
          <input className={input} value={f.buyerName} onChange={(e) => set("buyerName", e.target.value)} />
        </Label>
        <Label text="Amount received (€)">
          <input className={input} inputMode="decimal" value={f.amount} onChange={(e) => set("amount", e.target.value)} />
        </Label>
        <Label text="Note (only for you)">
          <input className={input} value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="e.g. paid cash" />
        </Label>
        <label className="flex items-center gap-2 text-sm font-semibold text-forest sm:col-span-2">
          <input type="checkbox" checked={f.sendEmail} onChange={(e) => set("sendEmail", e.target.checked)} className="h-4 w-4 accent-[var(--color-saffron)]" />
          Email the membership details to the customer
        </label>
        <div className="sm:col-span-2">
          <ErrorNote text={error} />
        </div>
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Btn kind="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" disabled={busy || !f.planId}>
            {busy ? "Saving…" : "Add membership"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

function PassEdit({ pass, onClose, onSaved }: { pass: Pass; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ creditsUsed: String(pass.creditsUsed), validUntil: day(pass.validUntil), note: pass.note, cancelled: pass.status === "cancelled" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await adminApi("/api/admin/memberships", {
        method: "POST",
        body: JSON.stringify({ action: "update-pass", id: pass.id, pass: { creditsUsed: Number(f.creditsUsed), validUntil: f.validUntil, note: f.note, cancelled: f.cancelled } }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Saving failed.");
      setBusy(false);
    }
  };
  return (
    <Modal title={`${pass.code} · ${pass.buyerName || pass.email}`} onClose={onClose}>
      <form onSubmit={save} className="grid gap-5 sm:grid-cols-2" noValidate>
        <Label text={`Sessions used (of ${pass.creditsTotal})`}>
          <input type="number" min={0} max={pass.creditsTotal} className={input} value={f.creditsUsed} onChange={(e) => setF({ ...f, creditsUsed: e.target.value })} />
        </Label>
        <Label text="Valid until" hint="Extend after an illness or holiday.">
          <input type="date" className={input} value={f.validUntil} onChange={(e) => setF({ ...f, validUntil: e.target.value })} />
        </Label>
        <Label text="Note" className="sm:col-span-2">
          <input className={input} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </Label>
        <label className="flex items-center gap-2 text-sm font-semibold text-red-700 sm:col-span-2">
          <input type="checkbox" checked={f.cancelled} onChange={(e) => setF({ ...f, cancelled: e.target.checked })} className="h-4 w-4" />
          Cancelled (can no longer be used; refund it yourself in Stripe if needed)
        </label>
        <div className="sm:col-span-2">
          <ErrorNote text={error} />
        </div>
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Btn kind="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

export function MembershipsTab() {
  const [data, setData] = useState<{ plans: Plan[]; passes: Pass[] } | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Plan | "new" | null>(null);
  const [manual, setManual] = useState(false);
  const [passEdit, setPassEdit] = useState<Pass | null>(null);
  const [q, setQ] = useState("");
  const load = useCallback(() => {
    adminApi<{ plans: Plan[]; passes: Pass[] }>("/api/admin/memberships")
      .then(setData)
      .catch(() => setError("Could not load memberships."));
  }, []);
  useEffect(load, [load]);

  const post = async (body: object) => {
    try {
      await adminApi("/api/admin/memberships", { method: "POST", body: JSON.stringify(body) });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  };

  const needle = q.trim().toLowerCase();
  const passes = (data?.passes ?? []).filter((p) => !needle || [p.email, p.buyerName, p.code, p.name.nl].some((v) => v.toLowerCase().includes(needle)));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-ink">Memberships for sale</h2>
        <div className="flex gap-2">
          {data && data.plans.length === 0 && (
            <Btn kind="ghost" onClick={() => post({ action: "seed-plans" })}>
              Add the standard 3
            </Btn>
          )}
          <Btn onClick={() => setEditing("new")}>+ New membership</Btn>
        </div>
      </div>
      <ErrorNote text={error} />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {!data ? (
          <p className="text-forest/60">Loading…</p>
        ) : data.plans.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-forest/60 sm:col-span-2">No memberships yet.</p>
        ) : (
          data.plans.map((p) => (
            <div key={p.id} className={`rounded-2xl bg-linen p-5 ${p.active ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-display text-xl leading-snug text-ink">{p.name.nl}</p>
                {p.active ? <Badge tone="green">for sale</Badge> : <Badge tone="grey">hidden</Badge>}
              </div>
              <p className="mt-2 text-sm text-forest">
                <strong>{euro(p.priceCents)}</strong> · {p.credits} sessions · {p.validityDays} days
              </p>
              <p className="mt-1 text-xs text-forest/60">{p.offers.map((o) => OFFERS[o].en).join(", ")}</p>
              <div className="mt-4 flex gap-2">
                <Btn kind="ghost" onClick={() => setEditing(p)}>
                  Edit
                </Btn>
                <Btn
                  kind="danger"
                  onClick={() => window.confirm(`Delete "${p.name.nl}"? If it was already sold it will be hidden instead.`) && post({ action: "delete-plan", id: p.id })}
                >
                  Delete
                </Btn>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-ink">Sold memberships</h2>
        <div className="flex flex-wrap gap-2">
          <input className={`${input} mt-0 w-56`} placeholder="Search name, email, code…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Btn kind="dark" onClick={() => setManual(true)} disabled={!data?.plans.length}>
            + Add sold by me
          </Btn>
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        {data && passes.length === 0 && <p className="rounded-2xl bg-white p-6 text-center text-forest/60">No memberships sold yet.</p>}
        {passes.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink">{p.buyerName || p.email}</span>
                <Badge tone={p.status === "active" ? "green" : p.status === "pending" ? "amber" : "grey"}>{p.status}</Badge>
                {p.source === "manual" && <Badge tone="blue">added by you</Badge>}
              </div>
              <p className="mt-1 text-sm text-forest/70">
                {p.name.nl} · <span className="font-mono">{p.code}</span> · {p.email}
              </p>
              <p className="mt-1 text-sm text-forest">
                <strong>{p.creditsLeft}</strong> of {p.creditsTotal} left · valid until {fmtDay(p.validUntil)} · {euro(p.amountCents)}
                {p.discountCents ? ` (−${euro(p.discountCents)} coupon)` : ""}
              </p>
            </div>
            {p.status !== "pending" && (
              <Btn kind="ghost" onClick={() => setPassEdit(p)}>
                Adjust
              </Btn>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <PlanForm
          plan={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {manual && data && (
        <ManualPassForm
          plans={data.plans}
          onClose={() => setManual(false)}
          onSaved={() => {
            setManual(false);
            load();
          }}
        />
      )}
      {passEdit && (
        <PassEdit
          pass={passEdit}
          onClose={() => setPassEdit(null)}
          onSaved={() => {
            setPassEdit(null);
            load();
          }}
        />
      )}
    </>
  );
}
