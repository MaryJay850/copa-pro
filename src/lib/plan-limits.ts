import type { SubscriptionPlan } from "../../generated/prisma/enums";

// ── Feature flags ──
export type PlanFeature =
  | "DOUBLE_ROUND_ROBIN"
  | "RANDOM_TEAMS_SEED"
  | "ELO_SYSTEM"
  | "HEAD_TO_HEAD"
  | "PLAYER_RESULT_SUBMISSION"
  | "AVAILABILITY_CALENDAR"
  | "AUTO_SUBSTITUTION"
  | "EXPORT_PDF"
  | "EXPORT_ICALENDAR"
  | "REALTIME_NOTIFICATIONS"
  | "CLONE_TOURNAMENT"
  | "CLONE_SEASON"
  | "WHATSAPP_INTEGRATION"
  | "CSV_IMPORT"
  | "ADMIN_PANEL"
  | "ADVANCED_ANALYTICS"
  | "AUDIT_LOG"
  | "SYSTEM_SETTINGS"
  | "MULTI_MANAGER"
  | "COURT_SCHEDULES"
  | "UNLIMITED_LEAGUES"
  | "UNLIMITED_TOURNAMENTS"
  | "UNLIMITED_TEAMS"
  | "UNLIMITED_COURTS";

// ── Numeric limits (null = unlimited) ──
export interface PlanLimits {
  maxLeagues: number | null;
  maxTournamentsPerSeason: number | null;
  maxTeamsPerTournament: number | null;
  maxCourts: number | null;
  maxSeasonsPerLeague: number | null;
  features: PlanFeature[];
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  FREE: {
    maxLeagues: 1,
    maxTournamentsPerSeason: 2,
    maxTeamsPerTournament: 8,
    maxCourts: 2,
    maxSeasonsPerLeague: 1,
    features: [],
  },
  PRO: {
    maxLeagues: 3,
    maxTournamentsPerSeason: null,
    maxTeamsPerTournament: null,
    maxCourts: null,
    maxSeasonsPerLeague: null,
    features: [
      "DOUBLE_ROUND_ROBIN",
      "RANDOM_TEAMS_SEED",
      "ELO_SYSTEM",
      "HEAD_TO_HEAD",
      "PLAYER_RESULT_SUBMISSION",
      "AVAILABILITY_CALENDAR",
      "AUTO_SUBSTITUTION",
      "EXPORT_PDF",
      "EXPORT_ICALENDAR",
      "REALTIME_NOTIFICATIONS",
      "CLONE_TOURNAMENT",
      "CLONE_SEASON",
      "UNLIMITED_TOURNAMENTS",
      "UNLIMITED_TEAMS",
      "UNLIMITED_COURTS",
    ],
  },
  CLUB: {
    maxLeagues: null,
    maxTournamentsPerSeason: null,
    maxTeamsPerTournament: null,
    maxCourts: null,
    maxSeasonsPerLeague: null,
    features: [
      "DOUBLE_ROUND_ROBIN",
      "RANDOM_TEAMS_SEED",
      "ELO_SYSTEM",
      "HEAD_TO_HEAD",
      "PLAYER_RESULT_SUBMISSION",
      "AVAILABILITY_CALENDAR",
      "AUTO_SUBSTITUTION",
      "EXPORT_PDF",
      "EXPORT_ICALENDAR",
      "REALTIME_NOTIFICATIONS",
      "CLONE_TOURNAMENT",
      "CLONE_SEASON",
      "WHATSAPP_INTEGRATION",
      "CSV_IMPORT",
      "ADMIN_PANEL",
      "ADVANCED_ANALYTICS",
      "AUDIT_LOG",
      "SYSTEM_SETTINGS",
      "MULTI_MANAGER",
      "COURT_SCHEDULES",
      "UNLIMITED_LEAGUES",
      "UNLIMITED_TOURNAMENTS",
      "UNLIMITED_TEAMS",
      "UNLIMITED_COURTS",
    ],
  },
};

// ── Plan display info (static fallback — dynamic prices come from plan_prices table) ──
export const PLAN_INFO: Record<SubscriptionPlan, { name: string; price: string; priceYearly: string }> = {
  FREE: { name: "Free", price: "0€", priceYearly: "0€" },
  PRO: { name: "Pro", price: "4,99€/mês", priceYearly: "39,99€/ano" },
  CLUB: { name: "Club", price: "14,99€/mês", priceYearly: "119,99€/ano" },
};
