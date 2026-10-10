/**
 * Transactional email through Resend (https://resend.com), for both the customer and Linda.
 * Email never blocks a booking: if Resend is not configured or fails, it is logged and skipped.
 */
import type { BookingRow } from "./bookings.js";
import type { SessionRow } from "./sessions.js";
import { formatEuro, formatWhen } from "./time.js";

const WHATSAPP = () => process.env.LINDA_WHATSAPP || "32498142845";
const ADMIN_EMAIL = () => process.env.ADMIN_EMAIL || "info@lindadonkers.com";
const FROM = () => process.env.EMAIL_FROM || "Linda Donkers <onboarding@resend.dev>";

async function send(to: string, subject: string, html: string, replyTo?: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email] RESEND_API_KEY not set, skipped: "${subject}" -> ${to}`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM(), to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    if (!res.ok) console.error(`[email] Resend ${res.status}: ${await res.text()}`);
    return res.ok;
  } catch (err) {
    console.error("[email] failed", err);
    return false;
  }
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const nl2br = (s: string) => esc(s).replace(/\n/g, "<br>");

function layout(body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4eee3;font-family:Helvetica,Arial,sans-serif;color:#2e3a2f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4eee3;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#faf7f1;border-radius:18px;padding:36px 28px">
<tr><td>
<p style="margin:0 0 24px;font-family:Georgia,serif;font-size:22px;color:#1d241e">Linda Donkers</p>
${body}
<p style="margin:32px 0 0;font-size:12px;color:#8e9f84">Diamond Yoga · 2LovingHands · Deurne, Antwerpen</p>
</td></tr></table></td></tr></table></body></html>`;
}

const button = (href: string, label: string, color = "#e8762b") =>
  `<a href="${esc(href)}" style="display:inline-block;margin:6px 8px 6px 0;padding:13px 22px;border-radius:999px;background:${color};color:#faf7f1;text-decoration:none;font-weight:bold;font-size:14px">${esc(label)}</a>`;

function rows(items: [string, string][]): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:20px 0;border-top:1px solid #e7ddcb">
${items
  .map(
    ([k, v]) =>
      `<tr><td style="padding:10px 12px 10px 0;border-bottom:1px solid #e7ddcb;font-size:13px;color:#8e9f84;vertical-align:top;width:38%">${esc(k)}</td><td style="padding:10px 0;border-bottom:1px solid #e7ddcb;font-size:15px;color:#1d241e">${v}</td></tr>`,
  )
  .join("")}
</table>`;
}

const titleOf = (s: SessionRow, lang: string) => (lang === "en" && s.title_en ? s.title_en : s.title_nl);
const place = (s: SessionRow) => (s.is_online ? "Online" : [s.venue, s.address].filter(Boolean).join(", ") || "-");
const manageUrl = (base: string, b: BookingRow) => `${base}/boeking/${b.ref}?t=${b.token}`;
const waTo = (digits: string, text: string) => `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
const phoneDigits = (p: string) => p.replace(/[^\d]/g, "").replace(/^00/, "");

const copy = {
  nl: {
    confirmedSubject: (t: string) => `Je boeking is bevestigd: ${t}`,
    hi: (n: string) => `Hallo ${n},`,
    confirmedIntro: "Fijn dat je erbij bent! Je plek is gereserveerd. Hieronder vind je alle details.",
    session: "Sessie",
    when: "Wanneer",
    where: "Waar",
    duration: "Duur",
    seats: "Personen",
    paid: "Betaald",
    ref: "Referentie",
    link: "Online link",
    linkLater: "Linda stuurt je de link voor de sessie.",
    manage: "Bekijk of annuleer je boeking",
    whatsapp: "Stuur Linda een WhatsApp",
    waText: (r: string) => `Hallo Linda, ik heb geboekt via je website (referentie ${r}).`,
    policyTitle: "Annuleringsvoorwaarden",
    policy: "Tot 48 uur vooraf: volledige terugbetaling. Tussen 48 en 24 uur vooraf: 50%. Minder dan 24 uur vooraf: geen terugbetaling.",
    bye: "Warme groet,<br>Linda",
    cancelledSubject: (t: string) => `Je boeking is geannuleerd: ${t}`,
    cancelledIntro: "Je boeking is geannuleerd.",
    sessionCancelledIntro: "Helaas moet Linda deze sessie annuleren. Het spijt haar heel erg.",
    refund: (a: string) => `${a} wordt teruggestort op je betaalmethode. Dit kan 5 tot 10 werkdagen duren.`,
    noRefund: "Volgens de annuleringsvoorwaarden is er geen terugbetaling.",
    min: "min",
    timezone: "Belgische tijd",
  },
  en: {
    confirmedSubject: (t: string) => `Your booking is confirmed: ${t}`,
    hi: (n: string) => `Hello ${n},`,
    confirmedIntro: "Lovely that you're joining! Your place is reserved. You'll find all the details below.",
    session: "Session",
    when: "When",
    where: "Where",
    duration: "Duration",
    seats: "People",
    paid: "Paid",
    ref: "Reference",
    link: "Online link",
    linkLater: "Linda will send you the link for the session.",
    manage: "View or cancel your booking",
    whatsapp: "Send Linda a WhatsApp",
    waText: (r: string) => `Hello Linda, I booked through your website (reference ${r}).`,
    policyTitle: "Cancellation policy",
    policy: "Up to 48 hours before: full refund. Between 48 and 24 hours before: 50%. Less than 24 hours before: no refund.",
    bye: "Warm regards,<br>Linda",
    cancelledSubject: (t: string) => `Your booking has been cancelled: ${t}`,
    cancelledIntro: "Your booking has been cancelled.",
    sessionCancelledIntro: "Unfortunately Linda has to cancel this session. She is very sorry.",
    refund: (a: string) => `${a} will be refunded to your payment method. This can take 5 to 10 business days.`,
    noRefund: "According to the cancellation policy there is no refund.",
    min: "min",
    timezone: "Belgian time",
  },
};

const L = (lang: string) => (lang === "en" ? copy.en : copy.nl);

/* ---------------- confirmations ---------------- */

export async function sendBookingConfirmed(
  b: BookingRow,
  s: SessionRow,
  base: string,
  { overbooked = false, notifyAdmin = true }: { overbooked?: boolean; notifyAdmin?: boolean } = {},
) {
  const c = L(b.lang);
  const title = titleOf(s, b.lang);
  const details: [string, string][] = [
    [c.session, esc(title)],
    [c.when, `${esc(formatWhen(s.starts_at, b.lang))} <span style="color:#8e9f84">(${c.timezone})</span>`],
    [c.duration, `${s.duration_min} ${c.min}`],
    [c.where, esc(place(s))],
    [c.seats, String(b.seats)],
  ];
  if (b.amount_cents > 0) details.push([c.paid, esc(formatEuro(b.amount_cents, b.lang))]);
  if (s.is_online) {
    details.push([c.link, s.online_link ? `<a href="${esc(s.online_link)}" style="color:#e8762b">${esc(s.online_link)}</a>` : esc(c.linkLater)]);
  }
  details.push([c.ref, `<strong>${esc(b.ref)}</strong>`]);

  const customer = layout(`
<p style="font-size:16px;margin:0 0 12px">${esc(c.hi(b.name))}</p>
<p style="font-size:15px;line-height:1.6;margin:0">${c.confirmedIntro}</p>
${rows(details)}
${button(manageUrl(base, b), c.manage, "#2e3a2f")}
${button(waTo(WHATSAPP(), c.waText(b.ref)), c.whatsapp, "#25a244")}
<p style="margin:26px 0 6px;font-size:13px;font-weight:bold">${c.policyTitle}</p>
<p style="margin:0;font-size:13px;line-height:1.6;color:#2e3a2f">${c.policy}</p>
<p style="margin:26px 0 0;font-size:15px;line-height:1.6">${c.bye}</p>`);

  const adminDetails: [string, string][] = [
    ["Session", esc(s.title_nl)],
    ["When", esc(formatWhen(s.starts_at, "en"))],
    ["Name", esc(b.name)],
    ["Email", `<a href="mailto:${esc(b.email)}">${esc(b.email)}</a>`],
    ["Phone", esc(b.phone || "-")],
    ["People", String(b.seats)],
    ["Paid", b.source === "manual" ? "Added manually" : esc(formatEuro(b.amount_cents, "en"))],
    ["Reference", esc(b.ref)],
  ];
  if (b.note) adminDetails.push(["Message", nl2br(b.note)]);
  const digits = phoneDigits(b.phone);
  const admin = layout(`
<p style="font-size:18px;margin:0 0 6px;font-family:Georgia,serif">New booking 🌿</p>
${overbooked ? `<p style="padding:12px;border-radius:10px;background:#fde7d6;color:#9a3d06;font-size:14px">Heads-up: this payment came in after the places had been released, so the session is now over capacity. Please check the admin panel.</p>` : ""}
${rows(adminDetails)}
${digits ? button(waTo(digits, b.lang === "en" ? `Hello ${b.name}, thank you for booking "${title}"!` : `Hallo ${b.name}, bedankt voor je boeking van "${title}"!`), `WhatsApp ${b.name}`, "#25a244") : ""}
${button(`${base}/admin`, "Open admin panel", "#2e3a2f")}`);

  const tasks: Promise<boolean>[] = [];
  if (b.email) tasks.push(send(b.email, c.confirmedSubject(title), customer, ADMIN_EMAIL()));
  if (notifyAdmin) {
    tasks.push(send(ADMIN_EMAIL(), `New booking: ${b.name} · ${s.title_nl} · ${formatWhen(s.starts_at, "en")}`, admin, b.email || undefined));
  }
  await Promise.all(tasks);
}

/* ---------------- cancellations ---------------- */

export async function sendBookingCancelled(
  b: BookingRow,
  s: SessionRow,
  refundCents: number,
  by: "customer" | "admin",
  sessionCancelled: boolean,
  base: string,
) {
  const c = L(b.lang);
  const title = titleOf(s, b.lang);
  const refundLine = refundCents > 0 ? c.refund(formatEuro(refundCents, b.lang)) : b.amount_cents > 0 ? c.noRefund : "";
  const customer = layout(`
<p style="font-size:16px;margin:0 0 12px">${esc(c.hi(b.name))}</p>
<p style="font-size:15px;line-height:1.6;margin:0">${sessionCancelled ? c.sessionCancelledIntro : c.cancelledIntro}</p>
${rows([
  [c.session, esc(title)],
  [c.when, esc(formatWhen(s.starts_at, b.lang))],
  [c.ref, esc(b.ref)],
])}
${refundLine ? `<p style="font-size:15px;line-height:1.6">${refundLine}</p>` : ""}
${button(waTo(WHATSAPP(), c.waText(b.ref)), c.whatsapp, "#25a244")}
<p style="margin:26px 0 0;font-size:15px;line-height:1.6">${c.bye}</p>`);

  const tasks: Promise<boolean>[] = [];
  if (b.email) tasks.push(send(b.email, c.cancelledSubject(title), customer, ADMIN_EMAIL()));
  if (by === "customer") {
    const admin = layout(`
<p style="font-size:18px;margin:0 0 6px;font-family:Georgia,serif">Booking cancelled by the customer</p>
${rows([
  ["Session", esc(s.title_nl)],
  ["When", esc(formatWhen(s.starts_at, "en"))],
  ["Name", esc(b.name)],
  ["Email", esc(b.email)],
  ["Phone", esc(b.phone || "-")],
  ["People", String(b.seats)],
  ["Refunded", esc(formatEuro(refundCents, "en"))],
  ["Reference", esc(b.ref)],
])}
${button(`${base}/admin`, "Open admin panel", "#2e3a2f")}`);
    tasks.push(send(ADMIN_EMAIL(), `Cancelled: ${b.name} · ${s.title_nl}`, admin, b.email));
  }
  await Promise.all(tasks);
}
