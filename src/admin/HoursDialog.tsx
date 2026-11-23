import { useMemo, useState } from "react";
import { ApiError } from "../lib/api";
import { OFFERINGS } from "../../shared/catalog";
import { adminApi, euro, hoursProblem, hoursSummary, sessionPayload, todayBE, type AdminSession, type Hours } from "./adminApi";
import { HoursEditor } from "./HoursEditor";
import { Badge, Btn, ErrorNote, input, Modal } from "./ui";

/** 60 ↔ 90 minute partner of each massage (same treatment, other length). */
const PARTNER: Record<string, string> = { mer: "mer-60", "mer-60": "mer", lomi: "lomi-60", "lomi-60": "lomi", chinei: "chinei-90", "chinei-90": "chinei" };
const STANDARD = Object.fromEntries(OFFERINGS.map((o) => [o.key, o]));

/**
 * One screen for all treatments by appointment: see their hours and prices, give several of them
 * the same weekly hours in one go, fix a price, and add the missing 60/90 minute versions.
 */
export function HoursDialog({ sessions, onClose, onChanged }: { sessions: AdminSession[]; onClose: () => void; onChanged: () => void }) {
  const list = useMemo(() => sessions.filter((s) => s.bookingMode === "appointment" && s.status !== "cancelled"), [sessions]);
  const [selected, setSelected] = useState<string[]>(() => list.filter((s) => s.category === "massage").map((s) => s.id));
  const firstWithHours = list.find((s) => selected.includes(s.id) && s.availability?.enabled)?.availability;
  const [hours, setHours] = useState<Hours>(() =>
    firstWithHours
      ? { startDate: firstWithHours.startDate < todayBE() ? todayBE() : firstWithHours.startDate, weekdays: firstWithHours.weekdays, intervalWeeks: firstWithHours.intervalWeeks, slotTimes: firstWithHours.slotTimes, bufferMinutes: firstWithHours.bufferMinutes }
      : { startDate: todayBE(), weekdays: [], intervalWeeks: 1, slotTimes: [], bufferMinutes: 15 },
  );
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<{ title: string; ok: boolean; error?: string }[] | null>(null);
  const [note, setNote] = useState("");

  const chosen = list.filter((s) => selected.includes(s.id));
  const longest = Math.max(0, ...chosen.map((s) => s.durationMin));
  const lastDate = chosen.length ? chosen.map((s) => s.date).sort()[0] : undefined;
  const problem = chosen.length ? hoursProblem(hours, longest, lastDate) : "Tick at least one treatment.";

  const offerings = new Set(list.map((s) => s.offering).filter(Boolean));
  const missing = list
    .filter((s) => PARTNER[s.offering] && !offerings.has(PARTNER[s.offering]) && STANDARD[PARTNER[s.offering]])
    .map((s) => ({ from: s, offering: STANDARD[PARTNER[s.offering]] }))
    .filter((m, i, all) => all.findIndex((x) => x.offering.key === m.offering.key) === i);

  const apply = async () => {
    setBusy(true);
    setError("");
    setResults(null);
    try {
      const r = await adminApi<{ results: { title: string; ok: boolean; error?: string }[] }>("/api/admin/sessions", {
        method: "POST",
        body: JSON.stringify({ action: "setAvailability", ids: selected, availability: { enabled: true, ...hours } }),
      });
      setResults(r.results);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the hours.");
    }
    setBusy(false);
  };

  const addMissing = async () => {
    setBusy(true);
    setError("");
    let made = 0;
    try {
      for (const m of missing) {
        const o = m.offering;
        const body = sessionPayload(m.from, {
          titleNl: o.titleNl,
          titleEn: o.titleEn,
          descriptionNl: o.descriptionNl,
          descriptionEn: o.descriptionEn,
          durationMin: o.durationMin,
          priceCents: o.priceCents,
          offering: o.key,
          imageKey: m.from.imageKey || o.photo,
          // Same hours as the other length, when they fit; otherwise the new one starts without hours.
          availability: m.from.availability?.enabled && !hoursProblem(m.from.availability, o.durationMin, m.from.date) ? m.from.availability : { enabled: false, startDate: "", weekdays: [], intervalWeeks: 1, slotTimes: [], bufferMinutes: 0 },
        });
        await adminApi("/api/admin/sessions", { method: "POST", body: JSON.stringify({ action: "create", session: body, repeatWeeks: 0 }) });
        made++;
      }
      setNote(`${made} treatment(s) added. Check their hours below.`);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add the missing versions.");
    }
    setBusy(false);
  };

  const savePrice = async (s: AdminSession) => {
    const cents = Math.round(Number((prices[s.id] ?? "").replace(",", ".")) * 100);
    if (!Number.isFinite(cents) || cents < 0) return setError("Please enter a price in euros.");
    setBusy(true);
    setError("");
    try {
      await adminApi(`/api/admin/sessions?id=${s.id}`, { method: "PATCH", body: JSON.stringify(sessionPayload(s, { priceCents: cents })) });
      setPrices((p) => {
        const next = { ...p };
        delete next[s.id];
        return next;
      });
      setNote(`Price of ${s.title.nl} saved.`);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the price.");
    }
    setBusy(false);
  };

  return (
    <Modal title="Massage & healing hours" onClose={onClose} wide>
      <p className="text-sm text-forest/75">
        Customers book massages and healings in these hours. Tick the treatments, set your hours once, and press <strong>Save hours</strong>. Times that are already booked, or clash with a class, are hidden on the website automatically.
      </p>

      {list.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-white p-6 text-center text-forest/70">No treatments by appointment yet. Create one with “+ New session”.</p>
      ) : (
        <div className="mt-5 grid gap-2">
          {list.map((s) => {
            const std = STANDARD[s.offering];
            const priceOff = std && std.priceCents !== s.priceCents;
            return (
              <div key={s.id} className={`flex flex-wrap items-center gap-3 rounded-2xl border bg-white px-4 py-3 ${selected.includes(s.id) ? "border-forest" : "border-forest/10"}`}>
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 accent-[var(--color-saffron)]"
                    checked={selected.includes(s.id)}
                    onChange={(e) => setSelected((x) => (e.target.checked ? [...x, s.id] : x.filter((y) => y !== s.id)))}
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">
                      {s.title.nl} {s.status === "draft" && <Badge tone="grey">hidden</Badge>}
                    </span>
                    <span className="block text-sm text-forest/65">
                      {s.durationMin} min · {s.isOnline ? "online" : "live"} ·{" "}
                      {s.availability?.enabled ? hoursSummary(s.availability) : <span className="font-semibold text-amber-700">no weekly hours yet</span>}
                    </span>
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    className={`${input} mt-0`} style={{ width: "6rem" }}
                    inputMode="decimal"
                    aria-label={`Price of ${s.title.nl}`}
                    value={prices[s.id] ?? String(s.priceCents / 100).replace(".", ",")}
                    onChange={(e) => setPrices((p) => ({ ...p, [s.id]: e.target.value }))}
                  />
                  {prices[s.id] !== undefined ? (
                    <Btn kind="dark" disabled={busy} onClick={() => savePrice(s)}>
                      Save €
                    </Btn>
                  ) : priceOff ? (
                    <button type="button" onClick={() => setPrices((p) => ({ ...p, [s.id]: String(std.priceCents / 100) }))} className="text-xs font-semibold text-amber-700 underline underline-offset-2">
                      standard is {euro(std.priceCents)}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {missing.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-saffron/10 px-4 py-3 text-sm text-forest">
          <span>
            Missing on the website: <strong>{missing.map((m) => `${m.offering.titleEn.split(" · ")[0]}${/\d/.test(m.offering.titleEn) ? "" : ` ${m.offering.durationMin} min`}`).join(", ")}</strong>
          </span>
          <Btn disabled={busy} onClick={addMissing}>
            Add {missing.length === 1 ? "it" : `these ${missing.length}`}
          </Btn>
        </div>
      )}

      {list.length > 0 && (
        <div className="mt-6 rounded-2xl bg-cream p-4 ring-1 ring-forest/10 sm:p-5">
          <p className="mb-4 font-semibold text-ink">Hours for the {chosen.length} ticked treatment(s)</p>
          <HoursEditor value={hours} onChange={setHours} durationMin={longest} lastDate={lastDate} />
        </div>
      )}

      <div className="mt-4 grid gap-3">
        <ErrorNote text={error} />
        {note && <p className="text-sm font-semibold text-green-700">{note}</p>}
        {results && (
          <ul className="grid gap-1 rounded-2xl bg-white p-4 text-sm">
            {results.map((r, i) => (
              <li key={i} className={r.ok ? "text-green-700" : "text-red-700"}>
                {r.ok ? "✓" : "✗"} {r.title}
                {r.error ? `: ${r.error}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <Btn kind="ghost" onClick={onClose}>
          Close
        </Btn>
        {list.length > 0 && (
          <Btn disabled={busy || !!problem} onClick={apply}>
            {busy ? "Saving…" : `Save hours for ${chosen.length} treatment(s)`}
          </Btn>
        )}
      </div>
    </Modal>
  );
}
