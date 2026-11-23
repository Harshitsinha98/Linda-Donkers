import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../lib/api";
import { adminApi, CATEGORY_LABELS, euro, hoursSummary, when, type AdminSession } from "./adminApi";
import { SessionForm } from "./SessionForm";
import { SessionBookings } from "./BookingsPanel";
import { HoursDialog } from "./HoursDialog";
import { Badge, Btn, ErrorNote, input, Label, Modal } from "./ui";
import { OFFERINGS } from "../../shared/catalog";

function SessionRow({
  s,
  onEdit,
  onBookings,
  onHours,
  onChanged,
}: {
  s: AdminSession;
  onEdit: () => void;
  onBookings: () => void;
  onHours: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const past = Date.parse(s.startsAt) <= Date.now();
  const appt = s.bookingMode === "appointment";
  const fill = Math.min(100, Math.round(((s.confirmedSeats + s.pendingSeats) / s.capacity) * 100));

  const post = async (body: object, ok: (r: Record<string, unknown>) => string) => {
    setBusy(true);
    setError("");
    try {
      const r = await adminApi("/api/admin/sessions", { method: "POST", body: JSON.stringify(body) });
      setMsg(ok(r));
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
    setBusy(false);
  };

  const cancelSession = () => {
    const n = s.bookingsCount;
    if (!window.confirm(`Cancel "${s.title.nl}"?${n ? `\n\nAll ${n} booking(s) will get a FULL refund and an email.` : ""}`)) return;
    post({ action: "cancel", id: s.id }, (r) => {
      const f = (r.failures as string[]) ?? [];
      return f.length ? `Cancelled, but some refunds failed: ${f.join("; ")}` : `Session cancelled. ${euro(Number(r.refundedCents) || 0)} refunded.`;
    });
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${s.title.nl}" permanently?`)) return;
    setBusy(true);
    try {
      await adminApi(`/api/admin/sessions?id=${s.id}`, { method: "DELETE" });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete.");
      setBusy(false);
    }
  };

  const menuItem = "block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-cream disabled:opacity-50";

  return (
    <div className={`rounded-3xl border border-forest/10 bg-linen p-4 sm:p-5 ${s.status === "cancelled" ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-saffron">
            {appt
              ? s.availability?.enabled
                ? hoursSummary(s.availability)
                : "By appointment · customer suggests a time"
              : when(s.startsAt)}
          </p>
          <h3 className="mt-1 font-display text-xl leading-snug text-ink sm:text-2xl">{s.title.nl}</h3>
          <p className="mt-1 text-sm text-forest/70">
            {CATEGORY_LABELS[s.category] ?? s.category} · {s.durationMin} min · {s.isOnline ? "Online" : s.venue || "No venue"} ·{" "}
            {s.priceCents > 0 ? `${euro(s.priceCents)} p.p.` : "Free"}
            {appt && ` · bookable until ${when(s.startsAt).replace(/,? \d\d:\d\d$/, "")}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {s.status === "draft" && <Badge tone="grey">hidden</Badge>}
          {s.status === "published" && !past && <Badge tone="green">on the website</Badge>}
          {s.status === "cancelled" && <Badge tone="red">cancelled</Badge>}
          {s.spotsLeft === 0 && s.status === "published" && !appt && <Badge tone="amber">full</Badge>}
          {appt && s.status === "published" && !s.availability?.enabled && <Badge tone="amber">no weekly hours</Badge>}
          {s.isOnline && !s.onlineLink.trim() && s.status !== "cancelled" && <Badge tone="amber">no online link</Badge>}
        </div>
      </div>

      {!appt && (
        <div className="mt-3">
          <div className="flex justify-between text-sm text-forest">
            <span>
              <strong>{s.confirmedSeats}</strong> / {s.capacity} booked
              {s.pendingSeats ? ` · ${s.pendingSeats} paying now` : ""}
            </span>
            <span>{euro(s.revenueCents)} received</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-sand">
            <div className="h-full rounded-full bg-sage" style={{ width: `${fill}%` }} />
          </div>
        </div>
      )}
      {appt && (
        <p className="mt-2 text-sm text-forest">
          <strong>{s.bookingsCount}</strong> appointment(s) booked · {euro(s.revenueCents)} received
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Btn kind="dark" onClick={onBookings}>
          {appt ? "Appointments" : "Bookings"} ({s.bookingsCount})
        </Btn>
        {s.status !== "cancelled" && (
          <Btn kind="ghost" onClick={onEdit}>
            Edit
          </Btn>
        )}
        {appt && s.status !== "cancelled" && (
          <Btn kind="ghost" onClick={onHours}>
            Hours
          </Btn>
        )}
        {s.status !== "cancelled" && !past && (
          <Btn
            kind="ghost"
            disabled={busy}
            onClick={() => post({ action: "publish", id: s.id, publish: s.status === "draft" }, () => (s.status === "draft" ? "Now visible on the website." : "Hidden from the website."))}
          >
            {s.status === "draft" ? "Show on website" : "Hide"}
          </Btn>
        )}
        <details className="relative">
          <summary className="inline-flex cursor-pointer list-none items-center rounded-full border border-forest/20 bg-white px-4 py-2 text-sm font-semibold text-forest">More ▾</summary>
          <div className="absolute left-0 z-20 mt-2 w-56 rounded-2xl border border-forest/10 bg-white p-1.5 shadow-xl">
            <button type="button" className={`${menuItem} text-forest`} disabled={busy} onClick={() => post({ action: "duplicate", id: s.id }, () => "Copied as a hidden draft. Edit the copy to set the new date.")}>
              Duplicate
            </button>
            {s.status !== "cancelled" && !past && (
              <button type="button" className={`${menuItem} text-red-700`} disabled={busy} onClick={cancelSession}>
                Cancel session (refund everyone)
              </button>
            )}
            {s.bookingsCount === 0 && (
              <button type="button" className={`${menuItem} text-red-700`} disabled={busy} onClick={remove}>
                Delete
              </button>
            )}
          </div>
        </details>
      </div>
      {msg && <p className="mt-3 text-sm font-semibold text-green-700">{msg}</p>}
      <div className="mt-2">
        <ErrorNote text={error} />
      </div>
    </div>
  );
}

function ResetDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [weeks, setWeeks] = useState("8");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ deleted: number; created: number; plansCreated: number; kept: { title: string; startsAt: string; bookings: number }[] } | null>(null);

  const go = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await adminApi<NonNullable<typeof result>>("/api/admin/sessions", {
        method: "POST",
        body: JSON.stringify({ action: "reset", weeks: Number(weeks) || 8, confirm: "RESET" }),
      });
      setResult(r);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
    setBusy(false);
  };

  return (
    <Modal title="Start fresh with your standard schedule" onClose={onClose}>
      {result ? (
        <div className="grid gap-4 text-forest">
          <p>
            <strong>{result.deleted}</strong> old session(s) deleted, <strong>{result.created}</strong> new session(s) created
            {result.plansCreated ? `, ${result.plansCreated} membership card(s) added` : ""}.
          </p>
          {result.kept.length > 0 && (
            <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Kept because people booked them (cancel them yourself if needed, they get a refund):</p>
              <ul className="mt-2 list-disc pl-5">
                {result.kept.map((k) => (
                  <li key={k.title + k.startsAt}>
                    {k.title} · {when(k.startsAt)} · {k.bookings} booking(s)
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-end">
            <Btn onClick={onClose}>Close</Btn>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 text-forest">
          <p>This deletes <strong>all sessions</strong> (upcoming and past) and creates your standard offer:</p>
          <ul className="list-disc pl-5 text-sm">
            {OFFERINGS.map((o) => (
              <li key={o.key}>
                {o.titleEn} · {o.weekly ? `every ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][o.weekly.weekday]} ${o.weekly.time}` : "by appointment"} ·{" "}
                {o.durationMin} min · {euro(o.priceCents)}
              </li>
            ))}
          </ul>
          <p className="text-sm text-forest/70">
            Sessions that someone has booked (and paid) are never deleted; you'll see a list of them afterwards. Online sessions are created without a link: add your Zoom/Meet link with
            Edit. Your membership cards are added too if you have none yet.
          </p>
          <Label text="Plan the weekly classes for how many weeks?">
            <input type="number" min={1} max={26} className={`${input} max-w-[8rem]`} value={weeks} onChange={(e) => setWeeks(e.target.value)} />
          </Label>
          <Label text='Type "RESET" to confirm'>
            <input className={`${input} max-w-[12rem]`} value={typed} onChange={(e) => setTyped(e.target.value)} />
          </Label>
          <ErrorNote text={error} />
          <div className="flex justify-end gap-3">
            <Btn kind="ghost" onClick={onClose}>
              Cancel
            </Btn>
            <Btn kind="danger" disabled={busy || typed.trim().toUpperCase() !== "RESET"} onClick={go}>
              {busy ? "Working…" : "Delete all & create standard schedule"}
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

type StandardSyncCandidate = {
  offering: string;
  title: string;
  date: string;
  startTime: string;
  bookingMode: "scheduled" | "appointment";
  section: string;
  isOnline: boolean;
  status: "published" | "draft";
  durationMin: number;
  priceCents: number;
};

type StandardSyncConflict = {
  offering: string;
  title: string;
  existingTitle: string;
  date: string;
  existingTime: string;
  expectedTime: string;
  reason: string;
};

type StandardSyncReport = {
  weeks: number;
  previewOnly: boolean;
  plannedCount: number;
  createdCount: number;
  skippedCount: number;
  conflictCount: number;
  candidates: StandardSyncCandidate[];
  created: { id: string; offering: string; title: string; date: string; startTime: string; status: string }[];
  skipped: { offering: string; title: string; date: string; reason: string }[];
  conflicts: StandardSyncConflict[];
};

/** Safe alternative to Reset: preview and add only missing regular offerings. */
function SyncDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [weeks, setWeeks] = useState("8");
  const [report, setReport] = useState<StandardSyncReport | null>(null);
  const [applied, setApplied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const preview = async () => {
    setBusy(true);
    setError("");
    setApplied(false);
    try {
      const r = await adminApi<StandardSyncReport>("/api/admin/sessions", {
        method: "POST",
        body: JSON.stringify({ action: "previewStandard", weeks: Number(weeks) || 8 }),
      });
      setReport(r);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not preview the standard schedule.");
    }
    setBusy(false);
  };

  const create = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await adminApi<StandardSyncReport>("/api/admin/sessions", {
        method: "POST",
        body: JSON.stringify({ action: "createMissingStandard", weeks: Number(weeks) || 8 }),
      });
      setReport(r);
      setApplied(true);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the missing sessions.");
    }
    setBusy(false);
  };

  const draftCount = report?.candidates.filter((x) => x.status === "draft").length ?? 0;
  const visible = report?.candidates.slice(0, 14) ?? [];

  return (
    <Modal title="Add missing standard sessions" onClose={onClose} wide>
      <div className="grid gap-4 text-forest">
        <p className="text-sm text-forest/75">
          This checks Linda's standard offer against the sessions already in the database. It never deletes or edits existing sessions, bookings, prices or memberships. Conflicts are shown separately and left untouched.
        </p>
        <Label text="Plan weekly sessions for how many weeks?">
          <input type="number" min={1} max={26} className={input + " max-w-[8rem]"} value={weeks} onChange={(e) => { setWeeks(e.target.value); setReport(null); setApplied(false); }} />
        </Label>
        <div className="flex flex-wrap gap-3">
          <Btn disabled={busy || !(Number(weeks) >= 1 && Number(weeks) <= 26)} onClick={preview}>
            {busy && !applied ? "Checking…" : "Preview missing sessions"}
          </Btn>
          <Btn kind="ghost" onClick={onClose}>Close</Btn>
        </div>
        {report && (
          <div className="grid gap-4 rounded-2xl bg-cream p-4">
            {applied ? (
              <p className="font-semibold text-green-800">
                Created {report.createdCount} session(s). Existing entries were left unchanged.
              </p>
            ) : (
              <p className="font-semibold text-ink">
                Preview: {report.plannedCount} missing session(s) can be added.
              </p>
            )}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-white p-3">
                <p className="font-display text-2xl">{applied ? report.createdCount : report.plannedCount}</p>
                <p className="text-xs text-forest/65">{applied ? "Created" : "To add"}</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="font-display text-2xl">{report.skippedCount}</p>
                <p className="text-xs text-forest/65">Already present</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="font-display text-2xl">{report.conflictCount}</p>
                <p className="text-xs text-forest/65">Conflicts</p>
              </div>
            </div>
            {draftCount > 0 && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                {applied ? draftCount + " online session(s) were created as drafts." : draftCount + " online session(s) will be created as drafts."} Add their private Zoom / Meet link in Edit, then publish them.
              </p>
            )}
            {visible.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold">Sessions to add</p>
                <ul className="max-h-52 space-y-2 overflow-y-auto text-sm">
                  {visible.map((x) => (
                    <li key={x.offering + x.date} className="flex flex-wrap items-start justify-between gap-2 border-b border-forest/10 pb-2">
                      <span>{x.title}</span>
                      <span className="text-right text-forest/65">
                        {x.bookingMode === "appointment" ? "By appointment" : x.date + " · " + x.startTime}
                        {x.status === "draft" ? " · draft" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
                {report.candidates.length > visible.length && (
                  <p className="mt-2 text-xs text-forest/60">And {report.candidates.length - visible.length} more…</p>
                )}
              </div>
            )}
            {report.conflicts.length > 0 && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
                <p className="font-semibold text-amber-950">Needs manual review — not changed</p>
                <ul className="mt-2 space-y-3 text-sm text-amber-950">
                  {report.conflicts.map((x, i) => (
                    <li key={x.offering + x.date + i}>
                      <strong>{x.title}</strong>
                      <p>Existing: {x.existingTitle} · {x.date} · {x.existingTime}</p>
                      <p>Expected: {x.expectedTime}</p>
                      <p className="text-amber-900/80">{x.reason}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {report.plannedCount === 0 && report.conflictCount === 0 && (
              <p className="text-sm text-forest/70">Everything in this standard schedule is already present. Nothing needs to be added.</p>
            )}
            {!applied && report.plannedCount > 0 && (
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-forest/10 pt-3">
                <p className="mr-auto text-xs text-forest/60">Only the {report.plannedCount} safe, missing entries will be created. Conflicts will remain untouched.</p>
                <Btn disabled={busy} onClick={create}>{"Create " + report.plannedCount + " missing sessions"}</Btn>
              </div>
            )}
          </div>
        )}
        <ErrorNote text={error} />
      </div>
    </Modal>
  );
}


type Filter = "all" | "treatments" | "classes" | "events" | "online" | "hidden";
const FILTERS: [Filter, string][] = [
  ["all", "All"],
  ["treatments", "Massages & healings"],
  ["classes", "Yoga classes"],
  ["events", "Events"],
  ["online", "Online"],
  ["hidden", "Hidden"],
];
const EVENT_TYPES = ["gong", "workshop", "retreat", "other"];

function matches(s: AdminSession, f: Filter) {
  switch (f) {
    case "treatments":
      return s.bookingMode === "appointment" || s.category === "massage" || s.category === "healing";
    case "classes":
      return s.bookingMode === "scheduled" && (s.category === "yoga" || s.category === "online");
    case "events":
      return s.bookingMode === "scheduled" && EVENT_TYPES.includes(s.category);
    case "online":
      return s.isOnline;
    case "hidden":
      return s.status === "draft";
    default:
      return true;
  }
}

/** "This week", "Next week", or "Week of 7 Dec" (Belgian calendar). */
function weekLabel(iso: string) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date(iso));
  const monday = (d: string) => {
    const x = new Date(`${d}T12:00:00Z`);
    x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
    return x;
  };
  const m = monday(day);
  const now = monday(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date()));
  const diff = Math.round((m.getTime() - now.getTime()) / (7 * 86_400_000));
  if (diff <= 0) return "This week";
  if (diff === 1) return "Next week";
  return `Week of ${new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" }).format(m)}`;
}

export function SessionsTab() {
  const [scope, setScope] = useState<"upcoming" | "past">("upcoming");
  const [list, setList] = useState<AdminSession[] | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<AdminSession | "new" | null>(null);
  const [viewing, setViewing] = useState<AdminSession | null>(null);
  const [resetting, setResetting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [hours, setHours] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    adminApi<{ sessions: AdminSession[] }>(`/api/admin/sessions?scope=${scope}`)
      .then((d) => {
        setList(d.sessions);
        setViewing((v) => (v ? (d.sessions.find((x) => x.id === v.id) ?? v) : v));
      })
      .catch(() => setError("Could not load sessions."));
  }, [scope]);
  useEffect(load, [load]);

  const live = (list ?? []).filter((s) => s.status === "published");
  const booked = live.reduce((n, s) => n + s.confirmedSeats, 0);
  const revenue = (list ?? []).reduce((n, s) => n + s.revenueCents, 0);

  const needle = q.trim().toLowerCase();
  const shown = (list ?? []).filter((s) => matches(s, filter) && (!needle || `${s.title.nl} ${s.title.en} ${s.venue}`.toLowerCase().includes(needle)));
  const appointments = shown.filter((s) => s.bookingMode === "appointment");
  const groups = useMemo(() => {
    const out: { label: string; items: AdminSession[] }[] = [];
    for (const s of shown.filter((x) => x.bookingMode !== "appointment")) {
      const label = scope === "upcoming" ? weekLabel(s.startsAt) : new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Brussels", month: "long", year: "numeric" }).format(new Date(s.startsAt));
      const g = out.find((x) => x.label === label);
      if (g) g.items.push(s);
      else out.push({ label, items: [s] });
    }
    return out;
  }, [shown, scope]);

  const row = (s: AdminSession) => (
    <SessionRow key={s.id} s={s} onEdit={() => setEditing(s)} onBookings={() => setViewing(s)} onHours={() => setHours(true)} onChanged={load} />
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-full border border-forest/15 bg-white p-1">
          {(["upcoming", "past"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setList(null);
                setScope(k);
              }}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize ${scope === k ? "bg-forest text-linen" : "text-forest"}`}
            >
              {k}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn onClick={() => setEditing("new")}>+ New session</Btn>
          <Btn kind="ghost" onClick={() => setHours(true)} disabled={!list}>
            Massage & healing hours
          </Btn>
          <details className="relative">
            <summary className="inline-flex cursor-pointer list-none items-center rounded-full border border-forest/20 bg-white px-4 py-2 text-sm font-semibold text-forest">Tools ▾</summary>
            <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-forest/10 bg-white p-1.5 shadow-xl">
              <button type="button" onClick={() => setSyncing(true)} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-cream">
                <span className="font-semibold text-forest">Add missing standard sessions</span>
                <span className="block text-xs text-forest/60">Safe: only adds, never deletes.</span>
              </button>
              <button type="button" onClick={() => setResetting(true)} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-red-50">
                <span className="font-semibold text-red-700">Destructive reset</span>
                <span className="block text-xs text-red-700/70">Deletes every unbooked session and starts again.</span>
              </button>
            </div>
          </details>
        </div>
      </div>

      {list && scope === "upcoming" && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            ["On the website", String(live.length)],
            ["Places booked", String(booked)],
            ["Received", euro(revenue)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-forest/60">{k}</p>
              <p className="mt-1 font-display text-2xl text-ink">{v}</p>
            </div>
          ))}
        </div>
      )}

      {list && list.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {FILTERS.map(([k, label]) => {
            const n = list.filter((s) => matches(s, k)).length;
            if (k !== "all" && n === 0) return null;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${filter === k ? "border-forest bg-forest text-linen" : "border-forest/15 bg-white text-forest"}`}
              >
                {label} <span className="opacity-60">{n}</span>
              </button>
            );
          })}
          <input className={`${input} mt-0 ml-auto w-full max-w-[14rem]`} placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search sessions" />
        </div>
      )}

      <div className="mt-6 grid gap-4">
        <ErrorNote text={error} />
        {!list ? (
          <p className="text-forest/60">Loading…</p>
        ) : list.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center">
            <p className="font-display text-2xl text-ink">{scope === "upcoming" ? "No upcoming sessions yet" : "No past sessions"}</p>
            {scope === "upcoming" && (
              <>
                <p className="mt-2 text-forest/70">Create your first session. It appears on the booking page right away.</p>
                <Btn className="mt-6" onClick={() => setEditing("new")}>
                  + New session
                </Btn>
              </>
            )}
          </div>
        ) : shown.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-forest/60">Nothing matches this filter.</p>
        ) : (
          <>
            {appointments.length > 0 && (
              <div className="grid gap-3">
                <h2 className="font-display text-xl text-ink">By appointment <span className="text-base text-forest/50">· always bookable in your hours</span></h2>
                {appointments.map(row)}
              </div>
            )}
            {groups.map((g) => (
              <div key={g.label} className="grid gap-3">
                <h2 className="mt-2 font-display text-xl text-ink">
                  {g.label} <span className="text-base text-forest/50">· {g.items.length}</span>
                </h2>
                {g.items.map(row)}
              </div>
            ))}
          </>
        )}
      </div>

      {editing && (
        <SessionForm
          session={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {viewing && <SessionBookings session={viewing} onClose={() => setViewing(null)} onChanged={load} />}
      {hours && list && <HoursDialog sessions={list} onClose={() => setHours(false)} onChanged={load} />}
      {resetting && <ResetDialog onClose={() => setResetting(false)} onDone={load} />}
      {syncing && <SyncDialog onClose={() => setSyncing(false)} onDone={load} />}
    </>
  );
}
