"use server";

import { prisma } from "./db";
import { requireAuth } from "./auth-guards";
import { PLAN_LIMITS, type PlanFeature } from "./plan-limits";
import type { SubscriptionPlan } from "../../generated/prisma/enums";

/**
 * Get the user's current effective plan.
 * Returns FREE if plan has expired.
 */
export async function getUserPlan(userId?: string): Promise<SubscriptionPlan> {
  const id = userId ?? (await requireAuth()).id;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { plan: true, planExpiresAt: true },
  });
  if (!user) return "FREE";

  // Check expiry
  if (user.plan !== "FREE" && user.planExpiresAt && user.planExpiresAt < new Date()) {
    // Plan expired — downgrade to FREE
    await prisma.user.update({
      where: { id },
      data: { plan: "FREE", planExpiresAt: null },
    });
    return "FREE";
  }

  return user.plan;
}

/**
 * Check if user has a specific feature.
 * Throws a descriptive error if not.
 */
export async function requireFeature(feature: PlanFeature, userId?: string): Promise<void> {
  const plan = await getUserPlan(userId);
  const limits = PLAN_LIMITS[plan];

  if (!limits.features.includes(feature)) {
    const featureNames: Record<PlanFeature, string> = {
      DOUBLE_ROUND_ROBIN: "Double Round Robin",
      RANDOM_TEAMS_SEED: "Equipas aleatórias com seed",
      ELO_SYSTEM: "Sistema Elo",
      HEAD_TO_HEAD: "Head-to-Head",
      PLAYER_RESULT_SUBMISSION: "Submissão de resultados",
      AVAILABILITY_CALENDAR: "Calendário de disponibilidade",
      AUTO_SUBSTITUTION: "Substituição automática",
      EXPORT_PDF: "Export PDF",
      EXPORT_ICALENDAR: "Export iCalendar",
      REALTIME_NOTIFICATIONS: "Notificações em tempo real",
      CLONE_TOURNAMENT: "Clonar torneio",
      CLONE_SEASON: "Clonar época",
      WHATSAPP_INTEGRATION: "Integração WhatsApp",
      CSV_IMPORT: "Import CSV",
      ADMIN_PANEL: "Painel de administração",
      ADVANCED_ANALYTICS: "Analytics avançados",
      AUDIT_LOG: "Registo de auditoria",
      SYSTEM_SETTINGS: "Configurações do sistema",
      MULTI_MANAGER: "Múltiplos gestores",
      COURT_SCHEDULES: "Horários de campos",
      UNLIMITED_LEAGUES: "Ligas ilimitadas",
      UNLIMITED_TOURNAMENTS: "Torneios ilimitados",
      UNLIMITED_TEAMS: "Equipas ilimitadas",
      UNLIMITED_COURTS: "Campos ilimitados",
    };
    throw new Error(
      `PLAN_UPGRADE_REQUIRED:${feature}:A funcionalidade "${featureNames[feature]}" requer o plano Pro ou superior.`
    );
  }
}

/**
 * Check if user can do a specific feature (non-throwing).
 */
export async function canUseFeature(feature: PlanFeature, userId?: string): Promise<boolean> {
  const plan = await getUserPlan(userId);
  return PLAN_LIMITS[plan].features.includes(feature);
}

/**
 * Check numeric limits (e.g., max leagues, max tournaments).
 * Throws if limit exceeded.
 */
export async function checkLimit(
  limitKey: "maxLeagues" | "maxTournamentsPerSeason" | "maxTeamsPerTournament" | "maxCourts" | "maxSeasonsPerLeague",
  currentCount: number,
  userId?: string
): Promise<void> {
  const plan = await getUserPlan(userId);
  const limits = PLAN_LIMITS[plan];
  const max = limits[limitKey];

  if (max !== null && currentCount >= max) {
    const limitNames: Record<string, string> = {
      maxLeagues: "ligas",
      maxTournamentsPerSeason: "torneios por época",
      maxTeamsPerTournament: "equipas por torneio",
      maxCourts: "campos",
      maxSeasonsPerLeague: "épocas por liga",
    };
    throw new Error(
      `PLAN_LIMIT_REACHED:${limitKey}:Atingiu o limite de ${max} ${limitNames[limitKey]} no plano ${plan}. Faça upgrade para continuar.`
    );
  }
}

/**
 * Get all limits for a user's plan (for UI display).
 */
export async function getUserPlanLimits(userId?: string) {
  const plan = await getUserPlan(userId);
  return { plan, limits: PLAN_LIMITS[plan] };
}
