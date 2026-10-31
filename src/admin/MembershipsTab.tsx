import { useCallback, useEffect, useState } from "react";
import { ApiError, photoFocus, photoSrc } from "../lib/api";
import { sm } from "../data/site";
import { OFFERING_GROUPS, PHOTO_KEYS } from "../../shared/catalog";
import { adminApi, centsToText, dateOnly, euro, toCents, type AdminMembership, type AdminPlan } from "./adminApi";
import { Badge, Btn, ErrorNote, input, Label, Modal } from "./ui";

const SCOPE_OPTIONS: [string, string][] = [
  ["all", "Every session"],
  ["section:yoga", "All yoga sessions (in person)"],
  ["section:massage", "All massages & healings (in person)"],
  ["section:online", "All online sessions"],
  ...OFFERING_GROUPS.map((g) => [g.key, g.label] as [string, string]),
];
const scopeLabel = (scope: string[]) => scope.map((k) => SCOPE_OPTIONS.find(([v]) => v === k)?.[1] ?? k).join(", ");

type PlanForm = {
  nameNl: string;
  nameEn: string;
  descriptionNl: string;
  descriptionEn: string;
  price: string;
  credits: string;
  validityDays: string;
  scope: string[];
  photo: string;
  sort: string;
  status: "active" | "hidden";
};

const fromPlan = (p?: AdminPlan): PlanForm =>
  p
    ? {
        nameNl: p.name.nl, nameEn: p.name.en === p.name.nl ? "" : p.name.en, descriptionNl: p.description.nl,
        descriptionEn: p.description.en === p.description.nl ? "" : p.description.en, price: centsToText(p.priceCents),
        credits: String(p.credits), validityDays: String(p.validityDays), scope: p.scope, photo: p.photo, sort: "0",
        status: p.status === "hidden" ? "hidden" : "active",
      }
    : { nameNl: "", nameEn: "", descriptionNl: "", descriptionEn: "", price: "", credits: "10", validityDays: "365", scope: [], photo: "", sort: "0", status: "active" };

function PlanEditor({ plan, onClose, onSaved }: { plan?: AdminPlan; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<PlanForm>(() => fromPlan(plan));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof PlanForm>(k: K, v: PlanForm[K]) => setF((x) => ({ ...x, [k]: v }));
  const toggleScope = (k: string) => set("scope", f.scope.includes(k) ? f.scope.filter((x) => x !== k) : [...f.scope, k]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceCents = toCents(f.price);
    const credits = Number(f.credits);
    const validityDays = Number(f.validityDays);
    if (!f.nameNl.trim()) return setError("Please give the membership a name (Dutch).");
    if (Number.isNaN(priceCents)) return setError("Please enter a price in euros.");
    if (!(credits >= 0) || !Number.isInteger(credits)) return setError("Number of sessions: a whole number, 0 = unlimited.");
    if (!(validityDays >= 1)) return setError("Validity must be at least 1 day.");
    if (f.scope.length === 0) return setError("Choose which sessions this membership can be used for.");
    const payload = {
      nameNl: f.nameNl, nameEn: f.nameEn, descriptionNl: f.descriptionNl, descriptionEn: f.descriptionEn, priceCents, credits, validityDays,
      scope: f.scope, photo: f.photo, sort: Number(f.sort) || 0, status: f.status,
    };
    setBusy(true);
    setError("");
    try {
      await adminApi("/api/admin/memberships", {
        method: "POST",
        body: JSON.stringify(plan ? { action: "updatePlan", id: plan.id, plan: payload } : { action: "createPlan", plan: payload }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Saving failed.");
      setBusy(false);
    }
  };

  return (
    <Modal title={plan ? "Edit membership" : "New membership"} onClose={onClose} wide>
      <form onSubmit={save} noValidate className="grid gap-5 sm:grid-cols-2">
        <Label text="Name (Dutch) *" className="sm:col-span-2">
          <input className={input} value={f.nameNl} onChange={(e) => set("nameNl", e.target.value)} placeholder="bv. 10-beurtenkaart Kundalini Yoga" />
        </Label>
        <Label text="Name (English)" hint="Optional" className="sm:col-span-2">
          <input className={input} value={f.nameEn} onChange={(e) => set("nameEn", e.target.value)} placeholder="e.g. 10-session card Kundalini Yoga" />
        </Label>
        <Label text="Price (€)">
          <input className={input} inputMode="decimal" value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="200" />
        </Label>
        <Label text="Number of sessions" hint="0 = unlimited (subscription)">
          <input type="number" min={0} className={input} value={f.credits} onChange={(e) => set("credits", e.target.value)} />
        </Label>
        <Label text="Valid for (days)" hint="Counted from the day of purchase" className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            <input type="number" min={1} className={`${input} max-w-[8rem]`} value={f.validityDays} onChange={(e) => set("validityDays", e.target.value)} />
            {[
              ["1 month", "30"],
              ["3 months", "90"],
              ["6 months", "180"],
              ["1 year", "365"],
            ].map(([l, v]) => (
              <button key={v} type="button" onClick={() => set("validityDays", v)} className={`mt-1.5 rounded-full border px-3 py-2 text-xs font-semibold ${f.validityDays === v ? "border-saffron bg-saffron text-white" : "border-forest/20 text-forest"}`}>
                {l}
              </button>
            ))}
          </div>
        </Label>
        <Label text="Visibility">
          <select className={input} value={f.status} onChange={(e) => set("status", e.target.value as PlanForm["status"])}>
            <option value="active">On sale on the website</option>
            <option value="hidden">Hidden (only you can give it)</option>
          </select>
        </Label>

        <div className="sm:col-span-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-forest/70">Can be used for *</span>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {SCOPE_OPTIONS.map(([k, label]) => (
              <label key={k} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm text-forest">
                <input type="checkbox" className="h-4 w-4 accent-[var(--color-saffron)]" checked={f.scope.includes(k)} onChange={() => toggleScope(k)} />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-forest/70">Photo</span>
          <div className="mt-2 grid grid-cols-6 gap-2 sm:grid-cols-8">
            {PHOTO_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => set("photo", f.photo === k ? "" : k)}
                aria-pressed={f.photo === k}
                title={k}
                className={`aspect-square overflow-hidden rounded-lg border-2 ${f.photo === k ? "border-saffron" : "border-transparent opacity-80 hover:opacity-100"}`}
              >
                <img src={sm(photoSrc(k))} alt={k} loading="lazy" style={{ objectPosition: photoFocus(k) }} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <Label text="Description (Dutch)" className="sm:col-span-2">
          <textarea className={`${input} min-h-[90px]`} value={f.descriptionNl} onChange={(e) => set("descriptionNl", e.target.value)} />
        </Label>
        <Label text="Description (English)" hint="Optional" className="sm:col-span-2">
          <textarea className={`${input} min-h-[90px]`} value={f.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} />
        </Label>
        {plan && plan.sold > 0 && (
          <p className="text-xs text-forest/60 sm:col-span-2">Changes apply to new purchases. Memberships already sold keep their sessions, scope and end date.</p>
        )}
        <div className="sm:col-span-2">
          <ErrorNote text={error} />
        </div>
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Btn kind="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" disabled={busy}>
            {busy ? "Saving…" : plan ? "Save changes" : "Create membership"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

function GrantForm({ plans, onClose, onSaved }: { plans: AdminPlan[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ planId: plans[0]?.id ?? "", name: "", email: "", phone: "", amount: plans[0] ? centsToText(plans[0].priceCents) : "0", sendEmail: true });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = toCents(f.amount || "0");
    if (!f.name.trim() || !/^\S+@\S+\.\S+$/.test(f.email.trim())) return setError("Name and a valid email address are needed (the customer logs in with it).");
    if (Number.isNaN(amountCents)) return setError("Amount paid: enter euros.");
    setBusy(true);
    try {
      await adminApi("/api/admin/memberships", {
        method: "POST",
        body: JSON.stringify({ action: "grant", membership: { planId: f.planId, name: f.name, email: f.email, phone: f.phone, amountCents, sendEmail: f.sendEmail } }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Saving failed.");
      setBusy(false);
    }
  };
  return (
    <Modal title="Add a membership (paid cash / transfer)" onClose={onClose}>
      <form onSubmit={save} noValidate className="grid gap-4 sm:grid-cols-2">
        <Label text="Membership" className="sm:col-span-2">
          <select
            className={input}
            value={f.planId}
            onChange={(e) => {
              const p = plans.find((x) => x.id === e.target.value);
              setF({ ...f, planId: e.target.value, amount: p ? centsToText(p.priceCents) : f.amount });
            }}
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name.nl}
              </option>
            ))}
          </select>
        </Label>
        <Label text="Name">
          <input className={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Label>
        <Label text="Email" hint="The customer logs in with this address">
          <input className={input} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Label>
        <Label text="Phone">
          <input className={input} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </Label>
        <Label text="Amount paid (€)">
          <input className={input} inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        </Label>
        <label className="flex items-center gap-3 text-sm font-semibold text-forest sm:col-span-2">
          <input type="checkbox" className="h-5 w-5 accent-[var(--color-saffron)]" checked={f.sendEmail} onChange={(e) => setF({ ...f, sendEmail: e.target.checked })} />
          Email the membership details to the customer
        </label>
        <div className="sm:col-span-2">
          <ErrorNote text={error} />
        </div>
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Btn kind="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" disabled={busy}>
            {busy ? "Saving…" : "Add membership"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

function SoldRow({ m, onChanged }: { m: AdminMembership; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [used, setUsed] = useState(String(m.creditsUsed));
  const [until, setUntil] = useState(m.expiresAt?.slice(0, 10) ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const post = async (body: object) => {
    setBusy(true);
    setError("");
    try {
      await adminApi("/api/admin/memberships", { method: "POST", body: JSON.stringify(body) });
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
    setBusy(false);
  };

  const cancel = () => {
    const refund = m.paidOnline && m.amountCents > 0 && window.confirm(`Cancel this membership of ${m.holder} and refund ${euro(m.amountCents)} via Stripe?\n\nOK = cancel + refund. Cancel = choose without refund.`);
    if (!refund && !window.confirm(`Cancel this membership of ${m.holder} without a refund?`)) return;
    post({ action: "cancel", id: m.id, refund });
  };

  const tone = m.status === "active" ? "green" : m.status === "cancelled" ? "red" : "grey";
  return (
    <div className="rounded-2xl border border-forest/10 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-ink">{m.holder}</p>
          <p className="text-sm text-forest/70">
            {m.name.nl} · <a href={`mailto:${m.email}`} className="underline">{m.email}</a>
            {m.phone ? ` · ${m.phone}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone={tone}>{m.status}</Badge>
          {m.source === "manual" && <Badge tone="blue">added by you</Badge>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-forest/80">
        <span>
          <strong>{m.creditsLeft === null ? "Unlimited" : `${m.creditsLeft} of ${m.creditsTotal} left`}</strong>
        </span>
        <span>Valid until {m.expiresAt ? dateOnly(m.expiresAt) : "-"}</span>
        <span>Paid {euro(m.amountCents)}{m.couponCode ? ` (code ${m.couponCode}, −${euro(m.discountCents)})` : ""}</span>
        <span>Ref {m.ref}</span>
      </div>
      {m.status === "active" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn kind="ghost" onClick={() => setEditing((x) => !x)}>
            Adjust
          </Btn>
          <Btn kind="danger" disabled={busy} onClick={cancel}>
            Cancel membership
          </Btn>
        </div>
      )}
      {editing && (
        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl bg-cream p-4">
          <Label text={`Sessions used${m.creditsTotal ? ` (of ${m.creditsTotal})` : ""}`}>
            <input type="number" min={0} className={`${input} max-w-[8rem]`} value={used} onChange={(e) => setUsed(e.target.value)} />
          </Label>
          <Label text="Valid until">
            <input type="date" className={input} value={until} onChange={(e) => setUntil(e.target.value)} />
          </Label>
          <Btn disabled={busy} onClick={() => post({ action: "adjust", membership: { id: m.id, creditsUsed: Number(used) || 0, expiresAt: until } })}>
            Save
          </Btn>
        </div>
      )}
      <div className="mt-2">
        <ErrorNote text={error} />
      </div>
    </div>
  );
}

export function MembershipsTab() {
  const [view, setView] = useState<"plans" | "sold">("plans");
  const [plans, setPlans] = useState<AdminPlan[] | null>(null);
  const [sold, setSold] = useState<AdminMembership[] | null>(null);
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<AdminPlan | "new" | null>(null);
  const [granting, setGranting] = useState(false);

  const loadPlans = useCallback(() => {
    adminApi<{ plans: AdminPlan[] }>("/api/admin/memberships?view=plans")
      .then((d) => setPlans(d.plans))
      .catch(() => setError("Could not load memberships."));
  }, []);
  const loadSold = useCallback(() => {
    adminApi<{ memberships: AdminMembership[] }>(`/api/admin/memberships?view=sold&filter=${filter}`)
      .then((d) => setSold(d.memberships))
      .catch(() => setError("Could not load sold memberships."));
  }, [filter]);
  useEffect(loadPlans, [loadPlans]);
  useEffect(() => {
    if (view === "sold") loadSold();
  }, [view, loadSold]);

  const removePlan = async (p: AdminPlan) => {
    if (!window.confirm(p.sold ? `"${p.name.nl}" was sold ${p.sold}×. It will be removed from the website; sold memberships keep working.` : `Delete "${p.name.nl}"?`)) return;
    try {
      await adminApi("/api/admin/memberships", { method: "POST", body: JSON.stringify({ action: "deletePlan", id: p.id }) });
      loadPlans();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete.");
    }
  };

  const seed = async () => {
    try {
      await adminApi("/api/admin/memberships", { method: "POST", body: JSON.stringify({ action: "seedPlans" }) });
      loadPlans();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create.");
    }
  };

  const needle = q.trim().toLowerCase();
  const shownSold = (sold ?? []).filter((m) => !needle || [m.holder, m.email, m.ref, m.name.nl].some((v) => v.toLowerCase().includes(needle)));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-full border border-forest/15 bg-white p-1">
          {(
            [
              ["plans", "Memberships for sale"],
              ["sold", "Sold"],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setView(k)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${view === k ? "bg-forest text-linen" : "text-forest"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {plans && plans.length > 0 && (
            <Btn kind="ghost" onClick={() => setGranting(true)}>
              + Add for a customer
            </Btn>
          )}
          {view === "plans" && <Btn onClick={() => setEditing("new")}>+ New membership</Btn>}
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        <ErrorNote text={error} />
        {view === "plans" ? (
          !plans ? (
            <p className="text-forest/60">Loading…</p>
          ) : plans.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center">
              <p className="font-display text-2xl text-ink">No memberships yet</p>
              <p className="mt-2 text-forest/70">Create your own, or start with your standard cards (10× yoga €200, 5× M.E.R. €600, 5× Lomi Lomi €600).</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Btn kind="ghost" onClick={seed}>
                  Create my standard cards
                </Btn>
                <Btn onClick={() => setEditing("new")}>+ New membership</Btn>
              </div>
            </div>
          ) : (
            plans.map((p) => (
              <div key={p.id} className={`flex gap-4 rounded-2xl border border-forest/10 bg-white p-4 sm:p-5 ${p.status === "hidden" ? "opacity-70" : ""}`}>
                {p.photo && <img src={sm(photoSrc(p.photo))} alt="" style={{ objectPosition: photoFocus(p.photo) }} className="h-20 w-20 shrink-0 rounded-xl object-cover" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-display text-xl text-ink">{p.name.nl}</p>
                    {p.status === "hidden" ? <Badge tone="grey">hidden</Badge> : <Badge tone="green">on sale</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-forest/70">
                    {euro(p.priceCents)} · {p.credits ? `${p.credits} sessions` : "unlimited"} · {p.validityDays} days · {scopeLabel(p.scope)}
                  </p>
                  <p className="mt-1 text-sm text-forest/60">
                    Sold {p.sold}× · {euro(p.revenueCents)}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Btn kind="ghost" onClick={() => setEditing(p)}>
                      Edit
                    </Btn>
                    <Btn kind="danger" onClick={() => removePlan(p)}>
                      Delete
                    </Btn>
                  </div>
                </div>
              </div>
            ))
          )
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              <input className={`${input} mt-0 max-w-xs`} placeholder="Search name, email, ref…" value={q} onChange={(e) => setQ(e.target.value)} />
              <select className={`${input} mt-0 w-auto`} value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
                <option value="active">Active</option>
                <option value="all">All</option>
              </select>
            </div>
            {!sold ? (
              <p className="text-forest/60">Loading…</p>
            ) : shownSold.length === 0 ? (
              <p className="rounded-2xl bg-white p-6 text-center text-forest/60">No memberships found.</p>
            ) : (
              shownSold.map((m) => <SoldRow key={m.id} m={m} onChanged={loadSold} />)
            )}
          </>
        )}
      </div>

      {editing && (
        <PlanEditor
          plan={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadPlans();
          }}
        />
      )}
      {granting && plans && (
        <GrantForm
          plans={plans}
          onClose={() => setGranting(false)}
          onSaved={() => {
            setGranting(false);
            setView("sold");
            loadSold();
          }}
        />
      )}
    </>
  );
}
