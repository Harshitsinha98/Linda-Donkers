import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../lib/api";
import { ROUTES } from "../data/site";
import { LogoMark, PoweredByInfiskies } from "../components/Logo";
import { usePageTitle } from "../components/usePageTitle";
import { adminApi, downloadCsv, getPass, setPass, type AdminBooking } from "./adminApi";
import { BookingRowCard } from "./BookingsPanel";
import { Btn, ErrorNote, input } from "./ui";
import { CouponsTab } from "./CouponsTab";
import { MembershipsTab } from "./MembershipsTab";
import { GiftCardsTab } from "./GiftCardsTab";
import { SessionsTab } from "./SessionsTab";
import { Overview } from "./Overview";

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
        <div className="mt-2.5">
          <PoweredByInfiskies />
        </div>
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

function BookingsTab() {
  const [list, setList] = useState<AdminBooking[] | null>(null);
  const [filter, setFilter] = useState<"confirmed" | "cancelled" | "all">("confirmed");
  const [period, setPeriod] = useState<"upcoming" | "past" | "all">("upcoming");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(() => {
    adminApi<{ bookings: AdminBooking[] }>("/api/admin/bookings")
      .then((d) => setList(d.bookings))
      .catch(() => setError("Could not load bookings."));
  }, []);
  useEffect(load, [load]);

  const needle = q.trim().toLowerCase();
  const now = new Date().toISOString();
  const shown = (list ?? [])
    .filter(
      (b) =>
        (filter === "all" || b.status === filter) &&
        (period === "all" || (period === "upcoming" ? b.sessionStartsAt >= now : b.sessionStartsAt < now)) &&
        (!needle || [b.name, b.email, b.phone, b.ref, b.sessionTitle].some((v) => v.toLowerCase().includes(needle))),
    )
    // Upcoming: soonest first. Otherwise: newest booking first.
    .sort((a, b) => (period === "upcoming" ? a.sessionStartsAt.localeCompare(b.sessionStartsAt) : 0));

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <input className={`${input} mt-0 max-w-xs`} placeholder="Search name, email, ref…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex rounded-full border border-forest/15 bg-white p-1">
          {(
            [
              ["upcoming", "Coming up"],
              ["past", "Past"],
              ["all", "All"],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setPeriod(k)} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${period === k ? "bg-forest text-linen" : "text-forest"}`}>
              {label}
            </button>
          ))}
        </div>
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

type Tab = "overview" | "sessions" | "bookings" | "coupons" | "memberships" | "gift cards";
const TABS: [Tab, string][] = [
  ["overview", "Today"],
  ["sessions", "Sessions"],
  ["bookings", "Bookings"],
  ["memberships", "Class cards & packages"],
  ["gift cards", "Gift cards"],
  ["coupons", "Discount codes"],
];

export default function AdminApp() {
  usePageTitle("Admin | Linda Donkers");
  const [authed, setAuthed] = useState(() => !!getPass());
  const [tab, setTab] = useState<Tab>("overview");

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
            <div className="flex flex-col">
              <span className="font-display text-xl leading-none text-ink">Linda's admin</span>
              <div className="mt-1">
                <PoweredByInfiskies />
              </div>
            </div>
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
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 sm:px-6" aria-label="Admin">
          {TABS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              aria-current={tab === k ? "page" : undefined}
              className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold ${tab === k ? "border-saffron text-ink" : "border-transparent text-forest/60"}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        {tab === "overview" ? <Overview goTo={setTab} /> : tab === "sessions" ? <SessionsTab /> : tab === "bookings" ? <BookingsTab /> : tab === "coupons" ? <CouponsTab /> : tab === "memberships" ? <MembershipsTab /> : <GiftCardsTab />}
      </main>
    </div>
  );
}
