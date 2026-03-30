"use server";

import { prisma } from "../db";
import { requireAuth } from "../auth-guards";
import { auth } from "../auth";
import { revalidatePath } from "next/cache";

function serialize<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ── Helpers ──

/**
 * Check if the current user is a manager of any league that owns the given court's club.
 */
async function requireCourtManager(courtId: string) {
  const user = await requireAuth();
  if (user.role === "ADMINISTRADOR") return user;

  const court = await prisma.court.findUnique({
    where: { id: courtId },
    select: { clubId: true },
  });
  if (!court?.clubId) {
    throw new Error("Campo não encontrado ou sem clube associado.");
  }

  const leagueClub = await prisma.leagueClub.findFirst({
    where: {
      clubId: court.clubId,
      league: {
        managers: { some: { userId: user.id } },
      },
    },
  });

  if (!leagueClub) {
    throw new Error("Sem permissão. Apenas gestores de liga associada a este clube.");
  }

  return user;
}

/**
 * Check if the user is a manager for any league linked to the court's club,
 * or is an admin. Returns true/false without throwing.
 */
async function isCourtManager(userId: string, courtId: string): Promise<boolean> {
  const court = await prisma.court.findUnique({
    where: { id: courtId },
    select: { clubId: true },
  });
  if (!court?.clubId) return false;

  const leagueClub = await prisma.leagueClub.findFirst({
    where: {
      clubId: court.clubId,
      league: {
        managers: { some: { userId } },
      },
    },
  });

  return !!leagueClub;
}

/**
 * Auto-calculate price based on CourtPricing rules.
 * Returns the matching price or null if no rule found.
 */
async function calculatePrice(
  courtId: string,
  date: Date,
  startTime: string,
): Promise<number | null> {
  const dayOfWeek = date.getDay(); // 0=Sunday ... 6=Saturday

  const pricingRules = await prisma.courtPricing.findMany({
    where: { courtId, dayOfWeek },
  });

  // Find a pricing rule where startTime falls within the rule's range
  for (const rule of pricingRules) {
    if (startTime >= rule.startTime && startTime < rule.endTime) {
      return rule.price;
    }
  }

  return null;
}

// ── 1. Create Reservation ──

interface CreateReservationData {
  courtId: string;
  date: string; // ISO date string "2024-01-15"
  startTime: string; // "09:00"
  endTime: string; // "10:30"
  playerId?: string;
  playerName?: string;
  leagueId?: string;
  notes?: string;
}

export async function createReservation(data: CreateReservationData) {
  const user = await requireAuth();

  try {
    const { courtId, date, startTime, endTime, playerId, playerName, leagueId, notes } = data;

    if (!courtId || !date || !startTime || !endTime) {
      throw new Error("Campos obrigatórios: campo, data, hora início e hora fim.");
    }

    // Verify court exists
    const court = await prisma.court.findUnique({ where: { id: courtId } });
    if (!court) throw new Error("Campo não encontrado.");

    const reservationDate = new Date(date);

    // Check for conflicting reservations on the same court/date
    // A conflict exists when an existing reservation overlaps with the requested time
    const conflicts = await prisma.reservation.findMany({
      where: {
        courtId,
        date: reservationDate,
        status: { in: ["PENDING", "CONFIRMED"] },
        // Overlap check: existing.start < new.end AND existing.end > new.start
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } },
        ],
      },
    });

    if (conflicts.length > 0) {
      throw new Error("Já existe uma reserva para este campo neste horário.");
    }

    // Auto-calculate price from CourtPricing
    const price = await calculatePrice(courtId, reservationDate, startTime);

    const reservation = await prisma.reservation.create({
      data: {
        courtId,
        date: reservationDate,
        startTime,
        endTime,
        playerId: playerId || null,
        playerName: playerName || null,
        leagueId: leagueId || null,
        notes: notes || null,
        price,
        createdBy: user.id,
        status: "PENDING",
      },
      include: {
        court: true,
        player: true,
        league: true,
      },
    });

    revalidatePath("/ligas");
    revalidatePath("/reservas");

    return serialize(reservation);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Erro ao criar reserva.");
  }
}

// ── 2. Update Reservation Status ──

export async function updateReservationStatus(
  reservationId: string,
  status: "CONFIRMED" | "CANCELLED" | "COMPLETED",
) {
  const user = await requireAuth();

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!reservation) throw new Error("Reserva não encontrada.");

    // Only league manager or admin can change status
    if (user.role !== "ADMINISTRADOR") {
      const canManage = await isCourtManager(user.id, reservation.courtId);
      if (!canManage) {
        throw new Error("Sem permissão. Apenas gestores de liga ou administradores.");
      }
    }

    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: { status },
      include: {
        court: true,
        player: true,
        league: true,
      },
    });

    revalidatePath("/ligas");
    revalidatePath("/reservas");

    return serialize(updated);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Erro ao atualizar estado da reserva.");
  }
}

// ── 3. Get Reservations (with filters) ──

export async function getReservations(filters: {
  courtId?: string;
  leagueId?: string;
  date?: string;
  weekStart?: string;
}) {
  await requireAuth();

  try {
    const where: Record<string, unknown> = {};

    if (filters.courtId) where.courtId = filters.courtId;
    if (filters.leagueId) where.leagueId = filters.leagueId;

    if (filters.date) {
      where.date = new Date(filters.date);
    } else if (filters.weekStart) {
      const start = new Date(filters.weekStart);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      where.date = { gte: start, lt: end };
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        court: true,
        player: true,
        league: true,
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return serialize(reservations);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Erro ao obter reservas.");
  }
}

// ── 4. Get Court Reservations for Week ──

export async function getCourtReservationsForWeek(courtId: string, weekStart: string) {
  await requireAuth();

  try {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const reservations = await prisma.reservation.findMany({
      where: {
        courtId,
        date: { gte: start, lt: end },
      },
      include: {
        player: true,
        league: true,
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return serialize(reservations);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Erro ao obter reservas do campo.");
  }
}

// ── 5. Get League Reservations ──

export async function getLeagueReservations(leagueId: string, weekStart?: string) {
  await requireAuth();

  try {
    const where: Record<string, unknown> = { leagueId };

    if (weekStart) {
      const start = new Date(weekStart);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      where.date = { gte: start, lt: end };
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        court: {
          include: {
            club: { select: { id: true, name: true } },
          },
        },
        player: { select: { id: true, fullName: true, nickname: true } },
        league: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return serialize(reservations);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Erro ao obter reservas da liga.");
  }
}

// ── 6. Save Court Pricing ──

interface PricingRule {
  dayOfWeek: number; // 0=Sunday ... 6=Saturday
  startTime: string; // "09:00"
  endTime: string; // "23:00"
  price: number;
}

export async function saveCourtPricing(courtId: string, pricing: PricingRule[]) {
  // Only league manager of a league linked to this court's club can manage pricing
  await requireCourtManager(courtId);

  try {
    const court = await prisma.court.findUnique({ where: { id: courtId } });
    if (!court) throw new Error("Campo não encontrado.");

    // Delete existing pricing and replace with new array
    await prisma.$transaction([
      prisma.courtPricing.deleteMany({ where: { courtId } }),
      ...pricing.map((rule) =>
        prisma.courtPricing.create({
          data: {
            courtId,
            dayOfWeek: rule.dayOfWeek,
            startTime: rule.startTime,
            endTime: rule.endTime,
            price: rule.price,
          },
        }),
      ),
    ]);

    revalidatePath("/ligas");
    revalidatePath("/reservas");

    return { success: true };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Erro ao guardar preços do campo.");
  }
}

// ── 7. Get Court Pricing ──

export async function getCourtPricing(courtId: string) {
  await requireAuth();

  try {
    const pricing = await prisma.courtPricing.findMany({
      where: { courtId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return serialize(pricing);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Erro ao obter preços do campo.");
  }
}

// ── 8. Delete Reservation ──

export async function deleteReservation(reservationId: string) {
  const user = await requireAuth();

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!reservation) throw new Error("Reserva não encontrada.");

    // Only the creator or a league manager for the court can delete
    const isCreator = reservation.createdBy === user.id;
    const isAdmin = user.role === "ADMINISTRADOR";

    if (!isCreator && !isAdmin) {
      const canManage = await isCourtManager(user.id, reservation.courtId);
      if (!canManage) {
        throw new Error("Sem permissão. Apenas o criador ou gestores de liga podem eliminar.");
      }
    }

    await prisma.reservation.delete({ where: { id: reservationId } });

    revalidatePath("/ligas");
    revalidatePath("/reservas");

    return { success: true };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Erro ao eliminar reserva.");
  }
}
