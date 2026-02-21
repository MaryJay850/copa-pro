import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY não definida nas variáveis de ambiente.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-01-28.clover",
  typescript: true,
});

// Price IDs — set these in .env after creating products in Stripe Dashboard
export const STRIPE_PRICES = {
  PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
  PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY ?? "",
  CLUB_MONTHLY: process.env.STRIPE_PRICE_CLUB_MONTHLY ?? "",
  CLUB_YEARLY: process.env.STRIPE_PRICE_CLUB_YEARLY ?? "",
};
