"use server";

import { getStripe, STRIPE_PRICES } from "./stripe";
import { prisma } from "./db";
import { requireAuth } from "./auth-guards";
import type { SubscriptionPlan } from "../../generated/prisma/enums";

/**
 * Create a Stripe Checkout session for plan upgrade.
 */
export async function createCheckoutSession(
  plan: "PRO" | "CLUB",
  interval: "month" | "year"
): Promise<string> {
  const user = await requireAuth();
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  // Get or create Stripe customer
  let dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { stripeCustomerId: true, email: true, plan: true },
  });
  if (!dbUser) throw new Error("Utilizador não encontrado.");

  let customerId = dbUser.stripeCustomerId;
  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: dbUser.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  // Resolve price ID
  const priceKey = `${plan}_${interval === "month" ? "MONTHLY" : "YEARLY"}` as keyof typeof STRIPE_PRICES;
  const priceId = STRIPE_PRICES[priceKey];
  if (!priceId) {
    throw new Error(`Preço Stripe não configurado para ${plan} ${interval}. Configure STRIPE_PRICE_${priceKey} no .env`);
  }

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/planos?success=true`,
    cancel_url: `${appUrl}/planos?cancelled=true`,
    metadata: { userId: user.id, plan },
    subscription_data: {
      metadata: { userId: user.id, plan },
    },
  });

  return session.url!;
}

/**
 * Create a Stripe billing portal session for subscription management.
 */
export async function createBillingPortalSession(): Promise<string> {
  const user = await requireAuth();
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { stripeCustomerId: true },
  });

  if (!dbUser?.stripeCustomerId) {
    throw new Error("Sem subscrição ativa. Não é possível aceder ao portal.");
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: dbUser.stripeCustomerId,
    return_url: `${appUrl}/planos`,
  });

  return session.url;
}

/**
 * Handle Stripe webhook events.
 */
export async function handleStripeWebhook(body: string, signature: string): Promise<void> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET não definido.");

  const event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan as SubscriptionPlan | undefined;
      const subscriptionId = session.subscription as string;

      if (userId && plan) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan,
            stripeSubscriptionId: subscriptionId,
            planExpiresAt: null, // managed by subscription
          },
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const userId = subscription.metadata?.userId;

      if (userId) {
        const isActive = ["active", "trialing"].includes(subscription.status);
        if (!isActive) {
          await prisma.user.update({
            where: { id: userId },
            data: { plan: "FREE", planExpiresAt: null, stripeSubscriptionId: null },
          });
        } else {
          // Update expiry from current period end
          const periodEnd = new Date((subscription as any).current_period_end * 1000);
          await prisma.user.update({
            where: { id: userId },
            data: { planExpiresAt: periodEnd },
          });
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const userId = subscription.metadata?.userId;

      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { plan: "FREE", planExpiresAt: null, stripeSubscriptionId: null },
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const customerId = invoice.customer as string;

      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: customerId },
      });
      if (user) {
        // Could send notification about failed payment
        console.warn(`[STRIPE] Payment failed for user ${user.id} (${user.email})`);
      }
      break;
    }
  }
}

/**
 * Admin: manually set a user's plan (override).
 */
export async function adminSetUserPlan(
  userId: string,
  plan: SubscriptionPlan,
  expiresAt?: Date | null
): Promise<void> {
  // Import requireAdmin inline to avoid circular
  const { requireAdmin } = await import("./auth-guards");
  await requireAdmin();

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan,
      planExpiresAt: expiresAt ?? null,
    },
  });

  // Log audit
  try {
    const { logAudit } = await import("./actions/audit-actions");
    await logAudit("UPDATE_PLAN", "User", userId, `Plano alterado para ${plan}`);
  } catch { /* ignore if logAudit doesn't exist yet */ }
}
