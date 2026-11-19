/* Prototype only: shared header/footer, demo checkout and the booking calendar.
   Nothing here talks to a server. All availability is fake demo data. */

const WA = "32498142845";
const EMAIL = "info@lindadonkers.com";
const PHONE = "+32 498 14 28 45";
const wa = (text) => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
const euro = (n) => "€" + (Math.round(n * 100) / 100).toString().replace(".", ",");
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const NAV = [
  ["index.html", "Home"],
  ["massage.html", "Massages & prices"],
  ["healing.html", "Sat Nam Rasayan healing"],
  ["yoga.html", "Kundalini Yoga"],
  ["offers.html", "Offers & Christmas"],
  ["events.html", "Events"],
  ["travels.html", "Ayurveda travels & retreats"],
  ["about.html", "Who is Linda"],
  ["contact.html", "Location & contact"],
];

function chrome() {
  const here = location.pathname.split("/").pop() || "index.html";
  const onBooking = here === "booking.html";

  const header = document.createElement("div");
  header.innerHTML = `
    <div class="proto-bar">PROTOTYPE · demo only, nothing is booked or paid · <a href="notes.html">Open questions for Linda</a></div>
    <header class="top">
      <div class="wrap top-in">
        <a class="brand" href="index.html"><b>◇ Linda Donkers</b><small>Massage · Yoga · Ayurveda travel</small></a>
        <a class="btn btn-accent btn-sm hide-sm" href="booking.html?type=massage">Book a massage</a>
        <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu">Menu</button>
      </div>
      <nav class="menu" id="menu" hidden>
        <ul>${NAV.map(([href, label]) => `<li><a href="${href}"${href === here ? ' aria-current="page"' : ""}>${label}</a></li>`).join("")}</ul>
      </nav>
    </header>`;
  document.body.prepend(...header.children);

  const btn = $(".menu-btn");
  const menu = $("#menu");
  btn.addEventListener("click", () => {
    const open = menu.hidden;
    menu.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    btn.textContent = open ? "Close" : "Menu";
  });

  const footer = document.createElement("footer");
  footer.className = "foot";
  footer.innerHTML = `
    <div class="wrap grid grid-3">
      <div>
        <h3>Linda Donkers</h3>
        <p class="small">Holistic massages, Sat Nam Rasayan healing, Kundalini Yoga and Ayurveda travels to India.</p>
      </div>
      <div>
        <h3>Contact</h3>
        <ul class="small">
          <li><a href="${wa("Hello Linda, I have a question.")}">WhatsApp ${PHONE}</a></li>
          <li><a href="mailto:${EMAIL}">${EMAIL}</a></li>
          <li>Deurne, Antwerp (Belgium) · <span class="todo">full address</span></li>
        </ul>
      </div>
      <div>
        <h3>More</h3>
        <ul class="small">
          <li><a href="offers.html">Class cards, packages & gift cards</a></li>
          <li><a href="account.html">My account (only for card holders)</a></li>
          <li><a href="notes.html">Prototype notes</a></li>
        </ul>
      </div>
    </div>
    <div class="wrap bottom">Prototype v1 · ${new Date().getFullYear()} · Not the real website</div>`;
  document.body.append(footer);

  if (!onBooking) {
    const bar = document.createElement("div");
    bar.className = "actionbar";
    bar.innerHTML = `
      <a class="btn btn-accent" href="booking.html?type=massage">Book a massage</a>
      <a class="btn wa" href="${wa("Hello Linda, I have a question.")}" aria-label="WhatsApp Linda">WhatsApp</a>`;
    document.body.append(bar);
  }

  // Any link with data-wa gets a prefilled WhatsApp message.
  document.querySelectorAll("[data-wa]").forEach((a) => a.setAttribute("href", wa(a.dataset.wa)));
  document.querySelectorAll("[data-mail]").forEach((a) => a.setAttribute("href", `mailto:${EMAIL}?subject=${encodeURIComponent(a.dataset.mail)}`));
}

/* ---------- Demo checkout for packages, gift cards and Christmas offers ---------- */
function setupCheckout() {
  const triggers = document.querySelectorAll("[data-checkout]");
  if (!triggers.length) return;
  const dlg = document.createElement("dialog");
  document.body.append(dlg);

  triggers.forEach((t) =>
    t.addEventListener("click", () => {
      const [title, price] = t.dataset.checkout.split("|");
      dlg.innerHTML = `
        <form method="dialog" class="stack" id="dlg-form">
          <h3>${esc(title)}</h3>
          <p class="muted small">Demo checkout. In the real site this goes to a secure payment (Bancontact, card, Apple Pay).</p>
          <label class="field">Your name<input name="name" required autocomplete="name"></label>
          <label class="field">Email<input name="email" type="email" required autocomplete="email"></label>
          <p><b>Total: ${esc(price)}</b></p>
          <div class="btn-row">
            <button class="btn btn-accent" value="pay">Pay ${esc(price)}</button>
            <button class="btn" value="cancel" formnovalidate>Cancel</button>
          </div>
        </form>`;
      dlg.showModal();
      $("#dlg-form", dlg).addEventListener("submit", (e) => {
        if (e.submitter && e.submitter.value === "pay") {
          e.preventDefault();
          if (!e.target.reportValidity()) return;
          dlg.innerHTML = `<div class="done"><div class="big">✓</div><h3>Thank you! (demo)</h3>
            <p class="muted">You would now get an email with your card or voucher code.</p>
            <form method="dialog"><button class="btn btn-dark">Close</button></form></div>`;
        }
      });
    }),
  );
}

/* ---------- Booking ---------- */
const SERVICES = {
  massage: {
    label: "Massage",
    items: [
      { id: "lomi", name: "Lomi Lomi Nui", sub: "Hawaiian oil massage, heart-opening", opts: [[60, 100], [90, 140]] },
      { id: "mer", name: "M.E.R. Myo Fascia Energetic Release", sub: "Therapy massage for pain and posture", opts: [[60, 100], [90, 140]] },
      { id: "chinei", name: "Chi Nei Tsang", sub: "Taoist belly & organ massage", opts: [[60, 100], [90, 140]] },
    ],
    times: { 60: ["10:00", "11:30", "14:00", "15:30", "17:00"], 90: ["10:00", "13:30", "16:00"] },
    openDays: [2, 3, 4, 5, 6], // Tue–Sat
  },
  healing: {
    label: "Healing",
    items: [
      { id: "snr-live", name: "Sat Nam Rasayan healing, live", sub: "In Deurne", opts: [[40, 44]] },
      { id: "snr-online", name: "Sat Nam Rasayan healing, online", sub: "From home, by video call", opts: [[40, 44]] },
    ],
    times: { 40: ["10:00", "11:00", "14:00", "16:00", "19:00"] },
    openDays: [1, 2, 3, 4, 5, 6],
  },
  yoga: {
    label: "Yoga",
    items: [
      { id: "group", name: "Group class, Kundalini Yoga", sub: "Monday 19:30 · Wednesday 09:30 · Deurne", opts: [[90, 22]], days: { 1: ["19:30"], 3: ["09:30"] } },
      { id: "private", name: "Private session with coaching", sub: "Saturday 09:30 · Deurne", opts: [[90, 90]], days: { 6: ["09:30"] } },
      { id: "online", name: "Online group class (English)", sub: "Friday 08:00 · from home", opts: [[90, 15]], days: { 5: ["08:00"] } },
    ],
  },
};

// Deterministic fake "busy" data, so the same day always looks the same.
function rand(seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const fmtDay = (d) => d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
const fmtShort = (d) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

/** Free start times for one day (empty = full or closed). Returns null when Linda doesn't work that day. */
function freeTimes(type, item, minutes, date) {
  const s = SERVICES[type];
  const today = startOfDay(new Date());
  if (date < today) return null;
  let all;
  if (type === "yoga") {
    all = item.days[date.getDay()];
    if (!all) return null;
    // A class is sometimes full in the demo.
    return rand(ymd(date) + item.id) < 0.15 ? [] : all.slice();
  }
  if (!s.openDays.includes(date.getDay())) return null;
  all = s.times[minutes];
  const key = ymd(date) + type;
  if (rand(key + "full") < 0.3) return []; // fully booked day
  const free = all.filter((t) => rand(key + t + minutes) > 0.45);
  // Today: hide times that have already passed.
  if (ymd(date) === ymd(new Date())) {
    const now = new Date();
    return free.filter((t) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m > now.getHours() * 60 + now.getMinutes() + 120;
    });
  }
  return free;
}

function setupBooking() {
  const root = $("#booking");
  if (!root) return;
  const params = new URLSearchParams(location.search);
  const state = {
    type: SERVICES[params.get("type")] ? params.get("type") : "massage",
    itemId: params.get("item") || "",
    minutes: Number(params.get("min")) || 0,
    month: startOfDay(new Date()),
    day: null,
    time: "",
    code: null, // { label, off }
  };
  state.month.setDate(1);

  const item = () => SERVICES[state.type].items.find((i) => i.id === state.itemId) || SERVICES[state.type].items[0];
  const price = () => (item().opts.find(([m]) => m === state.minutes) || item().opts[0])[1];

  function normalise() {
    const it = item();
    state.itemId = it.id;
    if (!it.opts.some(([m]) => m === state.minutes)) state.minutes = it.opts[it.opts.length - 1][0];
  }

  function nextFree() {
    const d = startOfDay(new Date());
    for (let i = 0; i < 120; i++) {
      const t = freeTimes(state.type, item(), state.minutes, d);
      if (t && t.length) return { day: new Date(d), time: t[0] };
      d.setDate(d.getDate() + 1);
    }
    return null;
  }

  function pickFirstFree() {
    const n = nextFree();
    state.day = n ? n.day : null;
    state.time = "";
    if (n) state.month = new Date(n.day.getFullYear(), n.day.getMonth(), 1);
  }

  /* Step 1 */
  function renderChoose() {
    const s = SERVICES[state.type];
    $("#tabs").innerHTML = Object.entries(SERVICES)
      .map(([k, v]) => `<button type="button" role="tab" class="${k === "massage" ? "massage" : ""}" aria-selected="${k === state.type}" data-type="${k}">${v.label}</button>`)
      .join("");
    $("#items").innerHTML = s.items
      .map((it) => {
        const on = it.id === state.itemId;
        return `<div class="choice${on ? " on" : ""}" data-item="${it.id}" role="radio" aria-checked="${on}" tabindex="0">
          <div class="name">${esc(it.name)}</div>
          <div class="sub">${esc(it.sub)}</div>
          <div class="chips">${it.opts
            .map(([m, p]) => `<button type="button" class="chip${on && m === state.minutes ? " on" : ""}" data-item="${it.id}" data-min="${m}">${m} min · ${euro(p)}</button>`)
            .join("")}</div>
        </div>`;
      })
      .join("");
  }

  /* Step 2 */
  function renderCalendar() {
    const n = nextFree();
    $("#nextfree").innerHTML = n
      ? `<span>Next free time: ${fmtShort(n.day)} at ${n.time}</span><button type="button" class="btn btn-sm btn-dark" id="take-next">Take this time</button>`
      : `<span>No free time in the next months. Please <a href="${wa("Hello Linda, I would like to book " + item().name)}">send Linda a WhatsApp</a>.</span>`;

    const m = state.month;
    const first = new Date(m.getFullYear(), m.getMonth(), 1);
    const daysIn = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const offset = (first.getDay() + 6) % 7; // Monday first
    const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const maxMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 3, 1);

    $("#cal-title").textContent = m.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    $("#cal-prev").disabled = m <= thisMonth;
    $("#cal-next").disabled = m >= maxMonth;

    let html = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<div class="dow">${d}</div>`).join("");
    for (let i = 0; i < offset; i++) html += `<button class="blank" tabindex="-1" aria-hidden="true"></button>`;
    for (let d = 1; d <= daysIn; d++) {
      const date = new Date(m.getFullYear(), m.getMonth(), d);
      const t = freeTimes(state.type, item(), state.minutes, date);
      const sel = state.day && ymd(state.day) === ymd(date);
      if (t === null) {
        html += `<button type="button" class="closed" disabled aria-label="${fmtDay(date)}, not available">${d}</button>`;
      } else if (t.length === 0) {
        html += `<button type="button" class="full" disabled aria-label="${fmtDay(date)}, fully booked">${d}<small>full</small></button>`;
      } else {
        html += `<button type="button" class="free${sel ? " sel" : ""}" data-day="${ymd(date)}" aria-pressed="${!!sel}" aria-label="${fmtDay(date)}, ${t.length} free">${d}<small>${t.length} free</small></button>`;
      }
    }
    $("#cal").innerHTML = html;

    const times = state.day ? freeTimes(state.type, item(), state.minutes, state.day) || [] : [];
    $("#times-title").textContent = state.day ? `Free times on ${fmtDay(state.day)}` : "Tap a green day to see the free times";
    $("#times").innerHTML = times
      .map((t) => `<button type="button" class="${t === state.time ? "on" : ""}" data-time="${t}" aria-pressed="${t === state.time}">${t}</button>`)
      .join("");
  }

  /* Summary + step 3 */
  function renderSummary() {
    const it = item();
    const gross = price();
    const off = state.code ? Math.min(gross, state.code.off(gross)) : 0;
    const total = gross - off;
    const when = state.day && state.time ? `${fmtDay(state.day)} at ${state.time}` : "Choose a day and time";
    $("#summary-body").innerHTML = `
      <dl>
        <div class="line"><dt>What</dt><dd>${esc(it.name)}</dd></div>
        <div class="line"><dt>Duration</dt><dd>${state.minutes} min</dd></div>
        <div class="line"><dt>When</dt><dd>${esc(when)}</dd></div>
        <div class="line"><dt>Where</dt><dd>${it.id.includes("online") ? "Online (link by email)" : "Deurne, Antwerp"}</dd></div>
        <div class="line"><dt>Price</dt><dd>${euro(gross)}</dd></div>
        ${off ? `<div class="line"><dt>${esc(state.code.label)}</dt><dd>−${euro(off)}</dd></div>` : ""}
        <div class="line total"><dt>Total</dt><dd>${euro(total)}</dd></div>
      </dl>`;
    const ready = !!(state.day && state.time);
    $("#pay").disabled = !ready;
    $("#pay").textContent = ready ? `Pay ${euro(total)}` : "Choose a time first";
    $("#details").style.opacity = ready ? "1" : ".5";
  }

  function renderAll() {
    normalise();
    renderChoose();
    renderCalendar();
    renderSummary();
    const url = new URL(location.href);
    url.searchParams.set("type", state.type);
    url.searchParams.set("item", state.itemId);
    url.searchParams.set("min", String(state.minutes));
    history.replaceState(null, "", url);
  }

  function changeService() {
    normalise();
    pickFirstFree();
    renderAll();
  }

  root.addEventListener("click", (e) => {
    const el = e.target.closest("button, .choice");
    if (!el) return;
    if (el.dataset.type) {
      state.type = el.dataset.type;
      state.itemId = "";
      state.minutes = 0;
      return changeService();
    }
    if (el.dataset.min) {
      state.itemId = el.dataset.item;
      state.minutes = Number(el.dataset.min);
      return changeService();
    }
    if (el.classList.contains("choice") && el.dataset.item !== state.itemId) {
      state.itemId = el.dataset.item;
      state.minutes = 0;
      return changeService();
    }
    if (el.id === "take-next") {
      const n = nextFree();
      if (!n) return;
      state.day = n.day;
      state.time = n.time;
      state.month = new Date(n.day.getFullYear(), n.day.getMonth(), 1);
      renderAll();
      $("#details").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (el.id === "cal-prev" || el.id === "cal-next") {
      state.month = new Date(state.month.getFullYear(), state.month.getMonth() + (el.id === "cal-next" ? 1 : -1), 1);
      return renderCalendar();
    }
    if (el.dataset.day) {
      const [y, mo, d] = el.dataset.day.split("-").map(Number);
      state.day = new Date(y, mo - 1, d);
      state.time = "";
      renderCalendar();
      renderSummary();
      $("#times-wrap").scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    if (el.dataset.time) {
      state.time = el.dataset.time;
      renderCalendar();
      renderSummary();
      return;
    }
    if (el.id === "code-toggle") {
      $("#code-area").hidden = !$("#code-area").hidden;
      return;
    }
    if (el.id === "code-apply") {
      const raw = $("#code").value.trim().toUpperCase();
      const msg = $("#code-msg");
      if (raw === "XMAS26") {
        state.code = { label: "Christmas code", off: (g) => Math.round(g * 0.1) };
        msg.className = "msg ok";
        msg.textContent = "Christmas code applied: 10% off.";
      } else if (raw.startsWith("GIFT")) {
        state.code = { label: "Gift card", off: () => 50 };
        msg.className = "msg ok";
        msg.textContent = "Gift card found: €50 balance used.";
      } else {
        state.code = null;
        msg.className = "msg err";
        msg.textContent = "Code not found. (Demo: try XMAS26 or GIFT50)";
      }
      renderSummary();
    }
  });

  root.addEventListener("keydown", (e) => {
    const c = e.target.closest(".choice");
    if (c && (e.key === "Enter" || e.key === " ") && e.target === c) {
      e.preventDefault();
      c.click();
    }
  });

  $("#book-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!(state.day && state.time)) return;
    if (!e.target.reportValidity()) return;
    const name = $("#f-name").value.trim();
    $("#booking").innerHTML = `
      <div class="card done">
        <div class="big">✓</div>
        <h2>Thank you, ${esc(name.split(" ")[0])}! (demo)</h2>
        <p class="lead" style="margin:0 auto 1em">${esc(item().name)}, ${state.minutes} min<br>${esc(fmtDay(state.day))} at ${esc(state.time)}</p>
        <p class="muted">In the real site you would now pay securely and get a confirmation email with a button to add it to your calendar, and a link to change or cancel.</p>
        <div class="btn-row" style="justify-content:center">
          <a class="btn btn-dark" href="index.html">Back to home</a>
          <a class="btn" href="booking.html">Book another</a>
        </div>
      </div>`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  normalise();
  pickFirstFree();
  renderAll();
}

chrome();
setupCheckout();
setupBooking();
