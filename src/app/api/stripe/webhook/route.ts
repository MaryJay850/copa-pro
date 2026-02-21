import { NextRequest, NextResponse } from "next/server";
import { handleStripeWebhook } from "@/lib/stripe-actions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    await handleStripeWebhook(body, signature);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[STRIPE WEBHOOK]", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
