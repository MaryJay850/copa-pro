/**
 * Ranking module for CopaPro.
 *
 * POINT SYSTEM (configurable per season):
 * 1) Set points: +pointsSetWon per set won by the player's team
 * 2) Match result: Win=+pointsWin, Draw=+pointsDraw, Loss=+pointsLoss
 * 3) Total = setPoints + matchResultPoints
 *
 * RANKING MODE:
 * - SUM: Total points accumulated (default)
 * - AVERAGE: Points per match (pointsTotal / matchesPlayed)
 *
 * TIE-BREAKERS (default order):
 * 1) pointsTotal (or average if AVERAGE mode)
 * 2) wins
 * 3) setsDiff
 * 4) setsWon
 * 5) draws
 */

export interface PointConfig {
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  pointsSetWon: number;
}

export interface MatchData {
  set1A: number | null;
  set1B: number | null;
  set2A: number | null;
  set2B: number | null;
  set3A: number | null;
  set3B: number | null;
  set4A?: number | null;
  set4B?: number | null;
  set5A?: number | null;
  set5B?: number | null;
  status: string;
  resultType: string;
  teamAId: string;
  teamBId: string;
  teamA: { player1Id: string; player2Id: string | null };
  teamB: { player1Id: string; player2Id: string | null };
  event?: string; // NONE | WALKOVER_A | WALKOVER_B | CANCELLED | etc.
}

export interface PlayerDelta {
  playerId: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  matchesPlayed: number;
}

export interface SetResult {
  scoreA: number;
  scoreB: number;
  winnerSide: "A" | "B" | null;
}

export function parseSets(match: MatchData): SetResult[] {
  const sets: SetResult[] = [];
  const pairs: [number | null, number | null][] = [
    [match.set1A, match.set1B],
    [match.set2A, match.set2B],
    [match.set3A, match.set3B],
    [match.set4A ?? null, match.set4B ?? null],
    [match.set5A ?? null, match.set5B ?? null],
  ];

  for (const [a, b] of pairs) {
    if (a !== null && b !== null) {
      sets.push({
        scoreA: a,
        scoreB: b,
        winnerSide: a > b ? "A" : b > a ? "B" : null,
      });
    }
  }

  return sets;
}

export function countSetsWon(sets: SetResult[]): { setsA: number; setsB: number } {
  let setsA = 0;
  let setsB = 0;
  for (const s of sets) {
    if (s.winnerSide === "A") setsA++;
    if (s.winnerSide === "B") setsB++;
  }
  return { setsA, setsB };
}

/** Default point config (backward compatible) */
export const DEFAULT_POINT_CONFIG: PointConfig = {
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: 0,
  pointsSetWon: 2,
};

/**
 * Compute the contribution of a single finished match to player rankings.
 * Returns deltas for all 4 players involved.
 * Accepts optional pointConfig for configurable scoring.
 */
export function computeMatchContribution(
  match: MatchData,
  allowDraws: boolean,
  pointConfig: PointConfig = DEFAULT_POINT_CONFIG
): PlayerDelta[] {
  if (match.status !== "FINISHED") return [];
  // Skip cancelled matches — they don't count for ranking
  if (match.event === "CANCELLED") return [];

  const sets = parseSets(match);
  const { setsA, setsB } = countSetsWon(sets);

  // Set points: configurable per set won
  const setPointsA = setsA * pointConfig.pointsSetWon;
  const setPointsB = setsB * pointConfig.pointsSetWon;

  // Match result points (configurable)
  let matchPointsA = 0;
  let matchPointsB = 0;
  let winsA = 0,
    winsB = 0,
    drawsA = 0,
    drawsB = 0,
    lossesA = 0,
    lossesB = 0;

  if (match.resultType === "WIN_A") {
    matchPointsA = pointConfig.pointsWin;
    matchPointsB = pointConfig.pointsLoss;
    winsA = 1;
    lossesB = 1;
  } else if (match.resultType === "WIN_B") {
    matchPointsA = pointConfig.pointsLoss;
    matchPointsB = pointConfig.pointsWin;
    winsB = 1;
    lossesA = 1;
  } else if (match.resultType === "DRAW" && allowDraws) {
    matchPointsA = pointConfig.pointsDraw;
    matchPointsB = pointConfig.pointsDraw;
    drawsA = 1;
    drawsB = 1;
  }

  const totalA = setPointsA + matchPointsA;
  const totalB = setPointsB + matchPointsB;

  const teamAPlayers = [match.teamA.player1Id, match.teamA.player2Id].filter(Boolean) as string[];
  const teamBPlayers = [match.teamB.player1Id, match.teamB.player2Id].filter(Boolean) as string[];

  const deltas: PlayerDelta[] = [];

  for (const pid of teamAPlayers) {
    deltas.push({
      playerId: pid,
      points: totalA,
      wins: winsA,
      draws: drawsA,
      losses: lossesA,
      setsWon: setsA,
      setsLost: setsB,
      matchesPlayed: 1,
    });
  }

  for (const pid of teamBPlayers) {
    deltas.push({
      playerId: pid,
      points: totalB,
      wins: winsB,
      draws: drawsB,
      losses: lossesB,
      setsWon: setsB,
      setsLost: setsA,
      matchesPlayed: 1,
    });
  }

  return deltas;
}

export interface RankingEntry {
  playerId: string;
  pointsTotal: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  setsDiff: number;
}

/**
 * Aggregate deltas from multiple matches into ranking entries.
 */
export function aggregateRankings(allDeltas: PlayerDelta[]): RankingEntry[] {
  const map = new Map<string, RankingEntry>();

  for (const d of allDeltas) {
    const existing = map.get(d.playerId) || {
      playerId: d.playerId,
      pointsTotal: 0,
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      setsWon: 0,
      setsLost: 0,
      setsDiff: 0,
    };

    existing.pointsTotal += d.points;
    existing.matchesPlayed += d.matchesPlayed;
    existing.wins += d.wins;
    existing.draws += d.draws;
    existing.losses += d.losses;
    existing.setsWon += d.setsWon;
    existing.setsLost += d.setsLost;
    existing.setsDiff = existing.setsWon - existing.setsLost;

    map.set(d.playerId, existing);
  }

  return Array.from(map.values());
}

/**
 * Sort ranking entries by tie-breaker order:
 * 1) pointsTotal DESC (or average if AVERAGE mode)
 * 2) wins DESC
 * 3) setsDiff DESC
 * 4) setsWon DESC
 * 5) draws DESC
 *
 * @param rankingMode - "SUM" (default) or "AVERAGE"
 */
export function sortRankings(entries: RankingEntry[], rankingMode: string = "SUM"): RankingEntry[] {
  return [...entries].sort((a, b) => {
    // Primary sort: by points total or average
    if (rankingMode === "AVERAGE") {
      const avgA = a.matchesPlayed > 0 ? a.pointsTotal / a.matchesPlayed : 0;
      const avgB = b.matchesPlayed > 0 ? b.pointsTotal / b.matchesPlayed : 0;
      if (Math.abs(avgB - avgA) > 0.001) return avgB - avgA;
    } else {
      if (b.pointsTotal !== a.pointsTotal) return b.pointsTotal - a.pointsTotal;
    }
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.setsDiff !== a.setsDiff) return b.setsDiff - a.setsDiff;
    if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
    if (b.draws !== a.draws) return b.draws - a.draws;
    return 0;
  });
}

/**
 * Validate match scores.
 * Returns null if valid, or an error message string.
 *
 * numberOfSets controls the match format:
 *   1 = single set (only set1 required)
 *   2 = two sets (set1 + set2 required, no set3)
 *   3 = best of 3 (set1 + set2 required, set3 as tiebreaker)
 */
export function validateMatchScores(
  set1A: number | null,
  set1B: number | null,
  set2A: number | null,
  set2B: number | null,
  set3A: number | null,
  set3B: number | null,
  allowDraws: boolean,
  numberOfSets: number = 3,
  set4A: number | null = null,
  set4B: number | null = null,
  set5A: number | null = null,
  set5B: number | null = null,
): string | null {
  const isValidScore = (s: number | null) => s === null || (Number.isInteger(s) && s >= 0 && s <= 99);
  const allSets: [number | null, number | null][] = [
    [set1A, set1B], [set2A, set2B], [set3A, set3B], [set4A, set4B], [set5A, set5B],
  ];

  for (const [a, b] of allSets) {
    if (!isValidScore(a) || !isValidScore(b)) {
      return "Pontuação inválida. Valores permitidos: 0-99.";
    }
  }

  // Set 1 is always required
  if (set1A === null || set1B === null) {
    return "O primeiro set é obrigatório.";
  }
  if (set1A === set1B && !allowDraws) {
    return "Set 1: empate não é permitido num set. Ative empates nas definições da época.";
  }

  // ── 1 Set format ──
  if (numberOfSets === 1) {
    if (allSets.slice(1).some(([a, b]) => a !== null || b !== null)) {
      return "Este torneio é de 1 set. Preencha apenas o set 1.";
    }
    return null;
  }

  // ── 2+ Sets: Set 2 is required ──
  if (set2A === null || set2B === null) {
    return "O segundo set é obrigatório.";
  }
  if (set2A === set2B && !allowDraws) {
    return "Set 2: empate não é permitido num set. Ative empates nas definições da época.";
  }

  // ── 2 Sets format ──
  if (numberOfSets === 2) {
    if (allSets.slice(2).some(([a, b]) => a !== null || b !== null)) {
      return "Este torneio é de 2 sets. Não preencha sets adicionais.";
    }
    const s1Winner = set1A > set1B ? "A" : set1B > set1A ? "B" : null;
    const s2Winner = set2A > set2B ? "A" : set2B > set2A ? "B" : null;
    if (s1Winner !== s2Winner && !allowDraws) {
      return "Resultado empatado em sets (1-1). Ative empates nas definições da época.";
    }
    return null;
  }

  // ── Best of N (3 or 5) ──
  const setsToWin = Math.ceil(numberOfSets / 2); // 2 for bo3, 3 for bo5
  let winsA = 0;
  let winsB = 0;

  for (let i = 0; i < numberOfSets; i++) {
    const [a, b] = allSets[i];
    if (a === null || b === null) {
      if (winsA >= setsToWin || winsB >= setsToWin) break;
      if (allowDraws) return null;
      return `Resultado empatado em sets. Insira o set ${i + 1} ou ative empates nas definições da época.`;
    }
    if (a === b && !allowDraws) {
      return `Set ${i + 1}: empate não é permitido num set. Ative empates nas definições da época.`;
    }
    if (a > b) winsA++;
    else if (b > a) winsB++;

    if (winsA >= setsToWin || winsB >= setsToWin) {
      // Check no extra sets filled
      for (let j = i + 1; j < numberOfSets; j++) {
        const [ea, eb] = allSets[j];
        if (ea !== null || eb !== null) {
          return `O jogo já está decidido. Não é necessário o set ${j + 1}.`;
        }
      }
      return null;
    }
  }

  // Check no sets beyond numberOfSets are filled
  for (let i = numberOfSets; i < 5; i++) {
    const [a, b] = allSets[i];
    if (a !== null || b !== null) {
      return `Este torneio não permite mais de ${numberOfSets} sets.`;
    }
  }

  if (winsA > winsB || winsB > winsA) return null;
  if (allowDraws) return null;
  return "Resultado empatado em sets. Ative empates nas definições da época.";
}

/**
 * Determine match result from scores.
 */
export function determineResult(
  set1A: number,
  set1B: number,
  set2A: number | null,
  set2B: number | null,
  set3A: number | null,
  set3B: number | null,
  allowDraws: boolean,
  numberOfSets: number = 3,
  set4A: number | null = null,
  set4B: number | null = null,
  set5A: number | null = null,
  set5B: number | null = null,
): { resultType: string; setsA: number; setsB: number } {
  const allSets: [number | null, number | null][] = [
    [set1A, set1B], [set2A, set2B], [set3A, set3B], [set4A, set4B], [set5A, set5B],
  ];
  let setsA = 0;
  let setsB = 0;

  for (let i = 0; i < numberOfSets; i++) {
    const [a, b] = allSets[i];
    if (a === null || b === null) break;
    if (a > b) setsA++;
    else if (b > a) setsB++;
  }

  if (setsA > setsB) return { resultType: "WIN_A", setsA, setsB };
  if (setsB > setsA) return { resultType: "WIN_B", setsA, setsB };
  if (allowDraws) return { resultType: "DRAW", setsA, setsB };
  return { resultType: "UNDECIDED", setsA, setsB };
}
