"use server";

import { prisma } from "./db";
import { generateRoundRobinPairings, generateRandomTeams, type TeamRef } from "./scheduling";
import { computeMatchContribution, validateMatchScores, determineResult } from "./ranking";
import { revalidatePath } from "next/cache";

// ── League actions ──

export async function createLeague(formData: FormData) {
  const name = formData.get("name") as string;
  const location = (formData.get("location") as string) || null;

  if (!name?.trim()) throw new Error("Nome da liga é obrigatório.");

  const league = await prisma.league.create({
    data: { name: name.trim(), location: location?.trim() || null },
  });

  revalidatePath("/ligas");
  return league;
}

export async function getLeagues() {
  return prisma.league.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { seasons: true } } },
  });
}

export async function getLeague(id: string) {
  return prisma.league.findUnique({
    where: { id },
    include: {
      seasons: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function deleteLeague(id: string) {
  await prisma.league.delete({ where: { id } });
  revalidatePath("/ligas");
}

// ── Season actions ──

export async function createSeason(formData: FormData) {
  const leagueId = formData.get("leagueId") as string;
  const name = formData.get("name") as string;
  const allowDraws = formData.get("allowDraws") === "true";
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;

  if (!name?.trim()) throw new Error("Nome da época é obrigatório.");

  const season = await prisma.season.create({
    data: {
      leagueId,
      name: name.trim(),
      allowDraws,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  revalidatePath(`/ligas/${leagueId}`);
  return season;
}

export async function getSeason(id: string) {
  return prisma.season.findUnique({
    where: { id },
    include: {
      league: true,
      tournaments: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { teams: true, matches: true } } },
      },
      rankings: {
        orderBy: { pointsTotal: "desc" },
        include: { player: true },
      },
    },
  });
}

export async function updateSeasonDraws(seasonId: string, allowDraws: boolean) {
  await prisma.season.update({
    where: { id: seasonId },
    data: { allowDraws },
  });
}

// ── Player actions ──

export async function getPlayers() {
  return prisma.player.findMany({ orderBy: { fullName: "asc" } });
}

export async function createPlayer(formData: FormData) {
  const fullName = formData.get("fullName") as string;
  const nickname = (formData.get("nickname") as string) || null;
  const level = (formData.get("level") as string) || null;

  if (!fullName?.trim()) throw new Error("Nome do jogador é obrigatório.");

  return prisma.player.create({
    data: {
      fullName: fullName.trim(),
      nickname: nickname?.trim() || null,
      level: level?.trim() || null,
    },
  });
}

export async function createPlayersFromList(names: string[]) {
  const players = [];
  for (const name of names) {
    if (name.trim()) {
      const p = await prisma.player.create({
        data: { fullName: name.trim() },
      });
      players.push(p);
    }
  }
  return players;
}

// ── Tournament actions ──

export async function createTournament(data: {
  leagueId: string;
  seasonId: string;
  name: string;
  courtsCount: number;
  matchesPerPair: number;
  teamMode: string;
  randomSeed?: string;
  teams: { name: string; player1Id: string; player2Id: string }[];
}) {
  const tournament = await prisma.tournament.create({
    data: {
      leagueId: data.leagueId,
      seasonId: data.seasonId,
      name: data.name,
      courtsCount: data.courtsCount,
      matchesPerPair: data.matchesPerPair,
      teamMode: data.teamMode,
      randomSeed: data.randomSeed || null,
      status: "DRAFT",
    },
  });

  // Create courts
  for (let i = 0; i < data.courtsCount; i++) {
    await prisma.court.create({
      data: {
        tournamentId: tournament.id,
        name: `Campo ${i + 1}`,
      },
    });
  }

  // Create teams
  const createdTeams = [];
  for (const t of data.teams) {
    const team = await prisma.team.create({
      data: {
        tournamentId: tournament.id,
        name: t.name,
        player1Id: t.player1Id,
        player2Id: t.player2Id,
        isRandomGenerated: data.teamMode === "RANDOM_TEAMS",
      },
    });
    createdTeams.push(team);
  }

  return tournament;
}

export async function generateSchedule(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { teams: true, courts: true, rounds: true, matches: true },
  });

  if (!tournament) throw new Error("Torneio não encontrado.");

  // Check if results exist
  const hasResults = tournament.matches.some((m) => m.status === "FINISHED");
  if (hasResults) {
    throw new Error("CONFIRM_REGENERATE");
  }

  // Delete existing schedule
  await prisma.match.deleteMany({ where: { tournamentId } });
  await prisma.round.deleteMany({ where: { tournamentId } });

  const teamRefs: TeamRef[] = tournament.teams.map((t, i) => ({
    id: t.id,
    index: i,
  }));

  const pairings = generateRoundRobinPairings(
    teamRefs,
    tournament.courtsCount,
    tournament.matchesPerPair,
    tournament.randomSeed || undefined
  );

  // Get court ids
  const courts = tournament.courts;

  // Create rounds and matches
  const roundMap = new Map<number, string>();

  for (const p of pairings) {
    if (!roundMap.has(p.roundIndex)) {
      const round = await prisma.round.create({
        data: { tournamentId, index: p.roundIndex },
      });
      roundMap.set(p.roundIndex, round.id);
    }

    const roundId = roundMap.get(p.roundIndex)!;
    const courtId = courts[p.courtIndex]?.id || null;

    await prisma.match.create({
      data: {
        tournamentId,
        roundId,
        courtId,
        slotIndex: p.slotIndex,
        teamAId: p.teamA.id,
        teamBId: p.teamB.id,
        status: "SCHEDULED",
        resultType: "UNDECIDED",
      },
    });
  }

  // Update status
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "PUBLISHED" },
  });

  revalidatePath(`/torneios/${tournamentId}`);
  return { roundCount: roundMap.size, matchCount: pairings.length };
}

export async function forceRegenerateSchedule(tournamentId: string) {
  // Delete all results first
  await prisma.match.deleteMany({ where: { tournamentId } });
  await prisma.round.deleteMany({ where: { tournamentId } });

  // Now regenerate
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { teams: true, courts: true },
  });

  if (!tournament) throw new Error("Torneio não encontrado.");

  const teamRefs: TeamRef[] = tournament.teams.map((t, i) => ({
    id: t.id,
    index: i,
  }));

  const pairings = generateRoundRobinPairings(
    teamRefs,
    tournament.courtsCount,
    tournament.matchesPerPair,
    tournament.randomSeed || undefined
  );

  const courts = tournament.courts;
  const roundMap = new Map<number, string>();

  for (const p of pairings) {
    if (!roundMap.has(p.roundIndex)) {
      const round = await prisma.round.create({
        data: { tournamentId, index: p.roundIndex },
      });
      roundMap.set(p.roundIndex, round.id);
    }

    const roundId = roundMap.get(p.roundIndex)!;
    const courtId = courts[p.courtIndex]?.id || null;

    await prisma.match.create({
      data: {
        tournamentId,
        roundId,
        courtId,
        slotIndex: p.slotIndex,
        teamAId: p.teamA.id,
        teamBId: p.teamB.id,
        status: "SCHEDULED",
        resultType: "UNDECIDED",
      },
    });
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "PUBLISHED" },
  });

  // Recompute season rankings since results were deleted
  await recomputeSeasonRanking(tournament.seasonId);

  revalidatePath(`/torneios/${tournamentId}`);
  return { roundCount: roundMap.size, matchCount: pairings.length };
}

export async function getTournament(id: string) {
  return prisma.tournament.findUnique({
    where: { id },
    include: {
      league: true,
      season: true,
      teams: {
        include: { player1: true, player2: true },
      },
      courts: true,
      rounds: {
        orderBy: { index: "asc" },
        include: {
          matches: {
            orderBy: { slotIndex: "asc" },
            include: {
              teamA: { include: { player1: true, player2: true } },
              teamB: { include: { player1: true, player2: true } },
              court: true,
            },
          },
        },
      },
    },
  });
}

// ── Match scoring ──

export async function saveMatchScore(
  matchId: string,
  scores: {
    set1A: number | null;
    set1B: number | null;
    set2A: number | null;
    set2B: number | null;
    set3A: number | null;
    set3B: number | null;
  }
) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      tournament: { include: { season: true } },
      teamA: true,
      teamB: true,
    },
  });

  if (!match) throw new Error("Jogo não encontrado.");

  const allowDraws = match.tournament.season.allowDraws;

  // Validate scores
  const error = validateMatchScores(
    scores.set1A, scores.set1B,
    scores.set2A, scores.set2B,
    scores.set3A, scores.set3B,
    allowDraws
  );

  if (error) throw new Error(error);

  // Determine result
  const result = determineResult(
    scores.set1A!, scores.set1B!,
    scores.set2A, scores.set2B,
    scores.set3A, scores.set3B,
    allowDraws
  );

  const winnerTeamId =
    result.resultType === "WIN_A" ? match.teamAId :
    result.resultType === "WIN_B" ? match.teamBId :
    null;

  // Update match
  await prisma.match.update({
    where: { id: matchId },
    data: {
      ...scores,
      status: "FINISHED",
      resultType: result.resultType,
      winnerTeamId,
      playedAt: new Date(),
    },
  });

  // Check if tournament should move to RUNNING
  await prisma.tournament.update({
    where: { id: match.tournamentId },
    data: { status: "RUNNING" },
  });

  // Recompute season ranking
  await recomputeSeasonRanking(match.tournament.seasonId);

  revalidatePath(`/torneios/${match.tournamentId}`);
}

export async function resetMatch(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { tournament: true },
  });

  if (!match) throw new Error("Jogo não encontrado.");

  await prisma.match.update({
    where: { id: matchId },
    data: {
      set1A: null, set1B: null,
      set2A: null, set2B: null,
      set3A: null, set3B: null,
      status: "SCHEDULED",
      resultType: "UNDECIDED",
      winnerTeamId: null,
      playedAt: null,
    },
  });

  // Recompute rankings
  await recomputeSeasonRanking(match.tournament.seasonId);

  revalidatePath(`/torneios/${match.tournamentId}`);
}

export async function updateTeamName(teamId: string, name: string) {
  if (!name?.trim()) throw new Error("Nome da equipa é obrigatório.");

  const team = await prisma.team.update({
    where: { id: teamId },
    data: { name: name.trim() },
  });

  revalidatePath(`/torneios/${team.tournamentId}`);
}

// ── Ranking recomputation ──

export async function recomputeSeasonRanking(seasonId: string) {
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
  });

  if (!season) return;

  // Get all finished matches in this season
  const matches = await prisma.match.findMany({
    where: {
      tournament: { seasonId },
      status: "FINISHED",
    },
    include: {
      teamA: true,
      teamB: true,
    },
  });

  // Compute all deltas
  const allDeltas = matches.flatMap((m) =>
    computeMatchContribution(
      {
        set1A: m.set1A,
        set1B: m.set1B,
        set2A: m.set2A,
        set2B: m.set2B,
        set3A: m.set3A,
        set3B: m.set3B,
        status: m.status,
        resultType: m.resultType,
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        teamA: { player1Id: m.teamA.player1Id, player2Id: m.teamA.player2Id },
        teamB: { player1Id: m.teamB.player1Id, player2Id: m.teamB.player2Id },
      },
      season.allowDraws
    )
  );

  // Aggregate
  const playerMap = new Map<string, {
    pointsTotal: number;
    matchesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    setsWon: number;
    setsLost: number;
  }>();

  for (const d of allDeltas) {
    const e = playerMap.get(d.playerId) || {
      pointsTotal: 0, matchesPlayed: 0, wins: 0, draws: 0,
      losses: 0, setsWon: 0, setsLost: 0,
    };
    e.pointsTotal += d.points;
    e.matchesPlayed += d.matchesPlayed;
    e.wins += d.wins;
    e.draws += d.draws;
    e.losses += d.losses;
    e.setsWon += d.setsWon;
    e.setsLost += d.setsLost;
    playerMap.set(d.playerId, e);
  }

  // Delete old rankings and insert new ones (transactional)
  await prisma.$transaction(async (tx) => {
    await tx.seasonRankingEntry.deleteMany({ where: { seasonId } });

    for (const [playerId, data] of playerMap.entries()) {
      await tx.seasonRankingEntry.create({
        data: {
          seasonId,
          playerId,
          ...data,
          setsDiff: data.setsWon - data.setsLost,
        },
      });
    }
  });
}

// ── Tournament finalize ──

export async function finishTournament(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { matches: true },
  });

  if (!tournament) throw new Error("Torneio não encontrado.");

  const allFinished = tournament.matches.every((m) => m.status === "FINISHED");
  if (!allFinished) {
    throw new Error("Existem jogos por completar. Finalize todos os jogos antes de encerrar o torneio.");
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "FINISHED" },
  });

  revalidatePath(`/torneios/${tournamentId}`);
}
