import { z } from "zod";
import {
  adminView,
  cancelBooking,
  createManualBooking,
  getBooking,
  manualInput,
  type BookingRow,
} from "../../server/bookings.js";
import { all } from "../../server/db.js";
import { sendBookingConfirmed } from "../../server/email.js";
import { handler, HttpError, json, query, readBody, requireAdmin, siteUrl } from "../../server/http.js";
import { getSessionRow, type SessionRow } from "../../server/sessions.js";
import { formatWhen } from "../../server/time.js";

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** GET /api/admin/bookings?sessionId=<id>  (or no sessionId for the latest 300). Add &format=csv for a spreadsheet. */
export const GET = handler(async (req) => {
  requireAdmin(req);
  const q = query(req);
  const sessionId = q.get("sessionId");
  const rows = await all<BookingRow & { title_nl: string; starts_at: string }>(
    `SELECT b.*, s.title_nl, s.starts_at FROM bookings b JOIN sessions s ON s.id = b.session_id
     ${sessionId ? "WHERE b.session_id = ?" : "WHERE b.status <> 'expired'"}
     ORDER BY b.created_at DESC LIMIT 300`,
    sessionId ? [sessionId] : [],
  );

  if (q.get("format") === "csv") {
    const header = ["Reference", "Status", "Session", "When", "Name", "Email", "Phone", "People", "Amount (EUR)", "Refunded (EUR)", "Source", "Message", "Booked at"];
    const lines = rows.map((r) =>
      [
        r.ref, r.status, r.title_nl, formatWhen(r.starts_at, "en"), r.name, r.email, r.phone, r.seats,
        (r.amount_cents / 100).toFixed(2), (r.refunded_cents / 100).toFixed(2), r.source, r.note, r.created_at,
      ].map(csvCell).join(","),
    );
    return new Response("\uFEFF" + [header.join(","), ...lines].join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bookings${sessionId ? "-" + sessionId : ""}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return json({
    ok: true,
    bookings: rows.map((r) => ({ ...adminView(r), sessionTitle: r.title_nl, sessionStartsAt: r.starts_at })),
  });
});

const postBody = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel"), id: z.string().min(1), refund: z.enum(["policy", "full", "none"]) }),
  z.object({ action: z.literal("resend"), id: z.string().min(1) }),
  z.object({ action: z.literal("manual"), booking: manualInput }),
]);

/** POST /api/admin/bookings { action: cancel | resend | manual } */
export const POST = handler(async (req) => {
  requireAdmin(req);
  const body = await readBody(req, postBody);
  const base = siteUrl(req);
  if (body.action === "manual") return json({ ok: true, ...(await createManualBooking(body.booking, base)) });

  const b = await getBooking(body.id);
  if (!b) throw new HttpError(404, "not_found");
  if (body.action === "cancel") {
    return json({ ok: true, ...(await cancelBooking(b, { by: "admin", mode: body.refund, base })) });
  }
  if (b.status !== "confirmed" || !b.email) throw new HttpError(409, "not_confirmed", "Only confirmed bookings with an email address.");
  const s = (await getSessionRow(b.session_id)) as SessionRow;
  await sendBookingConfirmed(b, s, base, { notifyAdmin: false });
  return json({ ok: true });
});
