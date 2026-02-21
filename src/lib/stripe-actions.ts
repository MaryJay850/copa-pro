"use server";

import { getStripe, getStripePrices } from "./stripe";
import { prisma } from "./db";
import { requireAuth } from "./auth-guards";
import type { SubscriptionPlan } from "../../generated/prisma/enums";

// ── Types ──

export type SubscriptionInfo = {
  plan: SubscriptionPlan;
  interval: "month" | "year" | null;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasActiveSubscription: boolean;
};

/**
 * Get the user's current subscription info from Stripe.
 */
export async function getSubscriptionInfo(): Promise<SubscriptionInfo> {
  const user = await requireAuth();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { plan: true, stripeSubscriptionId: true, stripeCustomerId: true },
  });

  const base: SubscriptionInfo = {
    plan: dbUser?.plan ?? "FREE",
    interval: null,
    status: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    hasActiveSubscription: false,
  };

  if (!dbUser?.stripeSubscriptionId) return base;

  try {
    const sub = await getStripe().subscriptions.retrieve(dbUser.stripeSubscriptionId) as any;
    const isActive = ["active", "trialing"].includes(sub.status);
    const periodEnd = sub.current_period_end as number | undefined;
    return {
      ...base,
      interval: (sub.items?.data?.[0]?.price?.recurring?.interval as "month" | "year") ?? null,
      status: sub.status,
      currentPeriodEnd: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      cancelAtPeriodEnd: !!sub.cancel_at_period_end,
      hasActiveSubscription: isActive,
    };
  } catch (err) {
    console.error("[STRIPE] Erro ao obter subscrição:", err);
    return base;
  }
}

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
    select: { stripeCustomerId: true, email: true, plan: true, stripeSubscriptionId: true },
  });
  if (!dbUser) throw new Error("Utilizador não encontrado.");

  // If user has an active subscription, cancel it first (Stripe doesn't allow multiple subscriptions easily)
  if (dbUser.stripeSubscriptionId) {
    try {
      await getStripe().subscriptions.cancel(dbUser.stripeSubscriptionId);
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeSubscriptionId: null },
      });
    } catch (err) {
      console.warn("[STRIPE] Erro ao cancelar subscrição anterior:", err);
    }
  }

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
  const prices = getStripePrices();
  const priceKey = `${plan}_${interval === "month" ? "MONTHLY" : "YEARLY"}` as keyof ReturnType<typeof getStripePrices>;
  const priceId = prices[priceKey];
  if (!priceId) {
    console.error(`[STRIPE] Preço não configurado: STRIPE_PRICE_${priceKey}`);
    throw new Error("Erro ao processar o plano. Por favor contacte o suporte.");
  }

  console.log(`[STRIPE CHECKOUT] plan=${plan}, interval=${interval}, priceKey=${priceKey}, priceId=${priceId}`);

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
 * Sync the user's plan from Stripe — fallback when webhook doesn't fire.
 * Called when user returns from checkout with ?success=true.
 */
export async function syncPlanFromStripe(): Promise<SubscriptionPlan> {
  const user = await requireAuth();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { stripeCustomerId: true, plan: true, stripeSubscriptionId: true },
  });

  if (!dbUser?.stripeCustomerId) return dbUser?.plan ?? "FREE";

  try {
    const stripe = getStripe();

    // List active subscriptions for this customer
    const subs = await stripe.subscriptions.list({
      customer: dbUser.stripeCustomerId,
      status: "active",
      limit: 5,
    });

    if (subs.data.length === 0) {
      // No active subscriptions — set FREE
      if (dbUser.plan !== "FREE") {
        await prisma.user.update({
          where: { id: user.id },
          data: { plan: "FREE", stripeSubscriptionId: null, planExpiresAt: null },
        });
      }
      return "FREE";
    }

    // Take the most recent active subscription
    const sub = subs.data[0] as any;
    const plan = (sub.metadata?.plan as SubscriptionPlan) ?? dbUser.plan;
    const periodEnd = new Date((sub.current_period_end as number) * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan,
        stripeSubscriptionId: sub.id,
        planExpiresAt: periodEnd,
      },
    });

    console.log(`[STRIPE SYNC] user=${user.id}, plan=${plan}, subId=${sub.id}`);
    return plan;
  } catch (err) {
    console.error("[STRIPE SYNC] Erro:", err);
    return dbUser.plan;
  }
}

/**
 * Cancel the user's Stripe subscription (downgrade to FREE).
 * Cancels immediately.
 */
export async function cancelSubscription(): Promise<void> {
  const user = await requireAuth();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { stripeSubscriptionId: true },
  });

  if (!dbUser?.stripeSubscriptionId) {
    throw new Error("Sem subscrição ativa para cancelar.");
  }

  try {
    await getStripe().subscriptions.cancel(dbUser.stripeSubscriptionId);
    await prisma.user.update({
      where: { id: user.id },
      data: { plan: "FREE", stripeSubscriptionId: null, planExpiresAt: null },
    });

    // Log audit
    try {
      const { logAudit } = await import("./actions/audit-actions");
      await logAudit("CANCEL_SUBSCRIPTION", "User", user.id, "Subscrição cancelada pelo utilizador");
    } catch { /* ignore */ }
  } catch (err) {
    console.error("[STRIPE] Erro ao cancelar subscrição:", err);
    throw new Error("Erro ao cancelar subscrição. Tente novamente ou contacte o suporte.");
  }
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
