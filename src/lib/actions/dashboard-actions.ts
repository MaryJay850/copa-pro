"use server";

import { prisma } from "../db";
import { auth } from "../auth";

function serialize<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

const EMPTY_RESULT = {
  player: null,
  myStats: null,
  leagues: [] as { id: string; name: string }[],
  activeLeague: null,
  activeSeason: null,
  rankings: [] as any[],
  myRecentMatches: [] as any[],
  activeTournaments: [] as any[],
  headToHead: [] as any[],
  allTournaments: [] as any[],
};

export async function getMyDashboardData() {
  const session = await auth();
  if (!session?.user) return null;

  const userId = (session.user as any).id as string;
  const playerId = (session.user as any).playerId as string | null;

  // Get player data
  const player = playerId
    ? await prisma.player.findUnique({ where: { id: playerId } })
    : null;

  // Find leagues via user memberships (APPROVED)
  const memberships = await prisma.leagueMembership.findMany({
    where: { userId, status: "APPROVED" },
    include: {
      league: {
        include: {
          seasons: {
            where: { isActive: true },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  let userLeagues = memberships.map((m) => m.league);

  // If no memberships, check if league manager
  if (userLeagues.length === 0) {
    const managed = await prisma.leagueManager.findMany({
      where: { userId },
      include: {
        league: {
          include: {
            seasons: {
              where: { isActive: true },
              take: 1,
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });
    userLeagues = managed.map((m) => m.league);
  }

  // Fallback for admins
  if (userLeagues.length === 0) {
    const anyLeague = await prisma.league.findFirst({
      where: { isActive: true, seasons: { some: { isActive: true } } },
      include: {
        seasons: {
          where: { isActive: true },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (anyLeague) userLeagues.push(anyLeague);
  }

  if (userLeagues.length === 0) {
    return serialize(EMPTY_RESULT);
  }

  const activeLeague = userLeagues[0];
  const activeSeason = activeLeague.seasons[0];

  if (!activeSeason) {
    return serialize({
      ...EMPTY_RESULT,
      player: player ? { id: player.id, fullName: player.fullName, nickname: player.nickname, eloRating: player.eloRating } : null,
      leagues: userLeagues.map((l) => ({ id: l.id, name: l.name })),
      activeLeague: { id: activeLeague.id, name: activeLeague.name },
    });
  }

  // My ranking entry
  const myRanking = playerId
    ? await prisma.seasonRankingEntry.findFirst({
        where: { seasonId: activeSeason.id, playerId },
      })
    : null;

  // Full ranking
  const fullRanking = await prisma.seasonRankingEntry.findMany({
    where: { seasonId: activeSeason.id },
    orderBy: { pointsTotal: "desc" },
    include: { player: true },
  });

  const myPosition = playerId
    ? fullRanking.findIndex((r) => r.playerId === playerId) + 1
    : 0;

  const rankings = fullRanking.map((r, i) => ({
    position: i + 1,
    playerId: r.playerId,
    playerName: r.player.nickname || r.player.fullName,
    pointsTotal: r.pointsTotal,
    matchesPlayed: r.matchesPlayed,
    wins: r.wins,
    draws: r.draws,
    losses: r.losses,
    setsWon: r.setsWon,
    setsLost: r.setsLost,
    setsDiff: r.setsDiff,
  }));

  // My recent matches (last 8)
  const myRecentMatches = playerId
    ? await prisma.match.findMany({
        where: {
          tournament: { seasonId: activeSeason.id },
          status: "FINISHED",
          OR: [
            { teamA: { OR: [{ player1Id: playerId }, { player2Id: playerId }] } },
            { teamB: { OR: [{ player1Id: playerId }, { player2Id: playerId }] } },
          ],
        },
        orderBy: { playedAt: "desc" },
        take: 8,
        include: {
          teamA: { include: { player1: true, player2: true } },
          teamB: { include: { player1: true, player2: true } },
          tournament: { select: { name: true, id: true } },
        },
      })
    : [];

  // All tournaments in this season (for selector)
  const allTournaments = await prisma.tournament.findMany({
    where: { seasonId: activeSeason.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, status: true },
  });

  // Active tournaments with progress
  const activeTournamentsFull = await prisma.tournament.findMany({
    where: {
      seasonId: activeSeason.id,
      status: { in: ["RUNNING", "PUBLISHED"] },
    },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { teams: true, matches: true } } },
  });

  const tournamentsWithProgress = await Promise.all(
    activeTournamentsFull.map(async (t) => {
      const finishedCount = await prisma.match.count({
        where: { tournamentId: t.id, status: "FINISHED" },
      });
      return {
        id: t.id,
        name: t.name,
        status: t.status,
        totalMatches: t._count.matches,
        finishedMatches: finishedCount,
        teamsCount: t._count.teams,
      };
    })
  );

  // Head-to-head stats
  let headToHead: { opponentName: string; played: number; wins: number; losses: number }[] = [];
  if (playerId) {
    const allMatches = await prisma.match.findMany({
      where: {
        status: "FINISHED",
        tournament: { seasonId: activeSeason.id },
        OR: [
          { teamA: { OR: [{ player1Id: playerId }, { player2Id: playerId }] } },
          { teamB: { OR: [{ player1Id: playerId }, { player2Id: playerId }] } },
        ],
      },
      include: {
        teamA: { include: { player1: true, player2: true } },
        teamB: { include: { player1: true, player2: true } },
      },
    });

    const h2h = new Map<string, { name: string; wins: number; losses: number; draws: number }>();
    for (const m of allMatches) {
      const isTeamA = m.teamA.player1Id === playerId || m.teamA.player2Id === playerId;
      const opponentTeam = isTeamA ? m.teamB : m.teamA;
      const opponents = [opponentTeam.player1];
      if (opponentTeam.player2) opponents.push(opponentTeam.player2);

      for (const opp of opponents) {
        if (!h2h.has(opp.id)) {
          h2h.set(opp.id, { name: opp.nickname || opp.fullName, wins: 0, losses: 0, draws: 0 });
        }
        const record = h2h.get(opp.id)!;
        if (isTeamA) {
          if (m.resultType === "WIN_A") record.wins++;
          else if (m.resultType === "WIN_B") record.losses++;
          else if (m.resultType === "DRAW") record.draws++;
        } else {
          if (m.resultType === "WIN_B") record.wins++;
          else if (m.resultType === "WIN_A") record.losses++;
          else if (m.resultType === "DRAW") record.draws++;
        }
      }
    }

    headToHead = [...h2h.entries()]
      .map(([, data]) => ({
        opponentName: data.name,
        played: data.wins + data.losses + data.draws,
        wins: data.wins,
        losses: data.losses,
      }))
      .sort((a, b) => b.played - a.played)
      .slice(0, 5);
  }

  const winRate =
    myRanking && myRanking.matchesPlayed > 0
      ? Math.round((myRanking.wins / myRanking.matchesPlayed) * 100)
      : 0;

  return serialize({
    player: player
      ? { id: player.id, fullName: player.fullName, nickname: player.nickname, eloRating: player.eloRating }
      : null,
    myStats: myRanking
      ? {
          position: myPosition,
          totalPlayers: fullRanking.length,
          pointsTotal: myRanking.pointsTotal,
          matchesPlayed: myRanking.matchesPlayed,
          wins: myRanking.wins,
          draws: myRanking.draws,
          losses: myRanking.losses,
          setsWon: myRanking.setsWon,
          setsLost: myRanking.setsLost,
          setsDiff: myRanking.setsDiff,
          winRate,
        }
      : null,
    leagues: userLeagues.map((l) => ({ id: l.id, name: l.name })),
    activeLeague: { id: activeLeague.id, name: activeLeague.name },
    activeSeason: { id: activeSeason.id, name: activeSeason.name },
    rankings,
    myRecentMatches,
    activeTournaments: tournamentsWithProgress,
    headToHead,
    allTournaments,
  });
}
