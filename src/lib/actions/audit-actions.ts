"use server";

import { prisma } from "../db";
import { requireAuth, requireAdmin } from "../auth-guards";

// Helper: strip Prisma Date objects → plain JSON-safe objects
type Serialized<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;

function serialize<T>(obj: T): Serialized<T> {
  return JSON.parse(JSON.stringify(obj));
}

// ── Audit logging ──

/**
 * Log an audit entry. Fire-and-forget friendly — never throws.
 * Can be called from system contexts where no session exists.
 */
export async function logAudit(
  action: string,
  entity: string,
  entityId?: string,
  details?: string | Record<string, unknown>,
) {
  try {
    let userId: string | null = null;
    let userName: string | null = null;

    try {
      const user = await requireAuth();
      userId = user.id;
      userName = user.email;
    } catch {
      // No session — system-level action, that's OK
    }

    const detailsStr =
      details === undefined || details === null
        ? null
        : typeof details === "string"
          ? details
          : JSON.stringify(details);

    await prisma.auditLog.create({
      data: {
        userId,
        userName,
        action,
        entity,
        entityId: entityId ?? null,
        details: detailsStr,
      },
    });
  } catch {
    // Fire-and-forget: swallow all errors so callers are never disrupted
  }
}

// ── Admin: paginated audit log ──

interface AuditLogFilters {
  action?: string;
  entity?: string;
  userId?: string;
  fromDate?: string | Date;
  toDate?: string | Date;
}

export async function getAuditLogs(
  filters?: AuditLogFilters,
  page = 1,
  limit = 20,
) {
  await requireAdmin();

  const where: Record<string, unknown> = {};

  if (filters?.action) {
    where.action = filters.action;
  }
  if (filters?.entity) {
    where.entity = filters.entity;
  }
  if (filters?.userId) {
    where.userId = filters.userId;
  }
  if (filters?.fromDate || filters?.toDate) {
    const createdAt: Record<string, Date> = {};
    if (filters.fromDate) {
      createdAt.gte = new Date(filters.fromDate);
    }
    if (filters.toDate) {
      createdAt.lte = new Date(filters.toDate);
    }
    where.createdAt = createdAt;
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return serialize({
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

// ── League activity log ──

/**
 * Returns all audit entries related to a league:
 *  - entity "League" with entityId = leagueId
 *  - entity "Tournament" with entityId in league's tournament IDs
 *  - entity "Match" with entityId in league's match IDs
 */
export async function getLeagueActivityLog(
  leagueId: string,
  page = 1,
  limit = 20,
) {
  await requireAuth();

  // Fetch tournament and match IDs that belong to this league
  const tournaments = await prisma.tournament.findMany({
    where: { leagueId },
    select: { id: true },
  });
  const tournamentIds = tournaments.map((t) => t.id);

  const matches = await prisma.match.findMany({
    where: { tournamentId: { in: tournamentIds } },
    select: { id: true },
  });
  const matchIds = matches.map((m) => m.id);

  const where = {
    OR: [
      { entity: "League", entityId: leagueId },
      ...(tournamentIds.length > 0
        ? [{ entity: "Tournament", entityId: { in: tournamentIds } }]
        : []),
      ...(matchIds.length > 0
        ? [{ entity: "Match", entityId: { in: matchIds } }]
        : []),
    ],
  };

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return serialize({
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
