import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../lib/api";
import { adminApi, brusselsMidnight, euro, todayBE, when, type AdminBooking, type AdminPlan, type AdminSession } from "./adminApi";
import { SessionForm } from "./SessionForm";
import { SessionBookings } from "./BookingsPanel";
import { HoursDialog } from "./HoursDialog";
import { Badge, Btn, ErrorNote } from "./ui";

const LAST_SEEN = "ld-admin-last-seen";
const DAYS = 7;
const digits = (p: string) => p.replace(/[^\d]/g, "").replace(/^00/, "");
const dayOf = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date(iso));
const timeOf = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Brussels", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
function dayTitle(day: string) {
  const t = todayBE();
  if (day === t) return "Today";
  if (day === addDays(t, 1)) return "Tomorrow";
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${day}T12:00:00Z`));
}

type Item = { at: string; session: AdminSession | undefined; title: string; people: AdminBooking[]; kind: "appointment" | "class" };

function WhatsApp({ b }: { b: AdminBooking }) {
  if (!digits(b.phone)) return null;
  return (
    <a
      href={`https://wa.me/${digits(b.phone)}?text=${encodeURIComponent(`Hallo ${b.name}, `)}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center rounded-full bg-[#25a244] px-3 py-1 text-xs font-semibold text-white"
    >
      WhatsApp
    </a>
  );
}

/** The first screen: what's coming up, who booked since last time, and what needs Linda's attention. */
export function Overview({ goTo }: { goTo: (tab: "sessions" | "bookings" | "coupons" | "memberships") => void }) {
  const [sessions, setSessions] = useState<AdminSession[] | null>(null);
  const [agenda, setAgenda] = useState<AdminBooking[] | null>(null);
  const [recent, setRecent] = useState<AdminBooking[] | null>(null);
  const [plans, setPlans] = useState<AdminPlan[] | null>(null);
  const [error, setError] = useState("");
  const [lastSeen] = useState(() => localStorage.getItem(LAST_SEEN) ?? new Date(Date.now() - 7 * 86_400_000).toISOString());
  const [creating, setCreating] = useState(false);
  const [hours, setHours] = useState(false);
  const [editing, setEditing] = useState<AdminSession | null>(null);
  const [viewing, setViewing] = useState<AdminSession | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(() => {
    const from = brusselsMidnight(todayBE()).toISOString();
    const to = brusselsMidnight(addDays(todayBE(), DAYS)).toISOString();
    Promise.all([
      adminApi<{ sessions: AdminSession[] }>("/api/admin/sessions?scope=upcoming"),
      adminApi<{ bookings: AdminBooking[] }>(`/api/admin/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
      adminApi<{ bookings: AdminBooking[] }>("/api/admin/bookings"),
      adminApi<{ plans: AdminPlan[] }>("/api/admin/memberships?view=plans"),
    ])
      .then(([s, a, r, p]) => {
        setSessions(s.sessions);
        setAgenda(a.bookings);
        setRecent(r.bookings);
        setPlans(p.plans);
        setViewing((v) => (v ? (s.sessions.find((x) => x.id === v.id) ?? v) : v));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load the overview."));
  }, []);
  useEffect(load, [load]);
  // Remember this visit, so next time "new bookings" starts from now.
  useEffect(() => localStorage.setItem(LAST_SEEN, new Date().toISOString()), []);

  const byId = useMemo(() => new Map((sessions ?? []).map((s) => [s.id, s])), [sessions]);

  const days = useMemo(() => {
    if (!sessions || !agenda) return [];
    const items: Item[] = [];
    const t0 = brusselsMidnight(todayBE()).getTime();
    const t1 = brusselsMidnight(addDays(todayBE(), DAYS)).getTime();
    // Classes and events on a fixed date (also when nobody booked yet).
    for (const s of sessions) {
      const at = Date.parse(s.startsAt);
      if (s.bookingMode !== "scheduled" || s.status !== "published" || at < t0 || at >= t1) continue;
      items.push({ at: s.startsAt, session: s, title: s.title.nl, people: agenda.filter((b) => b.sessionId === s.id && b.status === "confirmed"), kind: "class" });
    }
    // Appointments with a real time.
    for (const b of agenda) {
      if (b.sessionBookingMode !== "appointment") continue;
      const s = byId.get(b.sessionId);
      if (!s?.availability?.enabled && !b.preferred) continue;
      items.push({ at: b.sessionStartsAt, session: s, title: b.sessionTitle, people: [b], kind: "appointment" });
    }
    items.sort((a, b) => a.at.localeCompare(b.at));
    const out: { day: string; items: Item[] }[] = [];
    for (let i = 0; i < DAYS; i++) {
      const day = addDays(todayBE(), i);
      out.push({ day, items: items.filter((x) => dayOf(x.at) === day) });
    }
    return out;
  }, [sessions, agenda, byId]);

  const newBookings = (recent ?? []).filter((b) => b.createdAt > lastSeen && (b.status === "confirmed" || b.status === "cancelled"));

  // Things that need Linda.
  const todo: { key: string; text: string; action: string; run: () => void }[] = [];
  if (sessions) {
    const noHours = sessions.filter((s) => s.bookingMode === "appointment" && s.status === "published" && !s.availability?.enabled);
    if (noHours.length) {
      todo.push({
        key: "hours",
        text: `${noHours.length} treatment(s) have no weekly hours, so customers can't pick a time: ${noHours.map((s) => s.title.nl).join(", ")}.`,
        action: "Set my hours",
        run: () => setHours(true),
      });
    }
    for (const s of sessions.filter((x) => x.isOnline && x.status === "published" && !x.onlineLink.trim()).slice(0, 3)) {
      todo.push({ key: `link-${s.id}`, text: `“${s.title.nl}” is online but has no Zoom/Meet link yet.`, action: "Add the link", run: () => setEditing(s) });
    }
    const drafts = sessions.filter((s) => s.status === "draft" && Date.parse(s.startsAt) > Date.now());
    if (drafts.length) todo.push({ key: "drafts", text: `${drafts.length} session(s) are hidden from the website (drafts).`, action: "Show sessions", run: () => goTo("sessions") });
  }
  const waiting = (recent ?? []).filter((b) => b.status === "confirmed" && b.preferred && b.sessionBookingMode === "appointment" && !byId.get(b.sessionId)?.availability?.enabled && Date.parse(b.sessionStartsAt) > Date.now());
  if (plans && !plans.some((p) => p.bonusCredits > 0)) {
    todo.push({
      key: "packages",
      text: "Your massage packages (3 massages + free yoga class, 5 massages + free healing) are not on sale yet.",
      action: "Add them",
      run: async () => {
        try {
          const r = await adminApi<{ created: number }>("/api/admin/memberships", { method: "POST", body: JSON.stringify({ action: "seedPlans" }) });
          setNote(`${r.created} card(s) added. You can change prices in Memberships.`);
          load();
        } catch (err) {
          setError(err instanceof ApiError ? err.message : "Could not add the packages.");
        }
      },
    });
  }

  const weekCount = days.reduce((n, d) => n + d.items.length, 0);
  const weekPeople = days.reduce((n, d) => n + d.items.reduce((m, i) => m + i.people.reduce((k, b) => k + b.seats, 0), 0), 0);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-saffron">{dayTitle(todayBE())} · {new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Brussels", day: "numeric", month: "long" }).format(new Date())}</p>
          <h1 className="mt-1 font-display text-3xl text-ink">Hello Linda</h1>
          {sessions && <p className="mt-1 text-forest/70">Next 7 days: {weekCount} appointment(s) and class(es), {weekPeople} people.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => setCreating(true)}>+ New session</Btn>
          <Btn kind="ghost" onClick={() => setHours(true)}>
            Massage & healing hours
          </Btn>
          <Btn kind="ghost" onClick={() => goTo("bookings")}>
            All bookings
          </Btn>
          <Btn kind="ghost" onClick={() => goTo("coupons")}>
            Discount codes
          </Btn>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <ErrorNote text={error} />
        {note && <p className="text-sm font-semibold text-green-700">{note}</p>}
        {(todo.length > 0 || waiting.length > 0) && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <p className="font-semibold text-amber-950">Needs your attention</p>
            <ul className="mt-3 grid gap-3">
              {waiting.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 text-sm text-amber-950">
                  <span>
                    <strong>{b.name}</strong> booked {b.sessionTitle} and would like: <strong>{b.preferred}</strong>. Agree on a time.
                  </span>
                  <WhatsApp b={b} />
                </li>
              ))}
              {todo.map((x) => (
                <li key={x.key} className="flex flex-wrap items-center justify-between gap-3 text-sm text-amber-950">
                  <span>{x.text}</span>
                  <Btn kind="dark" onClick={x.run}>
                    {x.action}
                  </Btn>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3" aria-label="Agenda">
          <h2 className="font-display text-2xl text-ink">Your agenda</h2>
          {!sessions ? (
            <p className="mt-3 text-forest/60">Loading…</p>
          ) : (
            <div className="mt-3 grid gap-3">
              {days.map(({ day, items }) => (
                <div key={day} className="rounded-3xl bg-white p-4 sm:p-5">
                  <p className={`text-sm font-bold ${day === todayBE() ? "text-saffron" : "text-forest/70"}`}>{dayTitle(day)}</p>
                  {items.length === 0 ? (
                    <p className="mt-1 text-sm text-forest/40">Nothing planned.</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-forest/10">
                      {items.map((it, i) => (
                        <li key={i} className="flex flex-wrap items-start gap-3 py-3">
                          <span className="w-14 shrink-0 font-display text-xl text-ink">{timeOf(it.at)}</span>
                          <div className="min-w-0 flex-1">
                            <button type="button" disabled={!it.session} onClick={() => it.session && setViewing(it.session)} className="text-left font-semibold text-ink hover:text-saffron">
                              {it.title}
                            </button>
                            {it.kind === "class" && it.session && (
                              <p className="text-sm text-forest/65">
                                {it.session.confirmedSeats} / {it.session.capacity} booked{it.session.isOnline ? " · online" : ""}
                              </p>
                            )}
                            {it.people.length > 0 && (
                              <ul className="mt-1 grid gap-1">
                                {it.people.map((b) => (
                                  <li key={b.id} className="flex flex-wrap items-center gap-2 text-sm text-forest">
                                    {b.name}
                                    {b.seats > 1 && <span className="text-forest/60">({b.seats} people)</span>}
                                    {b.status === "pending" && <Badge tone="amber">paying now</Badge>}
                                    {b.note && <span className="text-forest/60">· “{b.note}”</span>}
                                    <WhatsApp b={b} />
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-2" aria-label="New bookings">
          <h2 className="font-display text-2xl text-ink">New since last visit</h2>
          <p className="text-xs text-forest/55">Since {when(lastSeen)}</p>
          {!recent ? (
            <p className="mt-3 text-forest/60">Loading…</p>
          ) : newBookings.length === 0 ? (
            <p className="mt-3 rounded-3xl bg-white p-5 text-sm text-forest/60">No new bookings.</p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {newBookings.slice(0, 15).map((b) => (
                <li key={b.id} className="rounded-2xl bg-white p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-ink">{b.name}</span>
                    {b.status === "cancelled" ? <Badge tone="red">cancelled</Badge> : <Badge tone="green">booked</Badge>}
                  </div>
                  <p className="mt-1 text-forest/70">
                    {b.sessionTitle} · {b.preferred && b.sessionBookingMode === "appointment" ? b.preferred : when(b.sessionStartsAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-forest/60">
                    {b.membershipId ? "class card" : b.amountCents > 0 ? euro(b.amountCents) : "free"}
                    <WhatsApp b={b} />
                    {byId.get(b.sessionId) && (
                      <button type="button" onClick={() => setViewing(byId.get(b.sessionId)!)} className="font-semibold text-forest underline underline-offset-4">
                        Open
                      </button>
                    )}
                  </div>
                </li>
              ))}
              {newBookings.length > 15 && (
                <li>
                  <button type="button" onClick={() => goTo("bookings")} className="text-sm font-semibold text-forest underline underline-offset-4">
                    See all {newBookings.length}
                  </button>
                </li>
              )}
            </ul>
          )}
        </section>
      </div>

      {creating && <SessionForm onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
      {editing && <SessionForm session={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {hours && sessions && <HoursDialog sessions={sessions} onClose={() => setHours(false)} onChanged={load} />}
      {viewing && <SessionBookings session={viewing} onClose={() => setViewing(null)} onChanged={load} />}
    </>
  );
}
