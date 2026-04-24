"use server";

import { prisma } from "../db";
import { requireAdmin } from "../auth-guards";
import { computeMatchContribution, type PointConfig, type PlayerDelta } from "../ranking";

// ── Types ──

interface AuditPlayerInfo {
  id: string;
  name: string;
}

interface AuditMatchDelta {
  playerId: string;
  playerName: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  setsWon: number;
  setsLost: number;
}

interface AuditMatch {
  id: string;
  roundIndex: number;
  status: string;
  resultType: string;
  event: string;
  set1A: number | null;
  set1B: number | null;
  set2A: number | null;
  set2B: number | null;
  set3A: number | null;
  set3B: number | null;
  teamAPlayer1: AuditPlayerInfo;
  teamAPlayer2: AuditPlayerInfo | null;
  teamBPlayer1: AuditPlayerInfo;
  teamBPlayer2: AuditPlayerInfo | null;
  deltas: AuditMatchDelta[];
}

interface AuditFinalResult {
  position: number;
  player1Name: string;
  player2Name: string | null;
  positionPts: number;
  bonusPts: number;
  totalPts: number;
}

interface AuditTournament {
  id: string;
  name: string;
  status: string;
  teamMode: string;
  startDate: string | null;
  matches: AuditMatch[];
  finalResults?: AuditFinalResult[];
}

interface AuditPlayerPerTournament {
  tournamentId: string;
  tournamentName: string;
  matchesPlayed: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  setsWon: number;
  setsLost: number;
}

interface AuditPlayerComputed {
  pointsTotal: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  setsDiff: number;
}

interface AuditPlayerStored {
  pointsTotal: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  setsDiff: number;
  manualAdjustment: number;
  adjustmentNote: string | null;
}

interface AuditPlayer {
  id: string;
  name: string;
  computed: AuditPlayerComputed;
  stored: AuditPlayerStored | null;
  discrepancy: boolean;
  perTournament: AuditPlayerPerTournament[];
}

interface AuditSeasonConfig {
  id: string;
  name: string;
  leagueId: string;
  leagueName: string;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  pointsSetWon: number;
  allowDraws: boolean;
  rankingMode: string;
}

export interface AuditData {
  season: AuditSeasonConfig;
  tournaments: AuditTournament[];
  players: AuditPlayer[];
  totalDiscrepancies: number;
}

// ── Helpers ──

function playerDisplayName(player: { fullName: string; nickname: string | null }): string {
  return player.nickname || player.fullName;
}

// ── Main function ──

export async function getSeasonAuditData(seasonId: string): Promise<AuditData> {
  await requireAdmin();

  // 1. Fetch season with league info
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: {
      league: { select: { id: true, name: true } },
    },
  });

  if (!season) throw new Error("Epoca nao encontrada.");

  const pointConfig: PointConfig = {
    pointsWin: season.pointsWin,
    pointsDraw: season.pointsDraw,
    pointsLoss: season.pointsLoss,
    pointsSetWon: season.pointsSetWon,
  };

  // 2. Fetch all tournaments with matches, teams, and players
  const tournaments = await prisma.tournament.findMany({
    where: { seasonId },
    orderBy: { startDate: "asc" },
    include: {
      matches: {
        include: {
          round: { select: { index: true } },
          teamA: {
            include: {
              player1: { select: { id: true, fullName: true, nickname: true } },
              player2: { select: { id: true, fullName: true, nickname: true } },
            },
          },
          teamB: {
            include: {
              player1: { select: { id: true, fullName: true, nickname: true } },
              player2: { select: { id: true, fullName: true, nickname: true } },
            },
          },
        },
        orderBy: [{ round: { index: "asc" } }, { slotIndex: "asc" }],
      },
    },
  });

  // 3. Fetch SOBE_DESCE final results
  const sobeDesceIds = tournaments
    .filter((t) => t.teamMode === "SOBE_DESCE")
    .map((t) => t.id);

  const finalResultsRaw =
    sobeDesceIds.length > 0
      ? await prisma.tournamentFinalResult.findMany({
          where: { tournamentId: { in: sobeDesceIds } },
          include: {
            player1: { select: { id: true, fullName: true, nickname: true } },
            player2: { select: { id: true, fullName: true, nickname: true } },
          },
          orderBy: { position: "asc" },
        })
      : [];

  const finalResultsByTournament = new Map<string, typeof finalResultsRaw>();
  for (const fr of finalResultsRaw) {
    const arr = finalResultsByTournament.get(fr.tournamentId) || [];
    arr.push(fr);
    finalResultsByTournament.set(fr.tournamentId, arr);
  }

  // 4. Build player name map
  const playerNameMap = new Map<string, string>();
  for (const t of tournaments) {
    for (const m of t.matches) {
      playerNameMap.set(m.teamA.player1.id, playerDisplayName(m.teamA.player1));
      if (m.teamA.player2) playerNameMap.set(m.teamA.player2.id, playerDisplayName(m.teamA.player2));
      playerNameMap.set(m.teamB.player1.id, playerDisplayName(m.teamB.player1));
      if (m.teamB.player2) playerNameMap.set(m.teamB.player2.id, playerDisplayName(m.teamB.player2));
    }
  }
  for (const fr of finalResultsRaw) {
    playerNameMap.set(fr.player1.id, playerDisplayName(fr.player1));
    if (fr.player2) playerNameMap.set(fr.player2.id, playerDisplayName(fr.player2));
  }

  // 5. Compute deltas per match and build tournament audit data
  const sobeDesceIdSet = new Set(sobeDesceIds);

  // Track per-player, per-tournament aggregation
  const playerTournamentMap = new Map<string, Map<string, AuditPlayerPerTournament>>();
  // Track global computed totals per player
  const playerComputedMap = new Map<string, AuditPlayerComputed>();

  function ensurePlayerComputed(playerId: string): AuditPlayerComputed {
    let entry = playerComputedMap.get(playerId);
    if (!entry) {
      entry = { pointsTotal: 0, matchesPlayed: 0, wins: 0, draws: 0, losses: 0, setsWon: 0, setsLost: 0, setsDiff: 0 };
      playerComputedMap.set(playerId, entry);
    }
    return entry;
  }

  function ensurePlayerTournament(playerId: string, tournamentId: string, tournamentName: string): AuditPlayerPerTournament {
    let tMap = playerTournamentMap.get(playerId);
    if (!tMap) {
      tMap = new Map();
      playerTournamentMap.set(playerId, tMap);
    }
    let entry = tMap.get(tournamentId);
    if (!entry) {
      entry = { tournamentId, tournamentName, matchesPlayed: 0, points: 0, wins: 0, draws: 0, losses: 0, setsWon: 0, setsLost: 0 };
      tMap.set(tournamentId, entry);
    }
    return entry;
  }

  const auditTournaments: AuditTournament[] = [];

  for (const t of tournaments) {
    const isSobeDesce = sobeDesceIdSet.has(t.id);

    const auditMatches: AuditMatch[] = [];

    for (const m of t.matches) {
      const matchEvent = (m as any).event || "NONE";

      // Build MatchData for computeMatchContribution
      const matchData = {
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
        event: matchEvent,
      };

      // Only compute deltas for non-SOBE_DESCE finished matches
      let deltas: PlayerDelta[] = [];
      if (!isSobeDesce && m.status === "FINISHED") {
        deltas = computeMatchContribution(matchData, season.allowDraws, pointConfig);
      }

      // Accumulate per-player and per-tournament stats
      for (const d of deltas) {
        const pc = ensurePlayerComputed(d.playerId);
        pc.pointsTotal += d.points;
        pc.matchesPlayed += d.matchesPlayed;
        pc.wins += d.wins;
        pc.draws += d.draws;
        pc.losses += d.losses;
        pc.setsWon += d.setsWon;
        pc.setsLost += d.setsLost;

        const pt = ensurePlayerTournament(d.playerId, t.id, t.name);
        pt.points += d.points;
        pt.matchesPlayed += d.matchesPlayed;
        pt.wins += d.wins;
        pt.draws += d.draws;
        pt.losses += d.losses;
        pt.setsWon += d.setsWon;
        pt.setsLost += d.setsLost;
      }

      const auditDeltas: AuditMatchDelta[] = deltas.map((d) => ({
        playerId: d.playerId,
        playerName: playerNameMap.get(d.playerId) || "?",
        points: d.points,
        wins: d.wins,
        draws: d.draws,
        losses: d.losses,
        setsWon: d.setsWon,
        setsLost: d.setsLost,
      }));

      auditMatches.push({
        id: m.id,
        roundIndex: m.round.index,
        status: m.status,
        resultType: m.resultType,
        event: matchEvent,
        set1A: m.set1A,
        set1B: m.set1B,
        set2A: m.set2A,
        set2B: m.set2B,
        set3A: m.set3A,
        set3B: m.set3B,
        teamAPlayer1: { id: m.teamA.player1.id, name: playerDisplayName(m.teamA.player1) },
        teamAPlayer2: m.teamA.player2
          ? { id: m.teamA.player2.id, name: playerDisplayName(m.teamA.player2) }
          : null,
        teamBPlayer1: { id: m.teamB.player1.id, name: playerDisplayName(m.teamB.player1) },
        teamBPlayer2: m.teamB.player2
          ? { id: m.teamB.player2.id, name: playerDisplayName(m.teamB.player2) }
          : null,
        deltas: auditDeltas,
      });
    }

    // Build final results for SOBE_DESCE tournaments
    let auditFinalResults: AuditFinalResult[] | undefined;
    if (isSobeDesce) {
      const frs = finalResultsByTournament.get(t.id) || [];
      auditFinalResults = frs.map((fr) => ({
        position: fr.position,
        player1Name: playerDisplayName(fr.player1),
        player2Name: fr.player2 ? playerDisplayName(fr.player2) : null,
        positionPts: fr.positionPts,
        bonusPts: fr.bonusPts,
        totalPts: fr.totalPts,
      }));

      // Also add SOBE_DESCE points to computed totals
      for (const fr of frs) {
        const pc1 = ensurePlayerComputed(fr.player1Id);
        pc1.pointsTotal += fr.totalPts;
        pc1.matchesPlayed += 1;
        pc1.wins += fr.position === 1 ? 1 : 0;

        const pt1 = ensurePlayerTournament(fr.player1Id, t.id, t.name);
        pt1.points += fr.totalPts;
        pt1.matchesPlayed += 1;
        pt1.wins += fr.position === 1 ? 1 : 0;

        if (fr.player2Id) {
          const pc2 = ensurePlayerComputed(fr.player2Id);
          pc2.pointsTotal += fr.totalPts;
          pc2.matchesPlayed += 1;
          pc2.wins += fr.position === 1 ? 1 : 0;

          const pt2 = ensurePlayerTournament(fr.player2Id, t.id, t.name);
          pt2.points += fr.totalPts;
          pt2.matchesPlayed += 1;
          pt2.wins += fr.position === 1 ? 1 : 0;
        }
      }
    }

    auditTournaments.push({
      id: t.id,
      name: t.name,
      status: t.status,
      teamMode: t.teamMode,
      startDate: t.startDate ? t.startDate.toISOString() : null,
      matches: auditMatches,
      finalResults: auditFinalResults,
    });
  }

  // 6. Finalize computed setsDiff
  for (const [, pc] of playerComputedMap) {
    pc.setsDiff = pc.setsWon - pc.setsLost;
  }

  // 7. Fetch stored rankings
  const storedRankings = await prisma.seasonRankingEntry.findMany({
    where: { seasonId },
    include: {
      player: { select: { id: true, fullName: true, nickname: true } },
    },
  });

  const storedMap = new Map<string, AuditPlayerStored>();
  for (const sr of storedRankings) {
    playerNameMap.set(sr.player.id, playerDisplayName(sr.player));
    storedMap.set(sr.playerId, {
      pointsTotal: sr.pointsTotal,
      matchesPlayed: sr.matchesPlayed,
      wins: sr.wins,
      draws: sr.draws,
      losses: sr.losses,
      setsWon: sr.setsWon,
      setsLost: sr.setsLost,
      setsDiff: sr.setsDiff,
      manualAdjustment: sr.manualAdjustment,
      adjustmentNote: sr.adjustmentNote,
    });
  }

  // 8. Build player audit entries
  // Collect all unique player IDs from computed + stored
  const allPlayerIds = new Set<string>([
    ...playerComputedMap.keys(),
    ...storedMap.keys(),
  ]);

  let totalDiscrepancies = 0;

  const auditPlayers: AuditPlayer[] = Array.from(allPlayerIds).map((playerId) => {
    const computed = playerComputedMap.get(playerId) || {
      pointsTotal: 0,
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      setsWon: 0,
      setsLost: 0,
      setsDiff: 0,
    };

    const stored = storedMap.get(playerId) || null;

    // Check discrepancy: computed + manualAdjustment should equal stored
    let discrepancy = false;
    if (stored) {
      const expectedTotal = computed.pointsTotal + stored.manualAdjustment;
      discrepancy =
        expectedTotal !== stored.pointsTotal ||
        computed.matchesPlayed !== stored.matchesPlayed ||
        computed.wins !== stored.wins ||
        computed.draws !== stored.draws ||
        computed.losses !== stored.losses ||
        computed.setsWon !== stored.setsWon ||
        computed.setsLost !== stored.setsLost;
    } else if (computed.matchesPlayed > 0) {
      // Player has computed data but no stored entry
      discrepancy = true;
    }

    if (discrepancy) totalDiscrepancies++;

    // Build per-tournament breakdown
    const tMap = playerTournamentMap.get(playerId) || new Map();
    const perTournament = Array.from(tMap.values());

    return {
      id: playerId,
      name: playerNameMap.get(playerId) || "?",
      computed,
      stored,
      discrepancy,
      perTournament,
    };
  });

  // Sort by stored pointsTotal DESC, then by name
  auditPlayers.sort((a, b) => {
    const ptsA = a.stored?.pointsTotal ?? a.computed.pointsTotal;
    const ptsB = b.stored?.pointsTotal ?? b.computed.pointsTotal;
    if (ptsB !== ptsA) return ptsB - ptsA;
    return a.name.localeCompare(b.name);
  });

  return {
    season: {
      id: season.id,
      name: season.name,
      leagueId: season.league.id,
      leagueName: season.league.name,
      pointsWin: season.pointsWin,
      pointsDraw: season.pointsDraw,
      pointsLoss: season.pointsLoss,
      pointsSetWon: season.pointsSetWon,
      allowDraws: season.allowDraws,
      rankingMode: season.rankingMode,
    },
    tournaments: auditTournaments,
    players: auditPlayers,
    totalDiscrepancies,
  };
}
