import { useState } from "react";
import { dayLabel, fillDay, hoursProblem, todayBE, upcomingDays, WEEKDAYS, type Hours } from "./adminApi";
import { Btn, input, Label } from "./ui";

/**
 * Weekly hours for sessions by appointment, without typing comma lists: tap the days, add start
 * times one by one (or fill a whole day), and see straight away which days customers will get.
 */
export function HoursEditor({ value, onChange, durationMin, lastDate }: { value: Hours; onChange: (h: Hours) => void; durationMin: number; lastDate?: string }) {
  const [newTime, setNewTime] = useState("10:00");
  const [fillFrom, setFillFrom] = useState("09:00");
  const [fillUntil, setFillUntil] = useState("18:00");
  const set = (patch: Partial<Hours>) => onChange({ ...value, ...patch });
  const toggleDay = (d: number) => set({ weekdays: value.weekdays.includes(d) ? value.weekdays.filter((x) => x !== d) : [...value.weekdays, d] });
  const addTime = (t: string) => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t) || value.slotTimes.includes(t)) return;
    set({ slotTimes: [...value.slotTimes, t].sort() });
  };
  const problem = hoursProblem(value, durationMin || 0, lastDate);
  const preview = problem ? [] : upcomingDays(value, 6, lastDate);

  return (
    <div className="grid gap-5">
      <div>
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-forest/70">1. Which days do you work?</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {WEEKDAYS.map(([d, short, long]) => {
            const on = value.weekdays.includes(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                title={long}
                onClick={() => toggleDay(d)}
                className={`h-11 min-w-[3.25rem] rounded-full border px-3 text-sm font-bold transition-colors ${on ? "border-forest bg-forest text-linen" : "border-forest/20 bg-white text-forest hover:border-forest/50"}`}
              >
                {short}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-forest/70">2. At what times can a session start?</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {value.slotTimes.length === 0 && <span className="py-2 text-sm text-forest/50">No times yet.</span>}
          {value.slotTimes.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-sage-soft/70 py-1.5 pl-3.5 pr-1.5 text-sm font-bold text-forest">
              {t}
              <button type="button" aria-label={`Remove ${t}`} onClick={() => set({ slotTimes: value.slotTimes.filter((x) => x !== t) })} className="grid h-6 w-6 place-items-center rounded-full hover:bg-white">
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <input type="time" className={`${input} mt-0`} style={{ width: "8rem" }} value={newTime} onChange={(e) => setNewTime(e.target.value)} aria-label="Start time to add" />
          <Btn kind="ghost" onClick={() => addTime(newTime)}>
            + Add time
          </Btn>
          {value.slotTimes.length > 0 && (
            <button type="button" onClick={() => set({ slotTimes: [] })} className="px-2 py-2 text-sm text-forest/60 underline underline-offset-4">
              Clear all
            </button>
          )}
        </div>
        <details className="mt-3 rounded-xl bg-white px-4 py-3 text-sm">
          <summary className="cursor-pointer font-semibold text-forest">Fill a whole day automatically</summary>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <Label text="From">
              <input type="time" className={input} style={{ width: "8rem" }} value={fillFrom} onChange={(e) => setFillFrom(e.target.value)} />
            </Label>
            <Label text="Last session ends by">
              <input type="time" className={input} style={{ width: "8rem" }} value={fillUntil} onChange={(e) => setFillUntil(e.target.value)} />
            </Label>
            <Btn kind="dark" onClick={() => set({ slotTimes: fillDay(fillFrom, fillUntil, durationMin, value.bufferMinutes) })}>
              Fill
            </Btn>
          </div>
          <p className="mt-2 text-xs text-forest/60">
            Uses the session length ({durationMin || "?"} min) plus your break ({value.bufferMinutes} min) between start times.
          </p>
        </details>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Label text="Break after each session (min)" hint="So sessions never run back to back.">
          <input type="number" min={0} max={180} className={input} value={value.bufferMinutes} onChange={(e) => set({ bufferMinutes: Math.max(0, Math.min(180, Number(e.target.value) || 0)) })} />
        </Label>
        <Label text="Every … weeks" hint="1 = every week, 2 = every other week.">
          <input type="number" min={1} max={52} className={input} value={value.intervalWeeks} onChange={(e) => set({ intervalWeeks: Math.max(1, Math.min(52, Number(e.target.value) || 1)) })} />
        </Label>
        <Label text="From (date)">
          <input type="date" className={input} min={todayBE()} max={lastDate} value={value.startDate} onChange={(e) => set({ startDate: e.target.value })} />
        </Label>
      </div>

      {problem ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{problem}</p>
      ) : (
        <div className="rounded-xl bg-white px-4 py-3 text-sm text-forest">
          <p className="font-semibold">Customers will see free times on:</p>
          <p className="mt-1 text-forest/75">
            {preview.length ? preview.map(dayLabel).join(" · ") : "no days (check the dates)"} … at {value.slotTimes.join(", ")}
          </p>
          <p className="mt-1 text-xs text-forest/55">Times that are already booked, or that clash with your classes, are hidden automatically.</p>
        </div>
      )}
    </div>
  );
}
