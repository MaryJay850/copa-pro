import { NextResponse } from "next/server";
import { getStripe, getStripePrices } from "@/lib/stripe";

/**
 * DEBUG ONLY — remove after verifying prices.
 * GET /api/stripe/debug-prices
 * Returns the product name + amount for each configured price ID.
 */
export async function GET() {
  try {
    const stripe = getStripe();
    const prices = getStripePrices();

    const results: Record<string, unknown> = {};

    for (const [key, priceId] of Object.entries(prices)) {
      if (!priceId) {
        results[key] = { error: "Não configurado" };
        continue;
      }
      try {
        const price = await stripe.prices.retrieve(priceId, {
          expand: ["product"],
        });
        const product = price.product as { name?: string; id: string };
        results[key] = {
          priceId,
          productId: product.id,
          productName: product.name ?? "N/A",
          amount: price.unit_amount ? price.unit_amount / 100 : null,
          currency: price.currency,
          interval: price.recurring?.interval ?? "one_time",
        };
      } catch (err) {
        results[key] = { priceId, error: String(err) };
      }
    }

    return NextResponse.json(results, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
