import { useRef, useState } from "react";
import { ApiError } from "../lib/api";
import { adminApi, CATEGORY_LABELS, type AdminSession } from "./adminApi";
import { fileToDataUrl } from "./image";
import { inOneYear, nextWeekday, OFFERING_LABELS, TEMPLATES } from "./templates";
import { PHOTO_KEYS } from "../../shared/catalog";
import { photoFocus, photoSrc } from "../lib/api";
import { sm } from "../data/site";
import { Btn, ErrorNote, input, Label, Modal } from "./ui";

/** Category picker groups. "online" is no longer a type: online is a checkbox on a yoga or healing session. */
const CATEGORY_GROUPS: [string, string[]][] = [
  ["Kundalini Yoga", ["yoga", "gong", "workshop"]],
  ["Massage & healing", ["massage", "healing"]],
  ["Other", ["retreat", "other"]],
];

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
  offering: string;
  imageKey: string;
  bookingMode: "scheduled" | "appointment";
  availabilityEnabled: boolean;
  availabilityStartDate: string;
  availabilityWeekdays: number[];
  availabilityIntervalWeeks: string;
  availabilitySlotTimes: string;
  availabilityBufferMinutes: string;
};

const APPOINTMENT_TIME = "23:59";

const today = () => new Date().toISOString().slice(0, 10);

function fromSession(s?: AdminSession): Form {
  if (!s) {
    return {
      titleNl: "", titleEn: "", descriptionNl: "", descriptionEn: "", category: "yoga",
      venue: "", address: "", isOnline: false, onlineLink: "", date: today(), startTime: "19:00",
      durationMin: "90", capacity: "10", price: "", maxPerBooking: "4", status: "published", repeatWeeks: "0",
      offering: "", imageKey: "", bookingMode: "scheduled",
      availabilityEnabled: false, availabilityStartDate: today(), availabilityWeekdays: [],
      availabilityIntervalWeeks: "1", availabilitySlotTimes: "09:00, 11:00, 13:00", availabilityBufferMinutes: "15",
    };
  }
  return {
    titleNl: s.title.nl, titleEn: s.title.en === s.title.nl ? "" : s.title.en,
    descriptionNl: s.description.nl, descriptionEn: s.description.en === s.description.nl ? "" : s.description.en,
    category: s.category, venue: s.venue, address: s.address, isOnline: s.isOnline, onlineLink: s.onlineLink,
    date: s.date, startTime: s.startTime, durationMin: String(s.durationMin), capacity: String(s.capacity),
    price: s.priceCents ? (s.priceCents / 100).toFixed(2).replace(/\.00$/, "") : "0",
    maxPerBooking: String(s.maxPerBooking), status: s.status === "draft" ? "draft" : "published", repeatWeeks: "0",
    offering: s.offering ?? "", imageKey: s.imageKey ?? "", bookingMode: s.bookingMode === "appointment" ? "appointment" : "scheduled",
    availabilityEnabled: !!s.availability?.enabled,
    availabilityStartDate: s.availability?.startDate || today(),
    availabilityWeekdays: s.availability?.weekdays ?? [],
    availabilityIntervalWeeks: String(s.availability?.intervalWeeks ?? 1),
    availabilitySlotTimes: (s.availability?.slotTimes ?? ["09:00", "11:00", "13:00"]).join(", "),
    availabilityBufferMinutes: String(s.availability?.bufferMinutes ?? 15),
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
  const [templateId, setTemplateId] = useState("");

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const tpl = TEMPLATES.find((x) => x.id === id);
    if (!tpl) return;
    setF((x) => {
      const startTime = tpl.fields.startTime ?? x.startTime;
      return {
        ...x,
        ...tpl.fields,
        startTime,
        date: tpl.weekday !== undefined ? nextWeekday(tpl.weekday, startTime) : tpl.fields.bookingMode === "appointment" ? inOneYear() : x.date,
        venue: tpl.fields.isOnline ? "" : x.venue,
        address: tpl.fields.isOnline ? "" : x.address,
        // Weekly classes are usually planned as a series (12 weeks); massages and healings are one-off.
        repeatWeeks: tpl.weekday !== undefined ? "11" : "0",
      };
    });
    setError("");
  };

  // Cover photo. `imageData` is a freshly chosen image; `removeImage` clears the existing one.
  const [imageData, setImageData] = useState("");
  const [removeImage, setRemoveImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const existingImageUrl = session?.hasImage ? session.imageUrl : "";
  const preview = imageData || (removeImage ? "" : existingImageUrl);

  const pickImage = async (file?: File) => {
    if (!file) return;
    try {
      const data = await fileToDataUrl(file);
      if (data.length > 3_400_000) {
        setError("That image is too large even after resizing. Please pick a smaller photo.");
        return;
      }
      setImageData(data);
      setRemoveImage(false);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that image.");
    }
  };

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
    const appt = f.bookingMode === "appointment";
    const startTime = appt ? APPOINTMENT_TIME : f.startTime;
    if (!editing && Date.parse(`${f.date}T${startTime}`) < Date.now() - 60_000) {
      return setError(appt ? "The 'bookable until' date is in the past." : "This date and time is in the past.");
    }

    const slotTimes = f.availabilitySlotTimes.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean);
    const intervalWeeks = Number(f.availabilityIntervalWeeks);
    const bufferMinutes = Number(f.availabilityBufferMinutes);
    const availability = f.availabilityEnabled
      ? {
          enabled: true,
          startDate: f.availabilityStartDate,
          weekdays: [...new Set(f.availabilityWeekdays)].sort((a, b) => a - b),
          intervalWeeks,
          slotTimes: [...new Set(slotTimes)].sort(),
          bufferMinutes,
        }
      : { enabled: false, startDate: "", weekdays: [], intervalWeeks: 1, slotTimes: [], bufferMinutes: 0 };
    if (f.availabilityEnabled) {
      if (!appt) return setError("Weekly availability is only available for appointment sessions.");
      if (!f.availabilityStartDate || f.availabilityStartDate > f.date) return setError("The availability start date must be on or before the last bookable date.");
      if (availability.weekdays.length === 0) return setError("Select at least one weekday.");
      if (!(intervalWeeks >= 1 && intervalWeeks <= 52 && Number.isInteger(intervalWeeks))) return setError("Repeat frequency must be between 1 and 52 weeks.");
      if (slotTimes.length === 0 || availability.slotTimes.length !== slotTimes.length) return setError("Add unique slot start times, separated by commas.");
      if (slotTimes.some((x) => !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(x))) return setError("Use 24-hour time, for example 09:00, 11:00, 13:30.");
      if (!(bufferMinutes >= 0 && bufferMinutes <= 180 && Number.isInteger(bufferMinutes))) return setError("Buffer must be between 0 and 180 minutes.");
      const starts = availability.slotTimes.map((x) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3)));
      for (let i = 1; i < starts.length; i++) {
        if (starts[i] - starts[i - 1] < durationMin + bufferMinutes) {
          return setError("These slots overlap. Leave at least the session duration plus buffer between start times.");
        }
      }
    }

    const payload = {
      titleNl: f.titleNl, titleEn: f.titleEn, descriptionNl: f.descriptionNl, descriptionEn: f.descriptionEn,
      category: f.category, venue: f.isOnline ? "" : f.venue, address: f.isOnline ? "" : f.address,
      isOnline: f.isOnline, onlineLink: f.isOnline ? f.onlineLink : "", date: f.date, startTime,
      durationMin, capacity, priceCents, maxPerBooking: Math.min(maxPerBooking, capacity), status: f.status,
      imageData, removeImage, imageKey: f.imageKey, offering: f.offering, bookingMode: f.bookingMode, availability,
    };
    setBusy(true);
    setError("");
    try {
      if (editing) {
        await adminApi(`/api/admin/sessions?id=${session.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await adminApi("/api/admin/sessions", {
          method: "POST",
          body: JSON.stringify({ action: "create", session: payload, repeatWeeks: appt ? 0 : Number(f.repeatWeeks) || 0 }),
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
        {!editing && (
          <div className="rounded-2xl border border-saffron/30 bg-saffron/5 p-4 sm:col-span-2">
            <Label text="Start from a template (optional)" hint="Fills in title, type, time, duration and price. You can still change everything.">
              <select className={input} value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
                <option value="">Choose one of your regular sessions…</option>
                {[...new Set(TEMPLATES.map((x) => x.group))].map((g) => (
                  <optgroup key={g} label={g}>
                    {TEMPLATES.filter((x) => x.group === g).map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Label>
          </div>
        )}
        <Label text="Title (Dutch) *" className="sm:col-span-2">
          <input className={input} value={f.titleNl} onChange={(e) => set("titleNl", e.target.value)} placeholder="bv. Kundalini Yoga & gongbad" />
        </Label>
        <Label text="Title (English)" hint="Optional. If empty, the Dutch title is shown." className="sm:col-span-2">
          <input className={input} value={f.titleEn} onChange={(e) => set("titleEn", e.target.value)} placeholder="e.g. Kundalini Yoga & gong bath" />
        </Label>

        <div className="sm:col-span-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-forest/70">Photo</span>
          <p className="mt-1 text-xs text-forest/50">
            Pick one of your photos below, or upload a new one (an upload is used instead of the chosen photo). The preview shows how the card crops it.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <div className="grid aspect-[4/3] w-40 shrink-0 place-items-center overflow-hidden rounded-xl border border-forest/15 bg-cream">
              {preview ? (
                <img src={preview} alt="Session preview" className="h-full w-full object-cover" />
              ) : f.imageKey ? (
                <img src={sm(photoSrc(f.imageKey))} alt="Session preview" style={{ objectPosition: photoFocus(f.imageKey) }} className="h-full w-full object-cover" />
              ) : (
                <span className="px-2 text-center text-[0.7rem] text-forest/40">No photo (default is used)</span>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => pickImage(e.target.files?.[0] ?? undefined)}
            />
            <div className="flex flex-wrap gap-2">
              <Btn kind="ghost" onClick={() => fileRef.current?.click()}>
                {preview ? "Change photo" : "Upload photo"}
              </Btn>
              {preview && (
                <Btn
                  kind="ghost"
                  onClick={() => {
                    setImageData("");
                    setRemoveImage(true);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  Remove upload
                </Btn>
              )}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-8">
            {PHOTO_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => set("imageKey", f.imageKey === k ? "" : k)}
                aria-pressed={f.imageKey === k}
                title={k}
                className={`aspect-square overflow-hidden rounded-lg border-2 ${f.imageKey === k ? "border-saffron" : "border-transparent opacity-80 hover:opacity-100"}`}
              >
                <img src={sm(photoSrc(k))} alt={k} loading="lazy" style={{ objectPosition: photoFocus(k) }} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <Label text="Type">
          <select className={input} value={f.category} onChange={(e) => set("category", e.target.value)}>
            {f.category === "online" && <option value="online">{CATEGORY_LABELS.online}</option>}
            {CATEGORY_GROUPS.map(([label, keys]) => (
              <optgroup key={label} label={label}>
                {keys.map((k) => (
                  <option key={k} value={k}>
                    {CATEGORY_LABELS[k]}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Label>
        <Label text="Visibility">
          <select className={input} value={f.status} onChange={(e) => set("status", e.target.value as Form["status"])}>
            <option value="published">Published (visible & bookable)</option>
            <option value="draft">Draft (hidden)</option>
          </select>
        </Label>

        <Label text="How is it booked?" className="sm:col-span-2">
          <select className={input} value={f.bookingMode} onChange={(e) => set("bookingMode", e.target.value as Form["bookingMode"])}>
            <option value="scheduled">Fixed date & time (classes)</option>
            <option value="appointment">By appointment: the customer pays and gives a preferred moment, you confirm it (massages, healings)</option>
          </select>
        </Label>
        <Label text={f.bookingMode === "appointment" ? "Last bookable date" : "Date"} hint={f.bookingMode === "appointment" ? "No appointment can be booked after this date." : undefined}>
          <input type="date" className={input} value={f.date} onChange={(e) => set("date", e.target.value)} />
        </Label>
        {f.bookingMode === "appointment" && (
          <div className="sm:col-span-2 rounded-2xl border border-forest/10 bg-cream p-4">
            <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold text-forest">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 accent-[var(--color-saffron)]"
                checked={f.availabilityEnabled}
                onChange={(e) => set("availabilityEnabled", e.target.checked)}
              />
              <span>
                Offer recurring weekly appointment slots
                <span className="mt-1 block text-xs font-normal text-forest/60">Customers choose an actual date and time. Only the selected weekdays and slots are bookable.</span>
              </span>
            </label>
            {f.availabilityEnabled && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Label text="Availability starts on">
                  <input type="date" className={input} value={f.availabilityStartDate} min={today()} max={f.date} onChange={(e) => set("availabilityStartDate", e.target.value)} />
                </Label>
                <Label text="Repeat every (weeks)" hint="1 = every week, 2 = every other week.">
                  <input type="number" min={1} max={52} className={input} value={f.availabilityIntervalWeeks} onChange={(e) => set("availabilityIntervalWeeks", e.target.value)} />
                </Label>
                <div className="sm:col-span-2">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-forest/70">Available weekdays *</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      [1, "Monday"], [2, "Tuesday"], [3, "Wednesday"], [4, "Thursday"],
                      [5, "Friday"], [6, "Saturday"], [0, "Sunday"],
                    ].map(([day, label]) => (
                      <label key={day} className="flex cursor-pointer items-center gap-2 rounded-full border border-forest/15 bg-white px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[var(--color-saffron)]"
                          checked={f.availabilityWeekdays.includes(Number(day))}
                          onChange={(e) => set("availabilityWeekdays", e.target.checked
                            ? [...f.availabilityWeekdays, Number(day)]
                            : f.availabilityWeekdays.filter((x) => x !== Number(day)))}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <Label text="Daily slot start times *" hint="Comma-separated 24-hour times, e.g. 09:00, 11:00, 14:00." >
                  <textarea className={input + " min-h-[90px]"} value={f.availabilitySlotTimes} onChange={(e) => set("availabilitySlotTimes", e.target.value)} />
                </Label>
                <Label text="Buffer between sessions (minutes)" hint="Added after each appointment to prevent back-to-back overlaps.">
                  <input type="number" min={0} max={180} className={input} value={f.availabilityBufferMinutes} onChange={(e) => set("availabilityBufferMinutes", e.target.value)} />
                </Label>
                <p className="sm:col-span-2 rounded-xl bg-white px-4 py-3 text-xs leading-relaxed text-forest/65">
                  Duration is {f.durationMin || "—"} minutes. The system checks that daily slots do not overlap, blocks other booked or scheduled sessions, and rejects all dates outside the start/end range.
                </p>
              </div>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          {f.bookingMode === "scheduled" ? (
            <Label text="Start time" hint="Belgian time">
              <input type="time" className={input} value={f.startTime} onChange={(e) => set("startTime", e.target.value)} />
            </Label>
          ) : (
            <div />
          )}
          <Label text="Duration (min)">
            <input type="number" min={5} inputMode="numeric" className={input} value={f.durationMin} onChange={(e) => set("durationMin", e.target.value)} />
          </Label>
        </div>
        <Label text="Regular session" hint="Used by membership cards to know which sessions they can pay for." className="sm:col-span-2">
          <select className={input} value={f.offering} onChange={(e) => set("offering", e.target.value)}>
            <option value="">None (one-off session)</option>
            {Object.entries(OFFERING_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </Label>

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

        {!editing && f.bookingMode === "scheduled" && (
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
