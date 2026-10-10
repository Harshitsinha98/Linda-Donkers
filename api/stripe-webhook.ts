import { applyCheckoutSession } from "../server/bookings.js";
import { json, siteUrl } from "../server/http.js";
import { stripe, type Stripe } from "../server/stripe.js";

/**
 * POST /api/stripe-webhook
 * In Stripe: Developers -> Webhooks -> add endpoint https://<domain>/api/stripe-webhook with events
 * checkout.session.completed, checkout.session.async_payment_succeeded,
 * checkout.session.async_payment_failed, checkout.session.expired.
 */
export async function POST(req: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return json({ ok: false, error: "webhook_not_configured" }, 503);

  const payload = await req.text(); // raw body is required for signature verification
  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(payload, req.headers.get("stripe-signature") ?? "", secret);
  } catch (err) {
    console.warn("[webhook] bad signature", (err as Error).message);
    return json({ ok: false, error: "bad_signature" }, 400);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
      case "checkout.session.expired":
        await applyCheckoutSession(event.data.object, siteUrl(req));
        break;
      case "checkout.session.async_payment_failed":
        await applyCheckoutSession({ ...event.data.object, status: "expired" }, siteUrl(req));
        break;
    }
  } catch (err) {
    console.error("[webhook] handling failed", event.type, err);
    return json({ ok: false }, 500); // Stripe retries
  }
  return json({ ok: true });
}
