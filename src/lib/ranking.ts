/**
 * Ranking module for CopaPro.
 *
 * POINT SYSTEM:
 * 1) Set points: +2 per set won by the player's team
 * 2) Match result: Win=+3, Draw=+1, Loss=+0
 * 3) Total = setPoints + matchResultPoints
 *
 * TIE-BREAKERS (default order):
 * 1) pointsTotal
 * 2) wins
 * 3) setsDiff
 * 4) setsWon
 * 5) draws
 */

export interface MatchData {
  set1A: number | null;
  set1B: number | null;
  set2A: number | null;
  set2B: number | null;
  set3A: number | null;
  set3B: number | null;
  status: string;
  resultType: string;
  teamAId: string;
  teamBId: string;
  teamA: { player1Id: string; player2Id: string };
  teamB: { player1Id: string; player2Id: string };
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

/**
 * Compute the contribution of a single finished match to player rankings.
 * Returns deltas for all 4 players involved.
 */
export function computeMatchContribution(
  match: MatchData,
  allowDraws: boolean
): PlayerDelta[] {
  if (match.status !== "FINISHED") return [];

  const sets = parseSets(match);
  const { setsA, setsB } = countSetsWon(sets);

  // Set points: +2 per set won
  const setPointsA = setsA * 2;
  const setPointsB = setsB * 2;

  // Match result points
  let matchPointsA = 0;
  let matchPointsB = 0;
  let winsA = 0,
    winsB = 0,
    drawsA = 0,
    drawsB = 0,
    lossesA = 0,
    lossesB = 0;

  if (match.resultType === "WIN_A") {
    matchPointsA = 3;
    matchPointsB = 0;
    winsA = 1;
    lossesB = 1;
  } else if (match.resultType === "WIN_B") {
    matchPointsA = 0;
    matchPointsB = 3;
    winsB = 1;
    lossesA = 1;
  } else if (match.resultType === "DRAW" && allowDraws) {
    matchPointsA = 1;
    matchPointsB = 1;
    drawsA = 1;
    drawsB = 1;
  }

  const totalA = setPointsA + matchPointsA;
  const totalB = setPointsB + matchPointsB;

  const teamAPlayers = [match.teamA.player1Id, match.teamA.player2Id];
  const teamBPlayers = [match.teamB.player1Id, match.teamB.player2Id];

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
 * 1) pointsTotal DESC
 * 2) wins DESC
 * 3) setsDiff DESC
 * 4) setsWon DESC
 * 5) draws DESC
 */
export function sortRankings(entries: RankingEntry[]): RankingEntry[] {
  return [...entries].sort((a, b) => {
    if (b.pointsTotal !== a.pointsTotal) return b.pointsTotal - a.pointsTotal;
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
  numberOfSets: number = 3
): string | null {
  const isValidScore = (s: number | null) => s === null || (Number.isInteger(s) && s >= 0 && s <= 7);

  if (!isValidScore(set1A) || !isValidScore(set1B) ||
      !isValidScore(set2A) || !isValidScore(set2B) ||
      !isValidScore(set3A) || !isValidScore(set3B)) {
    return "Pontuação inválida. Valores permitidos: 0-7.";
  }

  // Set 1 is always required
  if (set1A === null || set1B === null) {
    return "O primeiro set é obrigatório.";
  }
  if (set1A === set1B) {
    return "Set 1: empate não é permitido num set.";
  }

  // ── 1 Set format ──
  if (numberOfSets === 1) {
    if (set2A !== null || set2B !== null || set3A !== null || set3B !== null) {
      return "Este torneio é de 1 set. Não preencha o set 2 ou 3.";
    }
    return null; // Valid: single set decides the match
  }

  // ── 2 Sets or 3 Sets (Best of 3) ──
  // Set 2 is required
  if (set2A === null || set2B === null) {
    return "O segundo set é obrigatório.";
  }
  if (set2A === set2B) {
    return "Set 2: empate não é permitido num set.";
  }

  const s1Winner = set1A > set1B ? "A" : "B";
  const s2Winner = set2A > set2B ? "A" : "B";

  // ── 2 Sets format (no 3rd set allowed) ──
  if (numberOfSets === 2) {
    if (set3A !== null || set3B !== null) {
      return "Este torneio é de 2 sets. Não preencha o 3º set.";
    }
    // 2-0 or 0-2 → clear winner. 1-1 → draw (if allowed)
    if (s1Winner !== s2Winner && !allowDraws) {
      return "Resultado empatado em sets (1-1). Ative empates nas definições da época.";
    }
    return null;
  }

  // ── 3 Sets (Best of 3) ──
  // If same team won both sets → match decided, no set 3 needed
  if (s1Winner === s2Winner) {
    if (set3A !== null || set3B !== null) {
      return "O jogo já está decidido em 2 sets. Não é necessário um 3º set.";
    }
    return null;
  }

  // Split 1-1 → set 3 needed (or draw if allowed)
  if (set3A !== null && set3B !== null) {
    if (set3A === set3B) {
      return "Set 3: empate não é permitido num set.";
    }
    return null; // 3 sets played, match decided
  }

  if (allowDraws) {
    return null; // Draw is allowed with 1-1
  }
  return "Resultado empatado em sets. Insira o 3º set ou ative empates nas definições da época.";
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
  numberOfSets: number = 3
): { resultType: string; setsA: number; setsB: number } {
  let setsA = 0;
  let setsB = 0;

  if (set1A > set1B) setsA++;
  else setsB++;

  if (numberOfSets >= 2 && set2A !== null && set2B !== null) {
    if (set2A > set2B) setsA++;
    else setsB++;
  }

  if (numberOfSets >= 3 && set3A !== null && set3B !== null) {
    if (set3A > set3B) setsA++;
    else setsB++;
  }

  if (setsA > setsB) return { resultType: "WIN_A", setsA, setsB };
  if (setsB > setsA) return { resultType: "WIN_B", setsA, setsB };
  if (allowDraws) return { resultType: "DRAW", setsA, setsB };
  return { resultType: "UNDECIDED", setsA, setsB };
}
