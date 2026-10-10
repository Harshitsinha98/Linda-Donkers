import { z } from "zod";
import { abandonBooking, cancelBooking, customerView, getBooking, getBookingForCustomer, syncPending } from "../server/bookings.js";
import { clientIp, handler, HttpError, json, query, rateLimit, readBody, siteUrl } from "../server/http.js";
import { getSessionRow } from "../server/sessions.js";

async function view(id: string) {
  const b = (await getBooking(id))!;
  const s = await getSessionRow(b.session_id);
  if (!s) throw new HttpError(404, "not_found");
  return customerView(b, s);
}

/** GET /api/booking?ref=LD-XXXX&t=<token> -> booking status for the customer (checks Stripe if still pending). */
export const GET = handler(async (req) => {
  rateLimit(`booking:${clientIp(req)}`, 120, 10 * 60_000);
  const q = query(req);
  const b = await getBookingForCustomer(q.get("ref") ?? "", q.get("t") ?? "");
  await syncPending(b, siteUrl(req));
  return json({ ok: true, booking: await view(b.id) });
});

const body = z.object({
  ref: z.string().min(1).max(20),
  t: z.string().min(1).max(100),
  action: z.enum(["cancel", "abandon"]),
});

/** POST /api/booking { ref, t, action: "cancel" | "abandon" } */
export const POST = handler(async (req) => {
  rateLimit(`booking-post:${clientIp(req)}`, 20, 10 * 60_000);
  const input = await readBody(req, body);
  const b = await getBookingForCustomer(input.ref, input.t);
  const base = siteUrl(req);
  if (input.action === "abandon") {
    await abandonBooking(b, base);
  } else {
    await cancelBooking(b, { by: "customer", mode: "policy", base });
  }
  return json({ ok: true, booking: await view(b.id) });
});
