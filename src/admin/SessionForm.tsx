import { useState } from "react";
import { ApiError } from "../lib/api";
import { adminApi, CATEGORY_LABELS, type AdminSession } from "./adminApi";
import { Btn, ErrorNote, input, Label, Modal } from "./ui";

type Form = {
  titleNl: string;
  titleEn: string;
  descriptionNl: string;
  descriptionEn: string;
  category: string;
  venue: string;
  address: string;
  isOnline: boolean;
  onlineLink: string;
  date: string;
  startTime: string;
  durationMin: string;
  capacity: string;
  price: string;
  maxPerBooking: string;
  status: "published" | "draft";
  repeatWeeks: string;
};

const today = () => new Date().toISOString().slice(0, 10);

function fromSession(s?: AdminSession): Form {
  if (!s) {
    return {
      titleNl: "", titleEn: "", descriptionNl: "", descriptionEn: "", category: "yoga",
      venue: "", address: "", isOnline: false, onlineLink: "", date: today(), startTime: "19:00",
      durationMin: "90", capacity: "10", price: "", maxPerBooking: "4", status: "published", repeatWeeks: "0",
    };
  }
  return {
    titleNl: s.title.nl, titleEn: s.title.en === s.title.nl ? "" : s.title.en,
    descriptionNl: s.description.nl, descriptionEn: s.description.en === s.description.nl ? "" : s.description.en,
    category: s.category, venue: s.venue, address: s.address, isOnline: s.isOnline, onlineLink: s.onlineLink,
    date: s.date, startTime: s.startTime, durationMin: String(s.durationMin), capacity: String(s.capacity),
    price: s.priceCents ? (s.priceCents / 100).toFixed(2).replace(/\.00$/, "") : "0",
    maxPerBooking: String(s.maxPerBooking), status: s.status === "draft" ? "draft" : "published", repeatWeeks: "0",
  };
}

/** Euro text ("25", "25,50", "25.5") -> cents, or NaN. */
const toCents = (v: string) => {
  const n = Number(v.trim().replace(",", "."));
  return v.trim() === "" || !Number.isFinite(n) || n < 0 ? NaN : Math.round(n * 100);
};

export function SessionForm({ session, onClose, onSaved }: { session?: AdminSession; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Form>(() => fromSession(session));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const editing = !!session;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceCents = toCents(f.price);
    const capacity = Number(f.capacity);
    const durationMin = Number(f.durationMin);
    const maxPerBooking = Number(f.maxPerBooking);
    if (!f.titleNl.trim()) return setError("Please give the session a title (Dutch).");
    if (Number.isNaN(priceCents)) return setError("Please enter a price in euros (0 for free).");
    if (!(capacity >= 1)) return setError("Capacity must be at least 1.");
    if (!(durationMin >= 5)) return setError("Duration must be at least 5 minutes.");
    if (!(maxPerBooking >= 1)) return setError("Max people per booking must be at least 1.");
    if (!editing && Date.parse(`${f.date}T${f.startTime}`) < Date.now() - 60_000) {
      return setError("This date and time is in the past.");
    }

    const payload = {
      titleNl: f.titleNl, titleEn: f.titleEn, descriptionNl: f.descriptionNl, descriptionEn: f.descriptionEn,
      category: f.category, venue: f.isOnline ? "" : f.venue, address: f.isOnline ? "" : f.address,
      isOnline: f.isOnline, onlineLink: f.isOnline ? f.onlineLink : "", date: f.date, startTime: f.startTime,
      durationMin, capacity, priceCents, maxPerBooking: Math.min(maxPerBooking, capacity), status: f.status,
    };
    setBusy(true);
    setError("");
    try {
      if (editing) {
        await adminApi(`/api/admin/sessions?id=${session.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await adminApi("/api/admin/sessions", {
          method: "POST",
          body: JSON.stringify({ action: "create", session: payload, repeatWeeks: Number(f.repeatWeeks) || 0 }),
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Saving failed.");
      setBusy(false);
    }
  };

  return (
    <Modal title={editing ? "Edit session" : "New session"} onClose={onClose} wide>
      <form onSubmit={save} className="grid gap-5 sm:grid-cols-2" noValidate>
        <Label text="Title (Dutch) *" className="sm:col-span-2">
          <input className={input} value={f.titleNl} onChange={(e) => set("titleNl", e.target.value)} placeholder="bv. Kundalini Yoga & gongbad" />
        </Label>
        <Label text="Title (English)" hint="Optional. If empty, the Dutch title is shown." className="sm:col-span-2">
          <input className={input} value={f.titleEn} onChange={(e) => set("titleEn", e.target.value)} placeholder="e.g. Kundalini Yoga & gong bath" />
        </Label>

        <Label text="Type">
          <select className={input} value={f.category} onChange={(e) => set("category", e.target.value)}>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Label>
        <Label text="Visibility">
          <select className={input} value={f.status} onChange={(e) => set("status", e.target.value as Form["status"])}>
            <option value="published">Published (visible & bookable)</option>
            <option value="draft">Draft (hidden)</option>
          </select>
        </Label>

        <Label text="Date">
          <input type="date" className={input} value={f.date} onChange={(e) => set("date", e.target.value)} />
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <Label text="Start time" hint="Belgian time">
            <input type="time" className={input} value={f.startTime} onChange={(e) => set("startTime", e.target.value)} />
          </Label>
          <Label text="Duration (min)">
            <input type="number" min={5} inputMode="numeric" className={input} value={f.durationMin} onChange={(e) => set("durationMin", e.target.value)} />
          </Label>
        </div>

        <label className="flex items-center gap-3 text-sm font-semibold text-forest sm:col-span-2">
          <input type="checkbox" className="h-5 w-5 accent-[var(--color-saffron)]" checked={f.isOnline} onChange={(e) => set("isOnline", e.target.checked)} />
          This is an online session
        </label>
        {f.isOnline ? (
          <Label text="Online link (Zoom, Meet…)" hint="Only sent to people who booked, in their confirmation." className="sm:col-span-2">
            <input className={input} value={f.onlineLink} onChange={(e) => set("onlineLink", e.target.value)} placeholder="https://" />
          </Label>
        ) : (
          <>
            <Label text="Venue">
              <input className={input} value={f.venue} onChange={(e) => set("venue", e.target.value)} placeholder="e.g. Studio Deurne" />
            </Label>
            <Label text="Address">
              <input className={input} value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="Street 1, 2100 Deurne" />
            </Label>
          </>
        )}

        <Label text="Price per person (€)" hint="0 = free">
          <input className={input} inputMode="decimal" value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="25" />
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <Label text="Places (capacity)">
            <input type="number" min={1} inputMode="numeric" className={input} value={f.capacity} onChange={(e) => set("capacity", e.target.value)} />
          </Label>
          <Label text="Max per booking" hint="1 for a private massage">
            <input type="number" min={1} inputMode="numeric" className={input} value={f.maxPerBooking} onChange={(e) => set("maxPerBooking", e.target.value)} />
          </Label>
        </div>

        <Label text="Description (Dutch)" className="sm:col-span-2">
          <textarea className={`${input} min-h-[110px]`} value={f.descriptionNl} onChange={(e) => set("descriptionNl", e.target.value)} />
        </Label>
        <Label text="Description (English)" hint="Optional." className="sm:col-span-2">
          <textarea className={`${input} min-h-[110px]`} value={f.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} />
        </Label>

        {!editing && (
          <Label text="Repeat every week" hint="0 = only this date. 3 = this date plus the next 3 weeks (4 sessions)." className="sm:col-span-2">
            <input type="number" min={0} max={52} inputMode="numeric" className={`${input} max-w-[8rem]`} value={f.repeatWeeks} onChange={(e) => set("repeatWeeks", e.target.value)} />
          </Label>
        )}

        <div className="sm:col-span-2">
          <ErrorNote text={error} />
        </div>
        <div className="flex flex-wrap justify-end gap-3 sm:col-span-2">
          <Btn kind="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save changes" : "Create session"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}
