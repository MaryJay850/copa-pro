import Stripe from "stripe";

// Lazy init — avoids crash at build time when env vars are not yet available
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY não definida nas variáveis de ambiente.");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-01-28.clover",
      typescript: true,
    });
  }
  return _stripe;
}

// Backward compat — will throw if used at build time, OK at runtime
export const stripe = typeof process !== "undefined" && process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-01-28.clover", typescript: true })
  : (null as unknown as Stripe);

// Price IDs — set these in .env after creating products in Stripe Dashboard
export const STRIPE_PRICES = {
  PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
  PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY ?? "",
  CLUB_MONTHLY: process.env.STRIPE_PRICE_CLUB_MONTHLY ?? "",
  CLUB_YEARLY: process.env.STRIPE_PRICE_CLUB_YEARLY ?? "",
};
