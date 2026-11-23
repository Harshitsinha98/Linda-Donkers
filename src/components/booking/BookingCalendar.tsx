import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "../../i18n/LanguageContext";
import { api, ApiError, type PublicSession } from "../../lib/api";
import {
  addDays,
  firstOfMonth,
  fmtDayLong,
  fmtDayShort,
  fmtMonth,
  lastOfMonth,
  monthOf,
  shiftMonth,
  todayBE,
  weekdayMon,
  type Variant,
} from "../../lib/booking";

export type Pick = { session: PublicSession; date: string; time: string };
type Slot = { time: string; session: PublicSession; spotsLeft?: number };
/** Per day: undefined = not loaded yet, null = no session that day, [] = fully booked. */
type Days = Record<string, Slot[] | null>;

/** Days requested from the server in one go (the API allows up to 62). */
const WINDOW = 56;
/** How far ahead the calendar looks for the first free time. */
const SEARCH_WINDOWS = 4;

/**
 * Month calendar that shows availability up front: days with free time are green (with the number
 * of free times), full days are grey, days without a session are blank. The first free day is
 * selected straight away and its free times are shown as buttons.
 */
export function BookingCalendar({ variant, selected, onSelect }: { variant: Variant; selected: Pick | null; onSelect: (p: Pick | null) => void }) {
  const { t, lang } = useLang();
  const b = t.book;
  const today = todayBE();
  const appt = variant.mode === "appointment";
  const session = variant.sessions[0];
  const lastDay = appt ? session.date : variant.sessions[variant.sessions.length - 1]?.date ?? today;

  const [days, setDays] = useState<Days>({});
  const [loaded, setLoaded] = useState<{ from: string; to: string }[]>([]);
  const [month, setMonth] = useState(monthOf(today));
  const [day, setDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const run = useRef(0);

  // Fixed-date classes: everything is known from the session list.
  const scheduledDays = useMemo<Days>(() => {
    if (appt) return {};
    const out: Days = {};
    for (const s of variant.sessions) {
      if (Date.parse(s.startsAt) <= Date.now()) continue;
      (out[s.date] ??= []).push({ time: s.startTime, session: s, spotsLeft: s.spotsLeft });
    }
    for (const list of Object.values(out)) list?.sort((a, b2) => a.time.localeCompare(b2.time));
    return out;
  }, [appt, variant]);

  const fetchRange = useCallback(
    async (from: string, to: string, id: number) => {
      const res = await api<{ days: Record<string, { time: string }[]> }>(
        `/api/sessions?calendarFor=${encodeURIComponent(session.id)}&from=${from}&to=${to}`,
      );
      if (id !== run.current) return null;
      const next: Days = {};
      for (let d = from; d <= to; d = addDays(d, 1)) {
        const list = res.days[d];
        next[d] = list ? list.map((x) => ({ time: x.time, session })) : null;
      }
      setDays((prev) => ({ ...prev, ...next }));
      setLoaded((prev) => [...prev, { from, to }]);
      return next;
    },
    [session],
  );

  const isFree = (list: Slot[] | null | undefined) => !!list && list.some((x) => x.spotsLeft === undefined || x.spotsLeft > 0);

  // New treatment or duration: start over and look for the first free time.
  useEffect(() => {
    const id = ++run.current;
    setDays({});
    setLoaded([]);
    setError("");
    setSearched(false);
    if (!appt) {
      // Coming from a link to one exact class date: open on that day.
      const wanted = selected && isFree(scheduledDays[selected.date]) ? selected.date : undefined;
      const first = wanted ?? Object.keys(scheduledDays).sort().find((d) => isFree(scheduledDays[d]));
      setDay(first ?? null);
      setMonth(monthOf(first ?? today));
      setSearched(true);
      return;
    }
    if (!session.availability?.enabled) return;
    setLoading(true);
    (async () => {
      let from = today;
      for (let i = 0; i < SEARCH_WINDOWS && from <= lastDay; i++) {
        const to = addDays(from, WINDOW - 1);
        const got = await fetchRange(from, to, id);
        if (!got) return;
        const first = Object.keys(got).sort().find((d) => isFree(got[d]));
        if (first) {
          setDay(first);
          setMonth(monthOf(first));
          return;
        }
        from = addDays(to, 1);
      }
      setDay(null);
    })()
      .catch((err) => id === run.current && setError(err instanceof ApiError && err.message !== err.code ? err.message : b.calError))
      .finally(() => {
        if (id !== run.current) return;
        setLoading(false);
        setSearched(true);
      });
  }, [variant.key, session.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // A time chosen from outside (link to one class date): show that day.
  useEffect(() => {
    if (selected && selected.date !== day) {
      setDay(selected.date);
      setMonth(monthOf(selected.date));
    }
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Browsing to a month that isn't loaded yet.
  useEffect(() => {
    if (!appt || !session.availability?.enabled || !searched || loading || error) return;
    const from = firstOfMonth(month) < today ? today : firstOfMonth(month);
    const to = lastOfMonth(month) > lastDay ? lastDay : lastOfMonth(month);
    if (from > to) return;
    const covered = (d: string) => loaded.some((r) => r.from <= d && d <= r.to);
    if (covered(from) && covered(to)) return;
    const id = run.current;
    setLoading(true);
    fetchRange(from, to, id)
      .catch(() => id === run.current && setError(b.calError))
      .finally(() => id === run.current && setLoading(false));
  }, [appt, month, loaded, searched, loading, error, lastDay, today, session.availability?.enabled, fetchRange, b.calError]);

  const all = appt ? days : scheduledDays;
  const nextFree = useMemo(() => {
    const d = Object.keys(all).sort().find((k) => k >= today && isFree(all[k]));
    if (!d) return null;
    const slot = all[d]!.find((x) => x.spotsLeft === undefined || x.spotsLeft > 0)!;
    return { date: d, slot };
  }, [all, today]);

  if (appt && !session.availability?.enabled) return null;

  const minMonth = monthOf(today);
  const maxMonth = monthOf(lastDay < today ? today : lastDay);
  const first = firstOfMonth(month);
  const lead = weekdayMon(first);
  const cells: (string | null)[] = [...Array(lead).fill(null)];
  for (let d = first; d <= lastOfMonth(month); d = addDays(d, 1)) cells.push(d);

  const slotsOfDay = day ? all[day] ?? null : null;

  return (
    <div>
      {error ? (
        <div role="alert" className="mb-4 rounded-2xl bg-saffron/10 px-4 py-3 text-sm text-[#a2470b]">
          <p>{error}</p>
          <button type="button" onClick={() => { run.current++; setError(""); setLoaded([]); setDays({}); setMonth(monthOf(today)); }} className="mt-2 font-semibold underline underline-offset-4">
            {b.retry}
          </button>
        </div>
      ) : nextFree ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sage-soft/50 px-4 py-3 text-forest">
          <span className="font-semibold">{b.nextFree(`${fmtDayShort(nextFree.date, lang)} · ${nextFree.slot.time}`)}</span>
          <button
            type="button"
            onClick={() => {
              setMonth(monthOf(nextFree.date));
              setDay(nextFree.date);
              onSelect({ session: nextFree.slot.session, date: nextFree.date, time: nextFree.slot.time });
            }}
            className="rounded-full bg-forest px-4 py-2 text-sm font-semibold text-linen transition-colors hover:bg-saffron"
          >
            {b.takeNext}
          </button>
        </div>
      ) : searched && !loading ? (
        <p className="mb-5 rounded-2xl bg-sand/60 px-4 py-3 text-sm text-forest/80">{b.noFree}</p>
      ) : null}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, -1))}
          disabled={month <= minMonth}
          aria-label={b.prevMonth}
          className="grid h-10 w-10 place-items-center rounded-full border border-forest/15 text-lg text-forest transition-colors hover:border-saffron disabled:opacity-30"
        >
          ‹
        </button>
        <p className="font-display text-xl capitalize text-ink" aria-live="polite">
          {fmtMonth(month, lang)}
        </p>
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, 1))}
          disabled={month >= maxMonth}
          aria-label={b.nextMonth}
          className="grid h-10 w-10 place-items-center rounded-full border border-forest/15 text-lg text-forest transition-colors hover:border-saffron disabled:opacity-30"
        >
          ›
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center" role="grid" aria-busy={loading}>
        {b.weekdaysShort.map((w) => (
          <div key={w} className="py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-sage">
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`b${i}`} aria-hidden />;
          const n = Number(d.slice(8));
          const list = all[d];
          const pending = appt && list === undefined && d >= today && d <= lastDay;
          const free = isFree(list);
          const full = !!list && !free;
          const sel = d === day;
          const label = `${fmtDayLong(d, lang)}: ${free ? b.freeCount(list!.filter((x) => x.spotsLeft === undefined || x.spotsLeft > 0).length) : full ? b.legendFull : b.legendClosed}`;
          if (free) {
            const count = list!.filter((x) => x.spotsLeft === undefined || x.spotsLeft > 0).length;
            return (
              <button
                key={d}
                type="button"
                aria-pressed={sel}
                aria-label={label}
                onClick={() => {
                  setDay(d);
                  if (selected?.date !== d) onSelect(null);
                }}
                className={`flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-bold leading-tight transition-colors sm:aspect-auto sm:h-14 sm:text-base ${
                  sel ? "bg-forest text-linen" : "bg-sage-soft/70 text-forest hover:bg-sage-soft"
                }`}
              >
                {n}
                <span className={`mt-0.5 hidden text-[0.6rem] font-semibold min-[400px]:block ${sel ? "text-linen/80" : "text-forest/70"}`}>{b.freeCount(count)}</span>
              </button>
            );
          }
          return (
            <div
              key={d}
              aria-label={label}
              className={`flex aspect-square flex-col items-center justify-center rounded-xl text-sm leading-tight sm:aspect-auto sm:h-14 sm:text-base ${
                full ? "bg-sand/70 text-forest/35 line-through" : pending ? "animate-pulse bg-sand/30 text-forest/30" : "text-forest/25"
              }`}
            >
              {n}
              {full && <span className="mt-0.5 hidden text-[0.6rem] no-underline min-[400px]:block">{b.fullShort}</span>}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-forest/60">
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-sage-soft" />{b.legendFree}</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-sand" />{b.legendFull}</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded border border-forest/15" />{b.legendClosed}</span>
      </div>

      <div className="mt-6" aria-live="polite">
        {loading && !slotsOfDay ? (
          <p className="text-sm text-forest/60" role="status">{b.loadingCal}</p>
        ) : day && slotsOfDay && isFree(slotsOfDay) ? (
          <>
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-sage first-letter:uppercase">{b.timesOn(fmtDayLong(day, lang))}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {slotsOfDay.map((s) => {
                const left = s.spotsLeft === undefined || s.spotsLeft > 0;
                const on = selected?.date === day && selected.time === s.time && selected.session.id === s.session.id;
                return (
                  <button
                    key={`${s.session.id}-${s.time}`}
                    type="button"
                    disabled={!left}
                    aria-pressed={on}
                    onClick={() => onSelect({ session: s.session, date: day, time: s.time })}
                    className={`min-w-[5.5rem] rounded-full border-2 px-5 py-2.5 text-sm font-bold transition-colors disabled:border-forest/10 disabled:text-forest/30 disabled:line-through ${
                      on ? "border-forest bg-forest text-linen" : "border-forest/70 bg-cream text-forest hover:border-saffron hover:text-saffron"
                    }`}
                  >
                    {s.time}
                    {s.spotsLeft !== undefined && left && s.session.capacity > 1 && (
                      <span className="ml-2 text-[0.7rem] font-semibold opacity-70">{b.seatsLeft(s.spotsLeft)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          searched && <p className="text-sm text-forest/60">{b.pickDay}</p>
        )}
      </div>
    </div>
  );
}
