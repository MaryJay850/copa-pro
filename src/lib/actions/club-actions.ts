"use server";

import { prisma } from "../db";
import { requireAdmin, requireLeagueManager } from "../auth-guards";
import { revalidatePath } from "next/cache";
import type { CourtQuality } from "../../../generated/prisma/enums";

// ── Club CRUD (Admin only) ──

export async function getAllClubs() {
  await requireAdmin();

  const clubs = await prisma.club.findMany({
    include: {
      courts: {
        orderBy: { orderIndex: "asc" },
        include: { _count: { select: { matches: true, tournamentCourts: true } } },
      },
      _count: {
        select: { tournaments: true, leagueClubs: true, courts: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return JSON.parse(JSON.stringify(clubs));
}

export async function getClubsForLeague(leagueId: string) {
  // No auth check - viewing clubs is open to league members
  const leagueClubs = await prisma.leagueClub.findMany({
    where: { leagueId },
    include: {
      club: {
        include: {
          courts: { orderBy: { orderIndex: "asc" } },
          _count: { select: { tournaments: true, courts: true } },
        },
      },
    },
    orderBy: { club: { name: "asc" } },
  });

  return JSON.parse(JSON.stringify(leagueClubs.map((lc) => lc.club)));
}

export async function getClubWithCourts(clubId: string) {
  await requireAdmin();

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: {
      courts: { orderBy: { orderIndex: "asc" } },
      leagueClubs: {
        include: { league: { select: { id: true, name: true } } },
      },
    },
  });

  if (!club) throw new Error("Clube não encontrado.");
  return JSON.parse(JSON.stringify(club));
}

export async function getAvailableCourtsForClub(clubId: string) {
  const courts = await prisma.court.findMany({
    where: { clubId, isAvailable: true },
    orderBy: { orderIndex: "asc" },
    select: { id: true, name: true, quality: true, orderIndex: true },
  });
  return courts;
}

export async function createClub(name: string, location?: string) {
  await requireAdmin();

  if (!name || name.trim().length === 0) {
    throw new Error("Nome do clube é obrigatório.");
  }

  const club = await prisma.club.create({
    data: {
      name: name.trim(),
      location: location?.trim() || null,
    },
  });

  revalidatePath("/admin/clubes");
  return club;
}

export async function updateClub(clubId: string, data: { name?: string; location?: string }) {
  await requireAdmin();

  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) throw new Error("Clube não encontrado.");

  const updated = await prisma.club.update({
    where: { id: clubId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.location !== undefined && { location: data.location.trim() || null }),
    },
  });

  revalidatePath("/admin/clubes");
  return updated;
}

export async function deleteClub(clubId: string) {
  await requireAdmin();

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: { _count: { select: { tournaments: true } } },
  });
  if (!club) throw new Error("Clube não encontrado.");

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
  revalidatePath("/admin/clubes");
}

// ── League-Club Association ──

export async function addClubToLeague(clubId: string, leagueId: string) {
  await requireLeagueManager(leagueId);

  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) throw new Error("Clube não encontrado.");

  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) throw new Error("Liga não encontrada.");

  await prisma.leagueClub.upsert({
    where: { leagueId_clubId: { leagueId, clubId } },
    create: { leagueId, clubId },
    update: {},
  });

  revalidatePath(`/ligas/${leagueId}`);
}

export async function removeClubFromLeague(clubId: string, leagueId: string) {
  await requireLeagueManager(leagueId);

  // Check if any tournament in this league uses this club
  const tournamentsUsingClub = await prisma.tournament.count({
    where: {
      leagueId,
      clubId,
      status: { in: ["DRAFT", "PUBLISHED", "RUNNING"] },
    },
  });

  if (tournamentsUsingClub > 0) {
    throw new Error("Não é possível remover o clube. Existem torneios ativos nesta liga a usar este clube.");
  }

  await prisma.leagueClub.deleteMany({
    where: { leagueId, clubId },
  });

  revalidatePath(`/ligas/${leagueId}`);
}

export async function getClubsNotInLeague(leagueId: string) {
  await requireLeagueManager(leagueId);

  const existingClubIds = await prisma.leagueClub.findMany({
    where: { leagueId },
    select: { clubId: true },
  });

  const clubs = await prisma.club.findMany({
    where: {
      id: { notIn: existingClubIds.map((lc) => lc.clubId) },
    },
    include: {
      _count: { select: { courts: true } },
    },
    orderBy: { name: "asc" },
  });

  return JSON.parse(JSON.stringify(clubs));
}

// ── Court CRUD within Club (Admin only) ──

export async function addCourtToClub(data: {
  clubId: string;
  name: string;
  quality: CourtQuality;
}) {
  await requireAdmin();

  if (!data.name || data.name.trim().length === 0) {
    throw new Error("Nome do campo é obrigatório.");
  }

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

  revalidatePath("/admin/clubes");
  return court;
}

export async function updateCourt(data: {
  courtId: string;
  name?: string;
  quality?: CourtQuality;
  isAvailable?: boolean;
  orderIndex?: number;
}) {
  await requireAdmin();

  const court = await prisma.court.findUnique({ where: { id: data.courtId } });
  if (!court) throw new Error("Campo não encontrado.");

  const updated = await prisma.court.update({
    where: { id: data.courtId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.quality !== undefined && { quality: data.quality }),
      ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
      ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
    },
  });

  revalidatePath("/admin/clubes");
  return updated;
}

export async function deleteCourt(courtId: string) {
  await requireAdmin();

  const court = await prisma.court.findUnique({
    where: { id: courtId },
    include: { _count: { select: { matches: true, tournamentCourts: true } } },
  });
  if (!court) throw new Error("Campo não encontrado.");

  if (court._count.matches > 0 || court._count.tournamentCourts > 0) {
    throw new Error("Não é possível eliminar o campo. Existem torneios ou jogos associados. Desative o campo em vez de o eliminar.");
  }

  await prisma.court.delete({ where: { id: courtId } });
  revalidatePath("/admin/clubes");
}

export async function getCourtUsageInfo(courtId: string) {
  await requireAdmin();

  const court = await prisma.court.findUnique({
    where: { id: courtId },
    include: { _count: { select: { matches: true, tournamentCourts: true } } },
  });
  if (!court) throw new Error("Campo não encontrado.");

  return {
    hasUsage: court._count.matches > 0 || court._count.tournamentCourts > 0,
    matchCount: court._count.matches,
    tournamentCount: court._count.tournamentCourts,
  };
}

export async function reorderCourts(clubId: string, courtIds: string[]) {
  await requireAdmin();

  for (let i = 0; i < courtIds.length; i++) {
    await prisma.court.update({
      where: { id: courtIds[i] },
      data: { orderIndex: i },
    });
  }

  revalidatePath("/admin/clubes");
}
