import Stripe from "stripe";
import { HttpError } from "./http.js";

let instance: Stripe | null = null;

export const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new HttpError(503, "payments_unavailable", "STRIPE_SECRET_KEY is not set.");
  instance ??= new Stripe(key);
  return instance;
}

export { Stripe };

/**
 * Creates a Checkout Session with Adaptive Pricing (visitors pay in their own currency,
 * Linda receives EUR), falling back to EUR-only if the account doesn't support it.
 */
export async function createCheckoutSession(params: Stripe.Checkout.SessionCreateParams, idempotencyKey: string) {
  try {
    return await stripe().checkout.sessions.create({ ...params, adaptive_pricing: { enabled: true } }, { idempotencyKey });
  } catch (err) {
    if (!(err instanceof Stripe.errors.StripeInvalidRequestError) || !/adaptive/i.test(err.message)) throw err;
    console.warn("[stripe] Adaptive Pricing unavailable for this account, continuing in EUR only:", err.message);
    return stripe().checkout.sessions.create(params, { idempotencyKey: `${idempotencyKey}-eur` });
  }
}
