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
