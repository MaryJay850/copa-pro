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

// Legacy fallback — reads from env vars (used only if DB has no prices)
export function getStripePricesFromEnv() {
  return {
    PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
    PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY ?? "",
    CLUB_MONTHLY: process.env.STRIPE_PRICE_CLUB_MONTHLY ?? "",
    CLUB_YEARLY: process.env.STRIPE_PRICE_CLUB_YEARLY ?? "",
  };
}
