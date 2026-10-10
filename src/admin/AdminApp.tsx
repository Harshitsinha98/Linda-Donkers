import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../lib/api";
import { ROUTES } from "../data/site";
import { LogoMark } from "../components/Logo";
import { usePageTitle } from "../components/usePageTitle";
import { adminApi, CATEGORY_LABELS, downloadCsv, euro, getPass, setPass, when, type AdminBooking, type AdminSession } from "./adminApi";
import { SessionForm } from "./SessionForm";
import { BookingRowCard, SessionBookings } from "./BookingsPanel";
import { Badge, Btn, ErrorNote, input } from "./ui";

function Login({ onOk }: { onOk: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setPass(code);
    try {
      await adminApi("/api/admin/sessions?scope=upcoming&login=1");
      onOk();
    } catch (err) {
      setPass("");
      setError(
        err instanceof ApiError && err.status === 401
          ? "That passcode is not correct."
          : err instanceof ApiError && err.status === 429
            ? "Too many attempts. Please wait 15 minutes."
            : err instanceof ApiError
              ? err.message
              : "Could not connect.",
      );
    }
    setBusy(false);
  };
  return (
    <div className="grid min-h-screen place-items-center bg-cream p-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-linen p-8 shadow-xl">
        <LogoMark className="h-12 w-12 text-forest" />
        <h1 className="mt-5 font-display text-3xl text-ink">Linda's admin</h1>
        <p className="mt-2 text-sm text-forest/70">Sessions, bookings and payments.</p>
        <input type="password" autoComplete="current-password" className={`${input} mt-6`} placeholder="Passcode" value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
        <div className="mt-3">
          <ErrorNote text={error} />
        </div>
        <Btn type="submit" disabled={busy || !code} className="mt-5 w-full py-3">
          {busy ? "Checking…" : "Log in"}
        </Btn>
      </form>
    </div>
  );
}

function SessionRow({
  s,
  onEdit,
  onBookings,
  onChanged,
}: {
  s: AdminSession;
  onEdit: () => void;
  onBookings: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const past = Date.parse(s.startsAt) <= Date.now();
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

  return (
    <div className={`rounded-3xl border border-forest/10 bg-linen p-5 sm:p-6 ${s.status === "cancelled" ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-saffron">{when(s.startsAt)}</p>
          <h3 className="mt-1 font-display text-2xl leading-snug text-ink">{s.title.nl}</h3>
          <p className="mt-1 text-sm text-forest/70">
            {CATEGORY_LABELS[s.category] ?? s.category} · {s.durationMin} min · {s.isOnline ? "Online" : s.venue || "No venue"} ·{" "}
            {s.priceCents > 0 ? `${euro(s.priceCents)} p.p.` : "Free"}
          </p>
        </div>
        <div className="flex gap-2">
          {s.status === "draft" && <Badge tone="grey">draft (hidden)</Badge>}
          {s.status === "published" && !past && <Badge tone="green">live</Badge>}
          {s.status === "cancelled" && <Badge tone="red">cancelled</Badge>}
          {s.spotsLeft === 0 && s.status === "published" && <Badge tone="amber">full</Badge>}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-sm text-forest">
          <span>
            <strong>{s.confirmedSeats}</strong> / {s.capacity} booked{s.pendingSeats ? ` · ${s.pendingSeats} paying now` : ""}
          </span>
          <span>{euro(s.revenueCents)} received</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-sand">
          <div className="h-full rounded-full bg-sage" style={{ width: `${fill}%` }} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Btn kind="dark" onClick={onBookings}>
          Bookings ({s.bookingsCount})
        </Btn>
        {s.status !== "cancelled" && (
          <Btn kind="ghost" onClick={onEdit}>
            Edit
          </Btn>
        )}
        <Btn kind="ghost" disabled={busy} onClick={() => post({ action: "duplicate", id: s.id }, () => "Copied as a draft. Edit the copy to set the new date.")}>
          Duplicate
        </Btn>
        {s.status !== "cancelled" && !past && (
          <Btn
            kind="ghost"
            disabled={busy}
            onClick={() => post({ action: "publish", id: s.id, publish: s.status === "draft" }, () => (s.status === "draft" ? "Published." : "Hidden from the website."))}
          >
            {s.status === "draft" ? "Publish" : "Hide"}
          </Btn>
        )}
        {s.status !== "cancelled" && !past && (
          <Btn kind="danger" disabled={busy} onClick={cancelSession}>
            Cancel session
          </Btn>
        )}
        {s.bookingsCount === 0 && (
          <Btn kind="danger" disabled={busy} onClick={remove}>
            Delete
          </Btn>
        )}
      </div>
      {msg && <p className="mt-3 text-sm font-semibold text-green-700">{msg}</p>}
      <div className="mt-2">
        <ErrorNote text={error} />
      </div>
    </div>
  );
}

function SessionsTab() {
  const [scope, setScope] = useState<"upcoming" | "past">("upcoming");
  const [list, setList] = useState<AdminSession[] | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<AdminSession | "new" | null>(null);
  const [viewing, setViewing] = useState<AdminSession | null>(null);

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
        <Btn onClick={() => setEditing("new")}>+ New session</Btn>
      </div>

      {list && scope === "upcoming" && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            ["Live sessions", String(live.length)],
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

      <div className="mt-6 grid gap-4">
        <ErrorNote text={error} />
        {!list ? (
          <p className="text-forest/60">Loading…</p>
        ) : list.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center">
            <p className="font-display text-2xl text-ink">{scope === "upcoming" ? "No upcoming sessions yet" : "No past sessions"}</p>
            {scope === "upcoming" && (
              <>
                <p className="mt-2 text-forest/70">Create your first session. It appears on the homepage and in the agenda right away.</p>
                <Btn className="mt-6" onClick={() => setEditing("new")}>
                  + New session
                </Btn>
              </>
            )}
          </div>
        ) : (
          list.map((s) => <SessionRow key={s.id} s={s} onEdit={() => setEditing(s)} onBookings={() => setViewing(s)} onChanged={load} />)
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
    </>
  );
}

function BookingsTab() {
  const [list, setList] = useState<AdminBooking[] | null>(null);
  const [filter, setFilter] = useState<"confirmed" | "cancelled" | "all">("confirmed");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(() => {
    adminApi<{ bookings: AdminBooking[] }>("/api/admin/bookings")
      .then((d) => setList(d.bookings))
      .catch(() => setError("Could not load bookings."));
  }, []);
  useEffect(load, [load]);

  const needle = q.trim().toLowerCase();
  const shown = (list ?? []).filter(
    (b) =>
      (filter === "all" || b.status === filter) &&
      (!needle || [b.name, b.email, b.phone, b.ref, b.sessionTitle].some((v) => v.toLowerCase().includes(needle))),
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <input className={`${input} mt-0 max-w-xs`} placeholder="Search name, email, ref…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${input} mt-0 w-auto`} value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="all">All</option>
        </select>
        <Btn kind="ghost" onClick={() => downloadCsv().catch(() => setError("Export failed."))}>
          Export CSV
        </Btn>
      </div>
      <div className="mt-6 grid gap-3">
        <ErrorNote text={error} />
        {!list ? (
          <p className="text-forest/60">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-forest/60">No bookings found.</p>
        ) : (
          shown.map((b) => <BookingRowCard key={b.id} b={b} onChanged={load} showSession />)
        )}
      </div>
    </>
  );
}

export default function AdminApp() {
  usePageTitle("Admin | Linda Donkers");
  const [authed, setAuthed] = useState(() => !!getPass());
  const [tab, setTab] = useState<"sessions" | "bookings">("sessions");

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  if (!authed) return <Login onOk={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen bg-cream pb-20">
      <header className="sticky top-0 z-30 border-b border-forest/10 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <LogoMark className="h-9 w-9 text-forest" />
            <span className="font-display text-xl text-ink">Linda's admin</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to={ROUTES.home} target="_blank" className="text-sm font-semibold text-forest underline underline-offset-4">
              View website
            </Link>
            <Btn
              kind="ghost"
              onClick={() => {
                setPass("");
                setAuthed(false);
              }}
            >
              Log out
            </Btn>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-4 sm:px-6" aria-label="Admin">
          {(["sessions", "bookings"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`border-b-2 px-4 py-2.5 text-sm font-bold capitalize ${tab === k ? "border-saffron text-ink" : "border-transparent text-forest/60"}`}
            >
              {k}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">{tab === "sessions" ? <SessionsTab /> : <BookingsTab />}</main>
    </div>
  );
}
