import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../lib/api";
import { adminApi, centsToText, dateOnly, euro, toCents, when } from "./adminApi";
import { Badge, Btn, ErrorNote, input, Label, Modal } from "./ui";

type AdminGift = {
  id: string;
  ref: string;
  code: string;
  initialCents: number;
  balanceCents: number;
  buyerName: string;
  buyerEmail: string;
  recipientName: string;
  recipientEmail: string;
  message: string;
  source: "web" | "manual";
  status: "active" | "expired" | "cancelled" | "pending";
  expiresAt: string | null;
  paidCents: number;
  refundedCents: number;
  paidOnline: boolean;
  createdAt: string;
  history: { kind: string; amountCents: number; balanceAfter: number; note: string; ref: string; at: string }[];
};

const KIND_LABEL: Record<string, string> = {
  purchase: "Bought",
  redeem: "Used",
  release: "Returned (unpaid checkout)",
  refund: "Refund to card",
  adjust: "Adjusted",
  cancel: "Cancelled",
};

function GrantForm({ onClose, onSaved }: { onClose: () => void; onSaved: (code: string) => void }) {
  const [f, setF] = useState({ amount: "100", buyerName: "", buyerEmail: "", recipientName: "", recipientEmail: "", message: "", paid: "100", sendEmail: true });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = toCents(f.amount);
    const paidCents = toCents(f.paid || "0");
    if (!(amountCents >= 100)) return setError("Enter the value of the gift card in euros.");
    if (Number.isNaN(paidCents)) return setError("Amount paid: enter euros (0 if it's a present from you).");
    if (!f.buyerName.trim() || !/^\S+@\S+\.\S+$/.test(f.buyerEmail.trim())) return setError("Name and a valid email of the buyer are needed.");
    if (f.recipientEmail.trim() && !/^\S+@\S+\.\S+$/.test(f.recipientEmail.trim())) return setError("The recipient's email is not valid.");
    setBusy(true);
    setError("");
    try {
      const r = await adminApi<{ code: string }>("/api/admin/memberships", {
        method: "POST",
        body: JSON.stringify({
          action: "giftGrant",
          giftCard: {
            amountCents, paidCents, buyerName: f.buyerName, buyerEmail: f.buyerEmail, recipientName: f.recipientName,
            recipientEmail: f.recipientEmail, message: f.message, sendEmail: f.sendEmail,
          },
        }),
      });
      onSaved(r.code);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Saving failed.");
      setBusy(false);
    }
  };
  return (
    <Modal title="Add a gift card (paid cash / transfer)" onClose={onClose}>
      <form onSubmit={save} noValidate className="grid gap-4 sm:grid-cols-2">
        <Label text="Value (€)">
          <input className={input} inputMode="decimal" value={f.amount} onChange={(e) => set("amount", e.target.value)} />
        </Label>
        <Label text="Amount paid to you (€)" hint="0 if it's a present from you">
          <input className={input} inputMode="decimal" value={f.paid} onChange={(e) => set("paid", e.target.value)} />
        </Label>
        <Label text="Buyer name">
          <input className={input} value={f.buyerName} onChange={(e) => set("buyerName", e.target.value)} />
        </Label>
        <Label text="Buyer email">
          <input className={input} type="email" value={f.buyerEmail} onChange={(e) => set("buyerEmail", e.target.value)} />
        </Label>
        <Label text="Recipient name" hint="Optional">
          <input className={input} value={f.recipientName} onChange={(e) => set("recipientName", e.target.value)} />
        </Label>
        <Label text="Recipient email" hint="Optional. Then the recipient gets the code.">
          <input className={input} type="email" value={f.recipientEmail} onChange={(e) => set("recipientEmail", e.target.value)} />
        </Label>
        <Label text="Message" className="sm:col-span-2">
          <textarea className={`${input} min-h-[70px]`} value={f.message} onChange={(e) => set("message", e.target.value)} />
        </Label>
        <label className="flex items-center gap-3 text-sm font-semibold text-forest sm:col-span-2">
          <input type="checkbox" className="h-5 w-5 accent-[var(--color-saffron)]" checked={f.sendEmail} onChange={(e) => set("sendEmail", e.target.checked)} />
          Email the gift card code
        </label>
        <div className="sm:col-span-2">
          <ErrorNote text={error} />
        </div>
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Btn kind="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" disabled={busy}>
            {busy ? "Saving…" : "Create gift card"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

function GiftRow({ g, onChanged }: { g: AdminGift; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [balance, setBalance] = useState(centsToText(g.balanceCents));
  const [until, setUntil] = useState(g.expiresAt?.slice(0, 10) ?? "");
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
  const refundable = Math.min(g.balanceCents, g.paidCents - g.refundedCents);
  const cancel = () => {
    const refund =
      g.paidOnline && refundable > 0 && window.confirm(`Cancel ${g.code} and refund the unused ${euro(refundable)} via Stripe?\n\nOK = cancel + refund. Cancel = choose without refund.`);
    if (!refund && !window.confirm(`Cancel ${g.code} without a refund? The remaining ${euro(g.balanceCents)} can't be used anymore.`)) return;
    post({ action: "giftCancel", id: g.id, refund });
  };
  const tone = g.status === "active" ? "green" : g.status === "cancelled" ? "red" : "grey";
  return (
    <div className={`rounded-2xl border border-forest/10 bg-white p-4 sm:p-5 ${g.status === "active" ? "" : "opacity-70"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xl font-bold tracking-wider text-ink">{g.code}</p>
          <p className="text-sm text-forest/70">
            {g.buyerName} · <a href={`mailto:${g.buyerEmail}`} className="underline">{g.buyerEmail}</a>
            {g.recipientName || g.recipientEmail ? ` → ${[g.recipientName, g.recipientEmail].filter(Boolean).join(" · ")}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone={tone}>{g.status}</Badge>
          {g.source === "manual" && <Badge tone="blue">added by you</Badge>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-forest/80">
        <span>
          Balance <strong>{euro(g.balanceCents)}</strong> of {euro(g.initialCents)}
        </span>
        <span>Valid until {g.expiresAt ? dateOnly(g.expiresAt) : "-"}</span>
        <span>Paid {euro(g.paidCents)}{g.paidOnline ? "" : " (offline)"}</span>
        {g.refundedCents > 0 && <span>Refunded {euro(g.refundedCents)}</span>}
        <span>Ref {g.ref}</span>
      </div>
      {g.message && <p className="mt-2 rounded-xl bg-cream px-4 py-2 text-sm text-forest">“{g.message}”</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Btn kind="ghost" onClick={() => setShowHistory((x) => !x)}>
          History ({g.history.length})
        </Btn>
        {g.status !== "cancelled" && (
          <Btn kind="ghost" onClick={() => setEditing((x) => !x)}>
            Adjust
          </Btn>
        )}
        {g.status === "active" && (
          <Btn kind="danger" disabled={busy} onClick={cancel}>
            Cancel gift card
          </Btn>
        )}
      </div>
      {showHistory && (
        <ul className="mt-3 divide-y divide-forest/10 rounded-xl bg-cream text-sm">
          {g.history.map((h, i) => (
            <li key={i} className="flex flex-wrap justify-between gap-2 px-4 py-2">
              <span>
                {KIND_LABEL[h.kind] ?? h.kind}
                {h.ref ? ` · ${h.ref}` : ""}
                {h.note ? ` · ${h.note}` : ""}
              </span>
              <span className="text-forest/70">
                {h.amountCents >= 0 ? "+" : "−"}
                {euro(Math.abs(h.amountCents))} → {euro(h.balanceAfter)} · {when(h.at)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl bg-cream p-4">
          <Label text="Balance (€)">
            <input className={`${input} max-w-[8rem]`} inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} />
          </Label>
          <Label text="Valid until">
            <input type="date" className={input} value={until} onChange={(e) => setUntil(e.target.value)} />
          </Label>
          <Btn
            disabled={busy}
            onClick={() => {
              const balanceCents = toCents(balance);
              if (Number.isNaN(balanceCents) || !until) return setError("Enter a balance in euros and a date.");
              post({ action: "giftAdjust", giftCard: { id: g.id, balanceCents, expiresAt: until } });
            }}
          >
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

export function GiftCardsTab() {
  const [list, setList] = useState<AdminGift[] | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [granting, setGranting] = useState(false);
  const load = useCallback(() => {
    adminApi<{ giftCards: AdminGift[] }>("/api/admin/memberships?view=giftcards")
      .then((d) => setList(d.giftCards))
      .catch(() => setError("Could not load gift cards."));
  }, []);
  useEffect(load, [load]);

  const needle = q.trim().toLowerCase();
  const shown = (list ?? []).filter(
    (g) =>
      (filter === "all" || g.status === "active") &&
      (!needle || [g.code, g.ref, g.buyerName, g.buyerEmail, g.recipientName, g.recipientEmail].some((v) => v.toLowerCase().includes(needle))),
  );
  const outstanding = (list ?? []).filter((g) => g.status === "active").reduce((n, g) => n + g.balanceCents, 0);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-forest/70">
          Gift cards bought on the website (/cadeaubon) or added by you. Customers use the code for sessions and class cards; the rest stays on the card. Open balance:{" "}
          <strong>{euro(outstanding)}</strong>.
        </p>
        <Btn onClick={() => setGranting(true)}>+ Add gift card</Btn>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <input className={`${input} mt-0 max-w-xs`} placeholder="Search code, name, email…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${input} mt-0 w-auto`} value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="active">Active</option>
          <option value="all">All</option>
        </select>
      </div>
      {msg && <p className="mt-4 text-sm font-semibold text-green-700">{msg}</p>}
      <div className="mt-6 grid gap-3">
        <ErrorNote text={error} />
        {!list ? (
          <p className="text-forest/60">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-forest/60">No gift cards found.</p>
        ) : (
          shown.map((g) => <GiftRow key={g.id} g={g} onChanged={load} />)
        )}
      </div>
      {granting && (
        <GrantForm
          onClose={() => setGranting(false)}
          onSaved={(code) => {
            setGranting(false);
            setMsg(`Gift card ${code} created.`);
            load();
          }}
        />
      )}
    </>
  );
}
