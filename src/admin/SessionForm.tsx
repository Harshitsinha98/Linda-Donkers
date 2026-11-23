import { useRef, useState } from "react";
import { ApiError } from "../lib/api";
import { adminApi, CATEGORY_LABELS, dayLabel, hoursProblem, todayBE, type AdminSession, type Hours } from "./adminApi";
import { fileToDataUrl } from "./image";
import { inOneYear, nextWeekday, OFFERING_LABELS, TEMPLATES } from "./templates";
import { PHOTO_KEYS } from "../../shared/catalog";
import { photoFocus, photoSrc } from "../lib/api";
import { sm } from "../data/site";
import { HoursEditor } from "./HoursEditor";
import { Btn, ErrorNote, input, Label, Modal } from "./ui";

/** Category picker groups. "online" is no longer a type: online is a checkbox on a yoga or healing session. */
const CATEGORY_GROUPS: [string, string[]][] = [
  ["Kundalini Yoga", ["yoga", "gong", "workshop"]],
  ["Massage & healing", ["massage", "healing"]],
  ["Other", ["retreat", "other"]],
];

const DEFAULT_VENUE = "Diamond Yoga · Deurne (Antwerpen)";

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
  /** Appointment sessions: customers pick a free time in the calendar (true) or suggest one (false). */
  useHours: boolean;
  hours: Hours;
};

const APPOINTMENT_TIME = "23:59";
const emptyHours = (): Hours => ({ startDate: todayBE(), weekdays: [], intervalWeeks: 1, slotTimes: [], bufferMinutes: 15 });

function fromSession(s?: AdminSession): Form {
  if (!s) {
    return {
      titleNl: "", titleEn: "", descriptionNl: "", descriptionEn: "", category: "yoga",
      venue: DEFAULT_VENUE, address: "", isOnline: false, onlineLink: "", date: todayBE(), startTime: "19:00",
      durationMin: "90", capacity: "10", price: "", maxPerBooking: "4", status: "published", repeatWeeks: "0",
      offering: "", imageKey: "", bookingMode: "scheduled", useHours: true, hours: emptyHours(),
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
    useHours: !!s.availability?.enabled,
    hours: s.availability?.enabled
      ? { startDate: s.availability.startDate, weekdays: s.availability.weekdays, intervalWeeks: s.availability.intervalWeeks, slotTimes: s.availability.slotTimes, bufferMinutes: s.availability.bufferMinutes }
      : emptyHours(),
  };
}

/** Euro text ("25", "25,50", "25.5") -> cents, or NaN. */
const toCents = (v: string) => {
  const n = Number(v.trim().replace(",", "."));
  return v.trim() === "" || !Number.isFinite(n) || n < 0 ? NaN : Math.round(n * 100);
};

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 sm:col-span-2 sm:p-5">
      <h3 className="mb-4 flex items-center gap-2 font-semibold text-ink">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-forest text-xs font-bold text-linen">{n}</span>
        {title}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** "What do you want to add?" — Linda's regular sessions as big buttons, plus two blank starts. */
function Chooser({ onPick }: { onPick: (templateId: string | "scheduled" | "appointment") => void }) {
  const groups = [...new Set(TEMPLATES.map((x) => x.group))];
  return (
    <div className="grid gap-6">
      {groups.map((g) => (
        <div key={g}>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-forest/70">{g}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {TEMPLATES.filter((x) => x.group === g).map((x) => (
              <button key={x.id} type="button" onClick={() => onPick(x.id)} className="rounded-2xl border border-forest/10 bg-white px-4 py-3 text-left transition-colors hover:border-saffron">
                <span className="block font-semibold text-ink">{x.fields.titleEn || x.fields.titleNl}</span>
                <span className="block text-sm text-forest/65">{x.label.slice(x.fields.titleEn.length + 3)}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-forest/70">Something new</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => onPick("scheduled")} className="rounded-2xl border-2 border-dashed border-forest/20 bg-white px-4 py-3 text-left hover:border-saffron">
            <span className="block font-semibold text-ink">Class or event on a fixed date</span>
            <span className="block text-sm text-forest/65">Workshop, gong evening, retreat, extra class…</span>
          </button>
          <button type="button" onClick={() => onPick("appointment")} className="rounded-2xl border-2 border-dashed border-forest/20 bg-white px-4 py-3 text-left hover:border-saffron">
            <span className="block font-semibold text-ink">Treatment by appointment</span>
            <span className="block text-sm text-forest/65">A massage or healing customers book in your free hours</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function SessionForm({ session, onClose, onSaved }: { session?: AdminSession; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Form>(() => fromSession(session));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const editing = !!session;
  const [chosen, setChosen] = useState(editing);

  const pick = (id: string) => {
    setChosen(true);
    setError("");
    if (id === "scheduled" || id === "appointment") {
      const appt = id === "appointment";
      setF((x) => ({
        ...x,
        bookingMode: id,
        category: appt ? "massage" : "workshop",
        capacity: appt ? "999" : "10",
        maxPerBooking: appt ? "1" : "4",
        durationMin: appt ? "60" : "90",
        date: appt ? inOneYear() : todayBE(),
      }));
      return;
    }
    const tpl = TEMPLATES.find((x) => x.id === id);
    if (!tpl) return;
    setF((x) => {
      const startTime = tpl.fields.startTime ?? x.startTime;
      return {
        ...x,
        ...tpl.fields,
        startTime,
        date: tpl.weekday !== undefined ? nextWeekday(tpl.weekday, startTime) : tpl.fields.bookingMode === "appointment" ? inOneYear() : x.date,
        venue: tpl.fields.isOnline ? "" : x.venue || DEFAULT_VENUE,
        address: tpl.fields.isOnline ? "" : x.address,
        // Weekly classes are usually planned as a series (12 weeks); massages and healings are one-off.
        repeatWeeks: tpl.weekday !== undefined ? "11" : "0",
      };
    });
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

  const appt = f.bookingMode === "appointment";
  const repeat = Number(f.repeatWeeks) || 0;
  const lastOfSeries = (() => {
    const d = new Date(`${f.date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + repeat * 7);
    return d.toISOString().slice(0, 10);
  })();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceCents = toCents(f.price);
    const capacity = Number(f.capacity);
    const durationMin = Number(f.durationMin);
    const maxPerBooking = Number(f.maxPerBooking);
    if (!f.titleNl.trim()) return setError("Please give the session a title (Dutch).");
    if (Number.isNaN(priceCents)) return setError("Please enter a price in euros (0 for free).");
    if (!(durationMin >= 5)) return setError("Duration must be at least 5 minutes.");
    if (!(capacity >= 1)) return setError("Places must be at least 1.");
    if (!(maxPerBooking >= 1)) return setError("Max people per booking must be at least 1.");
    const startTime = appt ? APPOINTMENT_TIME : f.startTime;
    if (!editing && Date.parse(`${f.date}T${startTime}`) < Date.now() - 60_000) {
      return setError(appt ? "The 'bookable until' date is in the past." : "This date and time is in the past.");
    }
    const withHours = appt && f.useHours;
    if (withHours) {
      const problem = hoursProblem(f.hours, durationMin, f.date);
      if (problem) return setError(`Weekly hours: ${problem}`);
    }
    const availability = withHours
      ? { enabled: true, ...f.hours, weekdays: [...new Set(f.hours.weekdays)].sort((a, b) => a - b), slotTimes: [...new Set(f.hours.slotTimes)].sort() }
      : { enabled: false, startDate: "", weekdays: [], intervalWeeks: 1, slotTimes: [], bufferMinutes: 0 };

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
          body: JSON.stringify({ action: "create", session: payload, repeatWeeks: appt ? 0 : repeat }),
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Saving failed.");
      setBusy(false);
    }
  };

  if (!chosen) {
    return (
      <Modal title="What do you want to add?" onClose={onClose} wide>
        <Chooser onPick={pick} />
      </Modal>
    );
  }

  return (
    <Modal title={editing ? `Edit: ${session.title.nl}` : "New session"} onClose={onClose} wide>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2" noValidate>
        {!editing && (
          <button type="button" onClick={() => setChosen(false)} className="justify-self-start text-sm font-semibold text-forest underline underline-offset-4 sm:col-span-2">
            ← Choose something else
          </button>
        )}

        <Section n={1} title="What is it?">
          <Label text="Title (Dutch) *" className="sm:col-span-2">
            <input className={input} value={f.titleNl} onChange={(e) => set("titleNl", e.target.value)} placeholder="bv. Kundalini Yoga & gongbad" />
          </Label>
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
          <div className="grid grid-cols-2 gap-4">
            <Label text="Price (€)" hint="0 = free">
              <input className={input} inputMode="decimal" value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="25" />
            </Label>
            <Label text="Length (min)">
              <input type="number" min={5} inputMode="numeric" className={input} value={f.durationMin} onChange={(e) => set("durationMin", e.target.value)} />
            </Label>
          </div>
          <div className="sm:col-span-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-forest/70">How do people book it?</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["scheduled", "On a fixed date and time", "Classes, workshops, events"],
                  ["appointment", "By appointment", "Massages and healings, in your free hours"],
                ] as const
              ).map(([mode, label, sub]) => (
                <label key={mode} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 ${f.bookingMode === mode ? "border-forest bg-cream" : "border-forest/10"}`}>
                  <input
                    type="radio"
                    name="mode"
                    className="mt-1 accent-[var(--color-saffron)]"
                    checked={f.bookingMode === mode}
                    onChange={() =>
                      setF((x) => ({
                        ...x,
                        bookingMode: mode,
                        // Sensible defaults when switching: appointments are one person at a time.
                        ...(mode === "appointment" ? { capacity: "999", maxPerBooking: "1", date: x.date > inOneYear() || editing ? x.date : inOneYear() } : {}),
                        ...(mode === "scheduled" && x.capacity === "999" ? { capacity: "10", maxPerBooking: "4" } : {}),
                      }))
                    }
                  />
                  <span>
                    <span className="block font-semibold text-ink">{label}</span>
                    <span className="block text-sm text-forest/65">{sub}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </Section>

        <Section n={2} title="When?">
          {appt ? (
            <>
              <div className="grid gap-2 sm:col-span-2">
                <label className="flex cursor-pointer items-start gap-3 text-sm text-forest">
                  <input type="radio" name="hours" className="mt-1 accent-[var(--color-saffron)]" checked={f.useHours} onChange={() => set("useHours", true)} />
                  <span>
                    <strong>Customers pick a free time in my calendar</strong> (recommended)
                    <span className="block text-forest/60">You set your weekly hours once. Booked times disappear automatically.</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 text-sm text-forest">
                  <input type="radio" name="hours" className="mt-1 accent-[var(--color-saffron)]" checked={!f.useHours} onChange={() => set("useHours", false)} />
                  <span>
                    Customers suggest a moment, I confirm it myself
                    <span className="block text-forest/60">No calendar on the website; you contact them to agree on a time.</span>
                  </span>
                </label>
              </div>
              {f.useHours && (
                <div className="rounded-2xl bg-cream p-4 sm:col-span-2">
                  <HoursEditor value={f.hours} onChange={(h) => set("hours", h)} durationMin={Number(f.durationMin) || 0} lastDate={f.date} />
                </div>
              )}
              <Label text="Bookable until" hint="No appointment can be booked after this date.">
                <input type="date" className={input} value={f.date} onChange={(e) => set("date", e.target.value)} />
              </Label>
            </>
          ) : (
            <>
              <Label text="Date">
                <input type="date" className={input} value={f.date} onChange={(e) => set("date", e.target.value)} />
              </Label>
              <Label text="Start time" hint="Belgian time">
                <input type="time" className={input} value={f.startTime} onChange={(e) => set("startTime", e.target.value)} />
              </Label>
              {!editing && (
                <Label text="Repeat every week" hint="0 = only this date." className="sm:col-span-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="number" min={0} max={52} inputMode="numeric" className={`${input} mt-0 max-w-[6rem]`} value={f.repeatWeeks} onChange={(e) => set("repeatWeeks", e.target.value)} />
                    <span className="text-sm text-forest/70">more weeks</span>
                    {[0, 3, 7, 11].map((n) => (
                      <button key={n} type="button" onClick={() => set("repeatWeeks", String(n))} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${repeat === n ? "border-saffron bg-saffron text-white" : "border-forest/20 text-forest"}`}>
                        {n === 0 ? "Once" : `${n + 1} weeks`}
                      </button>
                    ))}
                  </div>
                  <span className="mt-2 block text-sm text-forest/75">
                    {repeat > 0 ? `Creates ${repeat + 1} sessions, ${dayLabel(f.date)} → ${dayLabel(lastOfSeries)}, at ${f.startTime}.` : `One session on ${dayLabel(f.date)} at ${f.startTime}.`}
                  </span>
                </Label>
              )}
            </>
          )}
        </Section>

        <Section n={3} title="Where?">
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
          {!appt && (
            <div className="grid grid-cols-2 gap-4 sm:col-span-2">
              <Label text="Places">
                <input type="number" min={1} inputMode="numeric" className={input} value={f.capacity} onChange={(e) => set("capacity", e.target.value)} />
              </Label>
              <Label text="Max people per booking">
                <input type="number" min={1} inputMode="numeric" className={input} value={f.maxPerBooking} onChange={(e) => set("maxPerBooking", e.target.value)} />
              </Label>
            </div>
          )}
        </Section>

        <Section n={4} title="Text on the website">
          <Label text="Description (Dutch)" className="sm:col-span-2">
            <textarea className={`${input} min-h-[100px]`} value={f.descriptionNl} onChange={(e) => set("descriptionNl", e.target.value)} />
          </Label>
        </Section>

        <details className="rounded-2xl bg-white p-4 sm:col-span-2 sm:p-5">
          <summary className="cursor-pointer font-semibold text-ink">Photo</summary>
          <p className="mt-2 text-xs text-forest/50">Pick one of your photos, or upload a new one (an upload is used instead of the chosen photo).</p>
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
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => pickImage(e.target.files?.[0] ?? undefined)} />
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
        </details>

        <details className="rounded-2xl bg-white p-4 sm:col-span-2 sm:p-5">
          <summary className="cursor-pointer font-semibold text-ink">More options (English text, class cards, places)</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Label text="Title (English)" hint="Optional. If empty, the Dutch title is shown." className="sm:col-span-2">
              <input className={input} value={f.titleEn} onChange={(e) => set("titleEn", e.target.value)} placeholder="e.g. Kundalini Yoga & gong bath" />
            </Label>
            <Label text="Description (English)" hint="Optional." className="sm:col-span-2">
              <textarea className={`${input} min-h-[90px]`} value={f.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} />
            </Label>
            <Label text="Regular session" hint="Lets class cards and packages pay for it, and groups 60/90 min versions on the booking page." className="sm:col-span-2">
              <select className={input} value={f.offering} onChange={(e) => set("offering", e.target.value)}>
                <option value="">None (one-off session)</option>
                {Object.entries(OFFERING_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </Label>
            {appt && (
              <>
                <Label text="Places (total)" hint="Keep 999 for appointments: each time slot is for one booking anyway.">
                  <input type="number" min={1} inputMode="numeric" className={input} value={f.capacity} onChange={(e) => set("capacity", e.target.value)} />
                </Label>
                <Label text="Max people per booking" hint="1 for a private treatment">
                  <input type="number" min={1} inputMode="numeric" className={input} value={f.maxPerBooking} onChange={(e) => set("maxPerBooking", e.target.value)} />
                </Label>
              </>
            )}
          </div>
        </details>

        <div className="sm:col-span-2">
          <ErrorNote text={error} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-forest">
            <input type="checkbox" className="h-5 w-5 accent-[var(--color-saffron)]" checked={f.status === "published"} onChange={(e) => set("status", e.target.checked ? "published" : "draft")} />
            Visible and bookable on the website
          </label>
          <div className="flex gap-3">
            <Btn kind="ghost" onClick={onClose}>
              Cancel
            </Btn>
            <Btn type="submit" disabled={busy}>
              {busy ? "Saving…" : editing ? "Save changes" : repeat > 0 && !appt ? `Create ${repeat + 1} sessions` : "Create session"}
            </Btn>
          </div>
        </div>
      </form>
    </Modal>
  );
}
