"use server";

import { prisma } from "../db";
import { requireAuth } from "../auth-guards";
import { auth } from "../auth";
import { revalidatePath } from "next/cache";

// ── Helpers ──

function calculateEndDate(startDate: Date, type: string): Date {
  const end = new Date(startDate);
  switch (type) {
    case "MENSAL":
      end.setMonth(end.getMonth() + 1);
      break;
    case "TRIMESTRAL":
      end.setMonth(end.getMonth() + 3);
      break;
    case "ANUAL":
      end.setFullYear(end.getFullYear() + 1);
      break;
    default:
      throw new Error("Tipo de mensalidade inválido. Use MENSAL, TRIMESTRAL ou ANUAL.");
  }
  return end;
}

async function requireClubLeagueManager(clubId: string) {
  const user = await requireAuth();
  if (user.role === "ADMINISTRADOR") return user;

  // Find which league(s) own this club
  const leagueClub = await prisma.leagueClub.findFirst({
    where: { clubId },
    select: { leagueId: true },
  });

  if (!leagueClub) {
    throw new Error("Clube não está associado a nenhuma liga.");
  }

  const manager = await prisma.leagueManager.findUnique({
    where: {
      userId_leagueId: { userId: user.id, leagueId: leagueClub.leagueId },
    },
  });

  if (!manager) {
    throw new Error("Não é gestor da liga deste clube.");
  }

  return user;
}

// ── Create Membership ──

export async function createMembership(data: {
  clubId: string;
  playerId: string;
  type: "ANUAL" | "MENSAL" | "TRIMESTRAL";
  startDate: string; // ISO date string
  amount: number;
  notes?: string;
}) {
  await requireClubLeagueManager(data.clubId);

  const club = await prisma.club.findUnique({ where: { id: data.clubId } });
  if (!club) throw new Error("Clube não encontrado.");

  const player = await prisma.player.findUnique({ where: { id: data.playerId } });
  if (!player) throw new Error("Jogador não encontrado.");

  if (data.amount < 0) {
    throw new Error("O valor da mensalidade deve ser positivo.");
  }

  const startDate = new Date(data.startDate);
  const endDate = calculateEndDate(startDate, data.type);

  // Check for existing active membership for this player in this club
  const existing = await prisma.clubMembership.findFirst({
    where: {
      clubId: data.clubId,
      playerId: data.playerId,
      status: "ACTIVE",
    },
  });

  if (existing) {
    throw new Error("Este jogador já tem uma mensalidade ativa neste clube.");
  }

  const membership = await prisma.clubMembership.create({
    data: {
      clubId: data.clubId,
      playerId: data.playerId,
      type: data.type,
      startDate,
      endDate,
      amount: data.amount,
      status: "ACTIVE",
      notes: data.notes?.trim() || null,
    },
  });

  revalidatePath(`/clubes/${data.clubId}/membros`);
  return JSON.parse(JSON.stringify(membership));
}

// ── Update Membership ──

export async function updateMembership(
  membershipId: string,
  data: {
    type?: "ANUAL" | "MENSAL" | "TRIMESTRAL";
    amount?: number;
    notes?: string;
    status?: "ACTIVE" | "EXPIRED" | "CANCELLED";
  }
) {
  const membership = await prisma.clubMembership.findUnique({
    where: { id: membershipId },
  });
  if (!membership) throw new Error("Mensalidade não encontrada.");

  await requireClubLeagueManager(membership.clubId);

  if (data.amount !== undefined && data.amount < 0) {
    throw new Error("O valor da mensalidade deve ser positivo.");
  }

  // If type changed, recalculate endDate from current startDate
  let endDate: Date | undefined;
  if (data.type && data.type !== membership.type) {
    endDate = calculateEndDate(new Date(membership.startDate), data.type);
  }

  const updated = await prisma.clubMembership.update({
    where: { id: membershipId },
    data: {
      ...(data.type !== undefined && { type: data.type }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
      ...(data.status !== undefined && { status: data.status }),
      ...(endDate !== undefined && { endDate }),
    },
  });

  revalidatePath(`/clubes/${membership.clubId}/membros`);
  return JSON.parse(JSON.stringify(updated));
}

// ── Renew Membership ──

export async function renewMembership(membershipId: string) {
  const membership = await prisma.clubMembership.findUnique({
    where: { id: membershipId },
  });
  if (!membership) throw new Error("Mensalidade não encontrada.");

  await requireClubLeagueManager(membership.clubId);

  // New period starts from the endDate of the current membership
  const newStartDate = new Date(membership.endDate);
  const newEndDate = calculateEndDate(newStartDate, membership.type);

  // Mark old membership as expired
  await prisma.clubMembership.update({
    where: { id: membershipId },
    data: { status: "EXPIRED" },
  });

  // Create the new membership with same type and amount
  const renewed = await prisma.clubMembership.create({
    data: {
      clubId: membership.clubId,
      playerId: membership.playerId,
      type: membership.type,
      startDate: newStartDate,
      endDate: newEndDate,
      amount: membership.amount,
      status: "ACTIVE",
      notes: membership.notes,
    },
  });

  revalidatePath(`/clubes/${membership.clubId}/membros`);
  return JSON.parse(JSON.stringify(renewed));
}

// ── Cancel Membership ──

export async function cancelMembership(membershipId: string) {
  const membership = await prisma.clubMembership.findUnique({
    where: { id: membershipId },
  });
  if (!membership) throw new Error("Mensalidade não encontrada.");

  await requireClubLeagueManager(membership.clubId);

  if (membership.status === "CANCELLED") {
    throw new Error("Esta mensalidade já está cancelada.");
  }

  const cancelled = await prisma.clubMembership.update({
    where: { id: membershipId },
    data: { status: "CANCELLED" },
  });

  revalidatePath(`/clubes/${membership.clubId}/membros`);
  return JSON.parse(JSON.stringify(cancelled));
}

// ── Get Club Memberships ──

export async function getClubMemberships(
  clubId: string,
  status?: "ACTIVE" | "EXPIRED" | "CANCELLED"
) {
  await requireClubLeagueManager(clubId);

  // Auto-expire memberships whose endDate has passed
  const now = new Date();
  await prisma.clubMembership.updateMany({
    where: {
      clubId,
      status: "ACTIVE",
      endDate: { lt: now },
    },
    data: { status: "EXPIRED" },
  });

  const memberships = await prisma.clubMembership.findMany({
    where: {
      clubId,
      ...(status && { status }),
    },
    include: {
      player: {
        select: {
          id: true,
          fullName: true,
          nickname: true,
          level: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { endDate: "desc" }],
  });

  return JSON.parse(JSON.stringify(memberships));
}

// ── Get Player Memberships ──

export async function getPlayerMemberships(playerId: string) {
  await requireAuth();

  // Auto-expire memberships whose endDate has passed
  const now = new Date();
  await prisma.clubMembership.updateMany({
    where: {
      playerId,
      status: "ACTIVE",
      endDate: { lt: now },
    },
    data: { status: "EXPIRED" },
  });

  const memberships = await prisma.clubMembership.findMany({
    where: { playerId },
    include: {
      club: {
        select: {
          id: true,
          name: true,
          location: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { endDate: "desc" }],
  });

  return JSON.parse(JSON.stringify(memberships));
}

// ── Get Membership Stats ──

export async function getMembershipStats(clubId: string) {
  await requireClubLeagueManager(clubId);

  // Auto-expire memberships whose endDate has passed
  const now = new Date();
  await prisma.clubMembership.updateMany({
    where: {
      clubId,
      status: "ACTIVE",
      endDate: { lt: now },
    },
    data: { status: "EXPIRED" },
  });

  const [active, expired, cancelled] = await Promise.all([
    prisma.clubMembership.count({ where: { clubId, status: "ACTIVE" } }),
    prisma.clubMembership.count({ where: { clubId, status: "EXPIRED" } }),
    prisma.clubMembership.count({ where: { clubId, status: "CANCELLED" } }),
  ]);

  // Total revenue: sum of all non-cancelled memberships
  const totalRevenueResult = await prisma.clubMembership.aggregate({
    where: {
      clubId,
      status: { not: "CANCELLED" },
    },
    _sum: { amount: true },
  });

  // Monthly revenue: sum of currently active memberships (pro-rated to monthly)
  const activeMemberships = await prisma.clubMembership.findMany({
    where: { clubId, status: "ACTIVE" },
    select: { type: true, amount: true },
  });

  let monthlyRevenue = 0;
  for (const m of activeMemberships) {
    switch (m.type) {
      case "MENSAL":
        monthlyRevenue += m.amount;
        break;
      case "TRIMESTRAL":
        monthlyRevenue += m.amount / 3;
        break;
      case "ANUAL":
        monthlyRevenue += m.amount / 12;
        break;
    }
  }

  return {
    active,
    expired,
    cancelled,
    total: active + expired + cancelled,
    totalRevenue: totalRevenueResult._sum.amount ?? 0,
    monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
  };
}
