"use server";

import { prisma } from "../db";
import { requireLeagueManager } from "../auth-guards";
import { revalidatePath } from "next/cache";
import type { CourtQuality } from "../../../generated/prisma";

// ── Club CRUD ──

export async function getClubsForLeague(leagueId: string) {
  await requireLeagueManager(leagueId);

  const clubs = await prisma.club.findMany({
    where: { leagueId },
    include: {
      courts: {
        orderBy: { orderIndex: "asc" },
      },
      _count: {
        select: { tournaments: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return JSON.parse(JSON.stringify(clubs));
}

export async function getClubWithCourts(clubId: string) {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: {
      league: { select: { id: true, name: true } },
      courts: {
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!club) throw new Error("Clube não encontrado.");
  await requireLeagueManager(club.leagueId);

  return JSON.parse(JSON.stringify(club));
}

export async function getAvailableCourtsForClub(clubId: string) {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { leagueId: true },
  });
  if (!club) throw new Error("Clube não encontrado.");

  const courts = await prisma.court.findMany({
    where: {
      clubId,
      isAvailable: true,
    },
    orderBy: { orderIndex: "asc" },
    select: {
      id: true,
      name: true,
      quality: true,
      orderIndex: true,
    },
  });

  return courts;
}

export async function createClub(leagueId: string, name: string) {
  await requireLeagueManager(leagueId);

  if (!name || name.trim().length === 0) {
    throw new Error("Nome do clube é obrigatório.");
  }

  const club = await prisma.club.create({
    data: {
      leagueId,
      name: name.trim(),
    },
  });

  revalidatePath(`/ligas/${leagueId}`);
  return club;
}

export async function updateClub(clubId: string, name: string) {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { leagueId: true },
  });
  if (!club) throw new Error("Clube não encontrado.");
  await requireLeagueManager(club.leagueId);

  if (!name || name.trim().length === 0) {
    throw new Error("Nome do clube é obrigatório.");
  }

  const updated = await prisma.club.update({
    where: { id: clubId },
    data: { name: name.trim() },
  });

  revalidatePath(`/ligas/${club.leagueId}`);
  return updated;
}

export async function deleteClub(clubId: string) {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: {
      _count: { select: { tournaments: true } },
    },
  });
  if (!club) throw new Error("Clube não encontrado.");
  await requireLeagueManager(club.leagueId);

  // Check for active tournaments using this club
  const activeTournaments = await prisma.tournament.count({
    where: {
      clubId,
      status: { in: ["DRAFT", "PUBLISHED", "RUNNING"] },
    },
  });

  if (activeTournaments > 0) {
    throw new Error("Não é possível eliminar o clube. Existem torneios ativos associados.");
  }

  await prisma.club.delete({ where: { id: clubId } });
  revalidatePath(`/ligas/${club.leagueId}`);
}

// ── Court CRUD within Club ──

export async function addCourtToClub(data: {
  clubId: string;
  name: string;
  quality: CourtQuality;
}) {
  const club = await prisma.club.findUnique({
    where: { id: data.clubId },
    select: { leagueId: true },
  });
  if (!club) throw new Error("Clube não encontrado.");
  await requireLeagueManager(club.leagueId);

  if (!data.name || data.name.trim().length === 0) {
    throw new Error("Nome do campo é obrigatório.");
  }

  // Get next orderIndex
  const maxOrder = await prisma.court.aggregate({
    where: { clubId: data.clubId },
    _max: { orderIndex: true },
  });

  const court = await prisma.court.create({
    data: {
      clubId: data.clubId,
      name: data.name.trim(),
      quality: data.quality,
      orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
      isAvailable: true,
    },
  });

  revalidatePath(`/ligas/${club.leagueId}`);
  return court;
}

export async function updateCourt(data: {
  courtId: string;
  name?: string;
  quality?: CourtQuality;
  isAvailable?: boolean;
  orderIndex?: number;
}) {
  const court = await prisma.court.findUnique({
    where: { id: data.courtId },
    include: { club: { select: { leagueId: true } } },
  });
  if (!court || !court.club) throw new Error("Campo não encontrado.");
  await requireLeagueManager(court.club.leagueId);

  const updated = await prisma.court.update({
    where: { id: data.courtId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.quality !== undefined && { quality: data.quality }),
      ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
      ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
    },
  });

  revalidatePath(`/ligas/${court.club.leagueId}`);
  return updated;
}

export async function deleteCourt(courtId: string) {
  const court = await prisma.court.findUnique({
    where: { id: courtId },
    include: {
      club: { select: { leagueId: true } },
      _count: { select: { matches: true, tournamentCourts: true } },
    },
  });
  if (!court || !court.club) throw new Error("Campo não encontrado.");
  await requireLeagueManager(court.club.leagueId);

  // Check for matches using this court
  if (court._count.matches > 0) {
    throw new Error("Não é possível eliminar o campo. Existem jogos associados.");
  }

  // Remove tournament court associations first
  await prisma.tournamentCourt.deleteMany({ where: { courtId } });

  await prisma.court.delete({ where: { id: courtId } });
  revalidatePath(`/ligas/${court.club.leagueId}`);
}

export async function reorderCourts(clubId: string, courtIds: string[]) {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { leagueId: true },
  });
  if (!club) throw new Error("Clube não encontrado.");
  await requireLeagueManager(club.leagueId);

  // Update orderIndex for each court
  for (let i = 0; i < courtIds.length; i++) {
    await prisma.court.update({
      where: { id: courtIds[i] },
      data: { orderIndex: i },
    });
  }

  revalidatePath(`/ligas/${club.leagueId}`);
}
