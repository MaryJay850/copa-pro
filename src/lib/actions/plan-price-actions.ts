"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";
import { logAudit } from "./audit-actions";
import type { SubscriptionPlan } from "../../../generated/prisma/enums";

// ── Types ──

export type PlanPriceRow = {
  id: string;
  plan: SubscriptionPlan;
  interval: string;
  amount: number;
  currency: string;
  stripePriceId: string;
  active: boolean;
};

// ── Queries (public — used by plans page) ──

/**
 * Get all active plan prices (for the public plans page).
 * No auth required — prices are public info.
 */
export async function getActivePlanPrices(): Promise<PlanPriceRow[]> {
  const prices = await prisma.planPrice.findMany({
    where: { active: true },
    orderBy: [{ plan: "asc" }, { interval: "asc" }],
  });
  return prices.map((p) => ({
    id: p.id,
    plan: p.plan,
    interval: p.interval,
    amount: p.amount,
    currency: p.currency,
    stripePriceId: p.stripePriceId,
    active: p.active,
  }));
}

/**
 * Get the Stripe price ID for a specific plan + interval.
 * Used internally by checkout flow.
 */
export async function getStripePriceId(
  plan: "PRO" | "CLUB",
  interval: "month" | "year"
): Promise<string | null> {
  const price = await prisma.planPrice.findUnique({
    where: { plan_interval: { plan, interval } },
    select: { stripePriceId: true, active: true },
  });
  if (!price || !price.active || !price.stripePriceId) return null;
  return price.stripePriceId;
}

// ── Admin CRUD ──

/**
 * Get all plan prices (admin view — includes inactive).
 */
export async function getAllPlanPrices(): Promise<PlanPriceRow[]> {
  await requireAdmin();
  const prices = await prisma.planPrice.findMany({
    orderBy: [{ plan: "asc" }, { interval: "asc" }],
  });
  return prices.map((p) => ({
    id: p.id,
    plan: p.plan,
    interval: p.interval,
    amount: p.amount,
    currency: p.currency,
    stripePriceId: p.stripePriceId,
    active: p.active,
  }));
}

/**
 * Create or update a plan price.
 */
export async function upsertPlanPrice(data: {
  plan: "PRO" | "CLUB";
  interval: "month" | "year";
  amount: number;
  stripePriceId: string;
  currency?: string;
  active?: boolean;
}): Promise<PlanPriceRow> {
  await requireAdmin();

  if (data.amount < 0) throw new Error("O valor do preço não pode ser negativo.");
  if (!data.stripePriceId.startsWith("price_")) {
    throw new Error("O ID do Stripe Price deve começar com 'price_'.");
  }

  const result = await prisma.planPrice.upsert({
    where: {
      plan_interval: { plan: data.plan, interval: data.interval },
    },
    update: {
      amount: data.amount,
      stripePriceId: data.stripePriceId,
      currency: data.currency ?? "eur",
      active: data.active ?? true,
    },
    create: {
      plan: data.plan,
      interval: data.interval,
      amount: data.amount,
      stripePriceId: data.stripePriceId,
      currency: data.currency ?? "eur",
      active: data.active ?? true,
    },
  });

  logAudit(
    "UPSERT_PLAN_PRICE",
    "PlanPrice",
    result.id,
    `${data.plan} ${data.interval}: ${data.amount}€ → ${data.stripePriceId}`
  ).catch(() => {});

  return {
    id: result.id,
    plan: result.plan,
    interval: result.interval,
    amount: result.amount,
    currency: result.currency,
    stripePriceId: result.stripePriceId,
    active: result.active,
  };
}

/**
 * Toggle a plan price active/inactive.
 */
export async function togglePlanPriceActive(
  plan: "PRO" | "CLUB",
  interval: "month" | "year",
  active: boolean
): Promise<void> {
  await requireAdmin();

  await prisma.planPrice.update({
    where: { plan_interval: { plan, interval } },
    data: { active },
  });

  logAudit(
    "TOGGLE_PLAN_PRICE",
    "PlanPrice",
    `${plan}_${interval}`,
    `${active ? "Ativado" : "Desativado"}`
  ).catch(() => {});
}

/**
 * Seed default plan prices if none exist.
 * Called once at app startup or when admin visits prices page.
 */
export async function seedDefaultPlanPrices(): Promise<void> {
  const count = await prisma.planPrice.count();
  if (count > 0) return; // Already seeded

  const defaults: Array<{
    plan: SubscriptionPlan;
    interval: string;
    amount: number;
    stripePriceId: string;
  }> = [
    { plan: "PRO", interval: "month", amount: 4.99, stripePriceId: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "" },
    { plan: "PRO", interval: "year", amount: 39.99, stripePriceId: process.env.STRIPE_PRICE_PRO_YEARLY ?? "" },
    { plan: "CLUB", interval: "month", amount: 14.99, stripePriceId: process.env.STRIPE_PRICE_CLUB_MONTHLY ?? "" },
    { plan: "CLUB", interval: "year", amount: 119.99, stripePriceId: process.env.STRIPE_PRICE_CLUB_YEARLY ?? "" },
  ];

  await prisma.planPrice.createMany({ data: defaults });
  console.log("[SEED] Default plan prices created.");
}
