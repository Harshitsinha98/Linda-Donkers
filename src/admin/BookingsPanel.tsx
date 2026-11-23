import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../lib/api";
import { FixedLang } from "../i18n/LanguageContext";
import { BookingCalendar, type Pick } from "../components/booking/BookingCalendar";
import type { Variant } from "../lib/booking";
import { adminApi, downloadCsv, euro, policyPercent, when, type AdminBooking, type AdminSession } from "./adminApi";
import { Badge, Btn, ErrorNote, input, Label, Modal } from "./ui";

const STATUS_TONE = { confirmed: "green", pending: "amber", cancelled: "red", expired: "grey" } as const;
const digits = (p: string) => p.replace(/[^\d]/g, "").replace(/^00/, "");

export function BookingRowCard({ b, onChanged, showSession, showTime }: { b: AdminBooking; onChanged: () => void; showSession?: boolean; showTime?: boolean }) {
  const [cancelling, setCancelling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const pct = policyPercent(b.sessionStartsAt);
  const remaining = b.amountCents - b.refundedCents;

  const act = async (body: object, done: string) => {
    setBusy(true);
    setError("");
    try {
      const r = await adminApi<{ refundCents?: number }>("/api/admin/bookings", { method: "POST", body: JSON.stringify(body) });
      setMsg(r.refundCents ? `${done} ${euro(r.refundCents)} refunded.` : done);
      setCancelling(false);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
    setBusy(false);
  };

  return (
    <div className="rounded-2xl border border-forest/10 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-ink">
            {b.name} <span className="text-sm font-normal text-forest/60">· {b.seats} {b.seats === 1 ? "person" : "people"}</span>
          </p>
          {showSession && (
            <p className="text-sm text-forest/70">
              {b.sessionTitle} · {b.sessionBookingMode === "appointment" && b.preferred ? b.preferred : when(b.sessionStartsAt)}
            </p>
          )}
          {showTime && <p className="text-sm font-semibold text-saffron">{when(b.sessionStartsAt)}</p>}
          <p className="mt-1 text-sm text-forest/70">
            {b.email && (
              <a href={`mailto:${b.email}`} className="underline">
                {b.email}
              </a>
            )}
            {b.phone && <> · {b.phone}</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONE[b.status]}>{b.status === "pending" ? "awaiting payment" : b.status}</Badge>
          {b.source === "manual" && <Badge tone="blue">added by you</Badge>}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-forest/80">
        <span>
          Ref <strong>{b.ref}</strong>
        </span>
        <span>
          {b.membershipId ? "Paid with membership (1 session)" : b.amountCents > 0 ? `Paid ${euro(b.amountCents)}${b.paidOnline ? "" : " (offline)"}` : "Free"}
        </span>
        {b.couponCode && <span>Code {b.couponCode} (−{euro(b.discountCents)})</span>}
        {b.giftCents > 0 && <span>Gift card {euro(b.giftCents)}{b.giftRefundedCents ? ` (${euro(b.giftRefundedCents)} returned)` : ""}</span>}
        {b.preferred && (
          <span>
            Preferred time: <strong>{b.preferred}</strong>
          </span>
        )}
        {b.refundedCents > 0 && <span>Refunded {euro(b.refundedCents)}</span>}
        <span>Booked {when(b.createdAt)}</span>
        {b.cancelledBy && <span>Cancelled by {b.cancelledBy === "admin" ? "you" : "customer"}</span>}
      </div>
      {b.note && <p className="mt-3 whitespace-pre-line rounded-xl bg-cream px-4 py-3 text-sm text-forest">“{b.note}”</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {digits(b.phone) && (
          <a
            href={`https://wa.me/${digits(b.phone)}?text=${encodeURIComponent(`Hallo ${b.name}, `)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-full bg-[#25a244] px-4 py-2 text-sm font-semibold text-white"
          >
            WhatsApp
          </a>
        )}
        {b.status === "confirmed" && b.email && (
          <Btn kind="ghost" disabled={busy} onClick={() => act({ action: "resend", id: b.id }, "Confirmation email sent again.")}>
            Resend email
          </Btn>
        )}
        {b.status === "confirmed" && !cancelling && (
          <Btn kind="danger" onClick={() => setCancelling(true)}>
            Cancel booking
          </Btn>
        )}
      </div>

      {cancelling && (
        <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm">
          <p className="font-semibold text-red-800">How much should be refunded?</p>
          {!b.paidOnline && remaining > 0 && <p className="mt-1 text-red-700">This booking was paid offline, so please refund it yourself.</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn kind="dark" disabled={busy} onClick={() => act({ action: "cancel", id: b.id, refund: "policy" }, "Cancelled.")}>
              By policy ({pct}%{b.paidOnline && remaining > 0 ? ` = ${euro(Math.round((b.amountCents * pct) / 100))}` : ""})
            </Btn>
            <Btn kind="ghost" disabled={busy} onClick={() => act({ action: "cancel", id: b.id, refund: "full" }, "Cancelled.")}>
              Full refund
            </Btn>
            <Btn kind="ghost" disabled={busy} onClick={() => act({ action: "cancel", id: b.id, refund: "none" }, "Cancelled.")}>
              No refund
            </Btn>
            <Btn kind="ghost" onClick={() => setCancelling(false)}>
              Keep booking
            </Btn>
          </div>
          <p className="mt-2 text-xs text-red-700/80">The customer gets an email. Refunds go back to their card within 5–10 days.</p>
        </div>
      )}
      {msg && <p className="mt-3 text-sm font-semibold text-green-700">{msg}</p>}
      <div className="mt-2">
        <ErrorNote text={error} />
      </div>
    </div>
  );
}

function ManualBooking({ session, onDone }: { session: AdminSession; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", email: "", phone: "", seats: "1", amount: "", note: "", sendEmail: true });
  const [pick, setPick] = useState<Pick | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const withHours = session.bookingMode === "appointment" && !!session.availability?.enabled;
  // The same calendar as on the website (free days in green), for this one treatment.
  const variant = useMemo<Variant>(
    () => ({ key: `admin-${session.id}`, mode: "appointment", durationMin: session.durationMin, priceCents: session.priceCents, isOnline: session.isOnline, sessions: [session] }),
    [session],
  );
  const slotDate = pick?.date ?? "";
  const slotTime = pick?.time ?? "";

  if (!open) {
    return (
      <Btn kind="ghost" onClick={() => setOpen(true)}>
        + Add a booking yourself
      </Btn>
    );
  }
  const save = async () => {
    if (!f.name.trim()) return setError("Name is required.");
    if (withHours && (!slotDate || !slotTime)) return setError("Choose a free day and time in the calendar.");
    const amountCents = f.amount.trim() ? Math.round(Number(f.amount.replace(",", ".")) * 100) : 0;
    if (Number.isNaN(amountCents)) return setError("Amount must be a number.");
    setBusy(true);
    setError("");
    try {
      await adminApi("/api/admin/bookings", {
        method: "POST",
        body: JSON.stringify({
          action: "manual",
          booking: { sessionId: session.id, name: f.name, email: f.email, phone: f.phone, seats: Number(f.seats) || 1, amountCents, note: f.note, sendEmail: f.sendEmail && !!f.email, appointmentDate: withHours ? slotDate : "", appointmentTime: withHours ? slotTime : "" },
        }),
      });
      setOpen(false);
      setPick(null);
      setF({ name: "", email: "", phone: "", seats: "1", amount: "", note: "", sendEmail: true });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add the booking.");
    }
    setBusy(false);
  };

  return (
    <div className="rounded-2xl border border-forest/10 bg-white p-5">
      <p className="font-semibold text-ink">Add a booking (e.g. via WhatsApp or paid in cash)</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {withHours && session.status === "published" && (
          <div className="rounded-xl bg-cream p-4 sm:col-span-2">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-forest/70">Choose a free day and time</p>
            <FixedLang lang="en">
              <BookingCalendar variant={variant} selected={pick} onSelect={setPick} />
            </FixedLang>
          </div>
        )}
        {withHours && session.status !== "published" && (
          <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 sm:col-span-2">Show this treatment on the website first; then you can pick a free time here.</p>
        )}
        <Label text="Name *">
          <input className={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Label>
        <Label text="Phone">
          <input className={input} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </Label>
        <Label text="Email">
          <input className={input} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <Label text="People">
            <input className={input} type="number" min={1} value={f.seats} onChange={(e) => setF({ ...f, seats: e.target.value })} />
          </Label>
          <Label text="Paid (€)">
            <input className={input} inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="0" />
          </Label>
        </div>
        <Label text="Note" className="sm:col-span-2">
          <input className={input} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </Label>
        <label className="flex items-center gap-2 text-sm text-forest sm:col-span-2">
          <input type="checkbox" className="h-4 w-4" checked={f.sendEmail} onChange={(e) => setF({ ...f, sendEmail: e.target.checked })} />
          Send them a confirmation email
        </label>
      </div>
      <div className="mt-3">
        <ErrorNote text={error} />
      </div>
      <div className="mt-4 flex gap-2">
        <Btn disabled={busy} onClick={save}>
          {busy ? "Adding…" : "Add booking"}
        </Btn>
        <Btn kind="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Btn>
      </div>
    </div>
  );
}

export function SessionBookings({ session, onClose, onChanged }: { session: AdminSession; onClose: () => void; onChanged: () => void }) {
  const [list, setList] = useState<AdminBooking[] | null>(null);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(() => {
    adminApi<{ bookings: AdminBooking[] }>(`/api/admin/bookings?sessionId=${session.id}`)
      .then((d) => setList(d.bookings))
      .catch(() => setError("Could not load bookings."));
  }, [session.id]);
  useEffect(load, [load]);

  const changed = () => {
    load();
    onChanged();
  };
  const appt = session.bookingMode === "appointment";
  const now = new Date().toISOString();
  const visible = (list ?? [])
    .filter((b) => showAll || b.status === "confirmed" || b.status === "pending")
    // Appointments: coming up first, in time order; the past ones after.
    .sort((a, b) => (appt ? Number(a.sessionStartsAt < now) - Number(b.sessionStartsAt < now) || a.sessionStartsAt.localeCompare(b.sessionStartsAt) : 0));
  const confirmed = (list ?? []).filter((b) => b.status === "confirmed");
  const seats = confirmed.reduce((n, b) => n + b.seats, 0);

  return (
    <Modal title={appt ? `Appointments · ${session.title.nl}` : `${session.title.nl} · ${when(session.startsAt)}`} onClose={onClose} wide>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-forest">
          {appt ? (
            <>
              <strong>{confirmed.filter((b) => b.sessionStartsAt >= now).length}</strong> coming up · {confirmed.length} in total
            </>
          ) : (
            <>
              <strong>{seats}</strong> of {session.capacity} places booked · {confirmed.length} booking{confirmed.length === 1 ? "" : "s"}
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Btn kind="ghost" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Hide cancelled" : "Show cancelled too"}
          </Btn>
          <Btn kind="ghost" onClick={() => downloadCsv(session.id).catch(() => setError("Export failed."))}>
            Export CSV
          </Btn>
        </div>
      </div>
      <div className="mt-5">
        <ManualBooking session={session} onDone={changed} />
      </div>
      <div className="mt-5 grid gap-3">
        <ErrorNote text={error} />
        {!list ? (
          <p className="text-forest/60">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-forest/60">No bookings yet.</p>
        ) : (
          visible.map((b) => <BookingRowCard key={b.id} b={b} onChanged={changed} showTime={appt && !!session.availability?.enabled} />)
        )}
      </div>
    </Modal>
  );
}
