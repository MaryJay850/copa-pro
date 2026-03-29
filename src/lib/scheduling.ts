import seedrandom from "seedrandom";

export interface TeamRef {
  id: string;
  index: number;
}

export interface MatchPairing {
  teamA: TeamRef;
  teamB: TeamRef;
  roundIndex: number;
  courtIndex: number;
  slotIndex: number;
}

/**
 * Generate Round Robin pairings using the circle/polygon method.
 * For N teams:
 *   - If N is odd, add a BYE placeholder (we won't support odd here, but handle it).
 *   - Fix team[0], rotate the rest.
 *   - Each rotation = 1 logical round.
 *   - For K=2 (double RR), duplicate all pairings with swapped home/away.
 */
export function generateRoundRobinPairings(
  teams: TeamRef[],
  courtsCount: number,
  matchesPerPair: number,
  seed?: string
): MatchPairing[] {
  const n = teams.length;
  if (n < 2) return [];

  // Circle method requires even number
  const hasBye = n % 2 !== 0;
  const slots: (TeamRef | null)[] = [...teams];
  if (hasBye) slots.push(null);

  const totalSlots = slots.length;
  const numLogicalRounds = totalSlots - 1;

  // Generate single RR pairings
  let singlePairings: { teamA: TeamRef; teamB: TeamRef }[] = [];
  const logicalRounds: { teamA: TeamRef; teamB: TeamRef }[][] = [];

  for (let r = 0; r < numLogicalRounds; r++) {
    const roundPairings: { teamA: TeamRef; teamB: TeamRef }[] = [];

    for (let i = 0; i < totalSlots / 2; i++) {
      const a = slots[i];
      const b = slots[totalSlots - 1 - i];
      if (a && b) {
        roundPairings.push({ teamA: a, teamB: b });
      }
    }

    logicalRounds.push(roundPairings);
    singlePairings.push(...roundPairings);

    // Rotate: fix slots[0], shift the rest clockwise
    const last = slots[totalSlots - 1];
    for (let i = totalSlots - 1; i > 1; i--) {
      slots[i] = slots[i - 1];
    }
    slots[1] = last;
  }

  // For double RR, add reversed pairings
  let allLogicalRounds = [...logicalRounds];
  if (matchesPerPair === 2) {
    const reversedRounds = logicalRounds.map((round) =>
      round.map((p) => ({ teamA: p.teamB, teamB: p.teamA }))
    );
    allLogicalRounds = [...allLogicalRounds, ...reversedRounds];
  }

  // If seed provided, shuffle the logical rounds order
  if (seed) {
    const rng = seedrandom(seed);
    for (let i = allLogicalRounds.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [allLogicalRounds[i], allLogicalRounds[j]] = [allLogicalRounds[j], allLogicalRounds[i]];
    }
  }

  // Allocate to time-block rounds respecting court count
  const result: MatchPairing[] = [];
  let currentRoundIndex = 1;
  let currentCourtSlot = 0;

  for (const logicalRound of allLogicalRounds) {
    // Each logical round's pairings must be split if they exceed courts
    // But we also need to ensure no team plays twice in the same time block
    const remaining = [...logicalRound];

    while (remaining.length > 0) {
      const blockTeams = new Set<string>();
      const blockMatches: { teamA: TeamRef; teamB: TeamRef }[] = [];

      for (let i = remaining.length - 1; i >= 0; i--) {
        const p = remaining[i];
        if (
          blockMatches.length < courtsCount &&
          !blockTeams.has(p.teamA.id) &&
          !blockTeams.has(p.teamB.id)
        ) {
          blockMatches.push(p);
          blockTeams.add(p.teamA.id);
          blockTeams.add(p.teamB.id);
          remaining.splice(i, 1);
        }
      }

      for (let c = 0; c < blockMatches.length; c++) {
        result.push({
          teamA: blockMatches[c].teamA,
          teamB: blockMatches[c].teamB,
          roundIndex: currentRoundIndex,
          courtIndex: c,
          slotIndex: c,
        });
      }

      currentRoundIndex++;
    }
  }

  return result;
}

/**
 * Generate unique random teams for each round using 1-factorization of K_N.
 *
 * For N players (N even), the complete graph K_N has exactly N-1 perfect matchings
 * (1-factors) that together cover all edges. Each 1-factor = 1 round of N/2 unique pairs.
 * No pair of players repeats across rounds.
 *
 * Algorithm (circle/polygon method):
 * 1. Fix player[0] in place.
 * 2. Rotate the remaining N-1 players through positions.
 * 3. In each rotation, pair position[i] with position[N-1-i].
 * 4. Each rotation = 1 round with N/2 unique pairs.
 *
 * Returns `numberOfRounds` arrays of team pairs (max N-1 rounds).
 */
export function generateAllRoundTeams(
  playerIds: string[],
  numberOfRounds: number,
  seed: string
): { player1Id: string; player2Id: string }[][] {
  const n = playerIds.length;
  if (n < 4 || n % 2 !== 0) {
    throw new Error("É necessário um número par de jogadores (mínimo 4) para gerar equipas por ronda.");
  }

  const maxRounds = n - 1;
  const actualRounds = Math.min(numberOfRounds, maxRounds);

  // Shuffle player order using seed for randomness
  const rng = seedrandom(seed);
  const shuffledIds = [...playerIds];
  for (let i = shuffledIds.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffledIds[i], shuffledIds[j]] = [shuffledIds[j], shuffledIds[i]];
  }

  // Build all N-1 rounds using circle method (1-factorization)
  const slots = [...shuffledIds];
  const allRounds: { player1Id: string; player2Id: string }[][] = [];

  for (let r = 0; r < maxRounds; r++) {
    const roundPairs: { player1Id: string; player2Id: string }[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = slots[i];
      const b = slots[n - 1 - i];
      // Consistent ordering: alphabetically smaller first
      roundPairs.push(
        a < b ? { player1Id: a, player2Id: b } : { player1Id: b, player2Id: a }
      );
    }
    allRounds.push(roundPairs);

    // Rotate: fix slots[0], shift the rest clockwise
    const last = slots[n - 1];
    for (let i = n - 1; i > 1; i--) {
      slots[i] = slots[i - 1];
    }
    slots[1] = last;
  }

  // Shuffle the round order using seed (so different seeds give different round sequences)
  for (let i = allRounds.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [allRounds[i], allRounds[j]] = [allRounds[j], allRounds[i]];
  }

  // Return only the requested number of rounds
  return allRounds.slice(0, actualRounds);
}

/**
 * Optimize match assignments within each round to maximize opponent variety.
 *
 * After teams are generated (via 1-factorization), we need to decide
 * which team plays which team. Instead of sequential pairing (team0 vs team1),
 * this uses a greedy algorithm that minimizes repeated opponent encounters.
 *
 * For each round:
 * 1. Build an "opponent history" matrix tracking how many times each player
 *    has faced each other player as an opponent.
 * 2. For each possible team-vs-team pairing, calculate a "repetition cost"
 *    (sum of existing opponent encounters between the 4 players).
 * 3. Use minimum-weight matching to find the optimal assignment.
 *
 * This ensures players face the widest variety of opponents across rounds.
 */
export function optimizeMatchAssignments(
  roundTeams: { player1Id: string; player2Id: string }[][],
): { teamAIndex: number; teamBIndex: number }[][] {
  // Track how many times each pair of players has been opponents
  const opponentCount = new Map<string, number>();

  function opponentKey(a: string, b: string): string {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }

  function getOpponentCost(
    team1: { player1Id: string; player2Id: string },
    team2: { player1Id: string; player2Id: string }
  ): number {
    // Cost = sum of existing opponent encounters between all cross-team pairs
    // Heavy penalty (100x) when any pair would exceed 2 encounters
    const pairs = [
      [team1.player1Id, team2.player1Id],
      [team1.player1Id, team2.player2Id],
      [team1.player2Id, team2.player1Id],
      [team1.player2Id, team2.player2Id],
    ];
    let cost = 0;
    for (const [a, b] of pairs) {
      const count = opponentCount.get(opponentKey(a, b)) ?? 0;
      if (count >= 2) {
        // Strong penalty to avoid exceeding 2 encounters
        cost += 100;
      } else {
        cost += count;
      }
    }
    return cost;
  }

  function recordOpponents(
    team1: { player1Id: string; player2Id: string },
    team2: { player1Id: string; player2Id: string }
  ): void {
    const pairs = [
      [team1.player1Id, team2.player1Id],
      [team1.player1Id, team2.player2Id],
      [team1.player2Id, team2.player1Id],
      [team1.player2Id, team2.player2Id],
    ];
    for (const [a, b] of pairs) {
      const key = opponentKey(a, b);
      opponentCount.set(key, (opponentCount.get(key) ?? 0) + 1);
    }
  }

  const result: { teamAIndex: number; teamBIndex: number }[][] = [];

  for (const teams of roundTeams) {
    const numTeams = teams.length;
    const numMatches = Math.floor(numTeams / 2);

    // Greedy minimum-cost matching
    // For small N (typically 4-8 teams per round), brute force is fine
    const indices = Array.from({ length: numTeams }, (_, i) => i);
    let bestAssignment: { teamAIndex: number; teamBIndex: number }[] = [];
    let bestCost = Infinity;

    // Generate all possible perfect matchings using recursive approach
    function findBestMatching(
      available: number[],
      current: { teamAIndex: number; teamBIndex: number }[],
      currentCost: number
    ): void {
      if (current.length === numMatches) {
        if (currentCost < bestCost) {
          bestCost = currentCost;
          bestAssignment = [...current];
        }
        return;
      }

      // Prune: if current cost already >= best, skip
      if (currentCost >= bestCost) return;

      if (available.length < 2) return;

      // Pick the first available team, try pairing with each remaining
      const first = available[0];
      const rest = available.slice(1);

      for (let i = 0; i < rest.length; i++) {
        const second = rest[i];
        const pairCost = getOpponentCost(teams[first], teams[second]);
        const remaining = [...rest.slice(0, i), ...rest.slice(i + 1)];

        findBestMatching(
          remaining,
          [...current, { teamAIndex: first, teamBIndex: second }],
          currentCost + pairCost
        );
      }
    }

    findBestMatching(indices, [], 0);

    // Record the chosen opponents
    for (const match of bestAssignment) {
      recordOpponents(teams[match.teamAIndex], teams[match.teamBIndex]);
    }

    result.push(bestAssignment);
  }

  return result;
}

/**
 * Optimize court assignments for matches across rounds based on court quality.
 *
 * Rules:
 * - GOOD courts: no player plays more than 2x on the same court
 * - MEDIUM courts: no player plays more than 1x on the same court
 * - BAD courts: no player plays more than 1x (relaxable to 2x if impossible)
 *
 * Uses greedy minimum-cost matching per round:
 * 1. Track how many times each player has played on each court
 * 2. For each possible match-to-court assignment, calculate cost
 * 3. Find optimal assignment via brute force (small N, typically 2-4 courts)
 */
export function optimizeCourtAssignments(
  roundMatches: { player1IdA: string; player2IdA?: string; player1IdB: string; player2IdB?: string }[][],
  courts: { id: string; quality: "GOOD" | "MEDIUM" | "BAD" }[]
): string[][] {
  // Track per-player-per-court usage count
  const courtUsage = new Map<string, number>(); // "playerId|courtId" -> count

  function usageKey(playerId: string, courtId: string): string {
    return `${playerId}|${courtId}`;
  }

  function getPlayerCourtCount(playerId: string, courtId: string): number {
    return courtUsage.get(usageKey(playerId, courtId)) ?? 0;
  }

  function getAssignmentCost(
    match: { player1IdA: string; player2IdA?: string; player1IdB: string; player2IdB?: string },
    court: { id: string; quality: "GOOD" | "MEDIUM" | "BAD" }
  ): number {
    const players = [match.player1IdA, match.player1IdB];
    if (match.player2IdA) players.push(match.player2IdA);
    if (match.player2IdB) players.push(match.player2IdB);

    let cost = 0;
    for (const pid of players) {
      const count = getPlayerCourtCount(pid, court.id);
      if (court.quality === "BAD") {
        if (count >= 2) cost += 10000; // Absolutely forbidden: >2x on BAD
        else if (count >= 1) cost += 100; // Strong penalty: 2nd time on BAD
      } else if (court.quality === "MEDIUM") {
        if (count >= 1) cost += 50; // Penalty: 2nd time on MEDIUM
      } else {
        // GOOD
        if (count >= 2) cost += 50; // Penalty: 3rd time on GOOD
        else cost += count; // Small cost for 2nd time
      }
    }
    return cost;
  }

  function recordAssignment(
    match: { player1IdA: string; player2IdA?: string; player1IdB: string; player2IdB?: string },
    courtId: string
  ): void {
    const players = [match.player1IdA, match.player1IdB];
    if (match.player2IdA) players.push(match.player2IdA);
    if (match.player2IdB) players.push(match.player2IdB);
    for (const pid of players) {
      const key = usageKey(pid, courtId);
      courtUsage.set(key, (courtUsage.get(key) ?? 0) + 1);
    }
  }

  const result: string[][] = [];

  for (const matches of roundMatches) {
    const numMatches = matches.length;
    const availableCourts = courts.slice(0, Math.max(numMatches, courts.length));

    // Brute force: try all permutations of court assignments
    let bestAssignment: string[] = [];
    let bestCost = Infinity;

    function findBestAssignment(
      matchIdx: number,
      usedCourts: Set<string>,
      current: string[],
      currentCost: number
    ): void {
      if (matchIdx === numMatches) {
        if (currentCost < bestCost) {
          bestCost = currentCost;
          bestAssignment = [...current];
        }
        return;
      }

      if (currentCost >= bestCost) return; // Prune

      for (const court of availableCourts) {
        if (usedCourts.has(court.id)) continue;
        const cost = getAssignmentCost(matches[matchIdx], court);
        usedCourts.add(court.id);
        current.push(court.id);
        findBestAssignment(matchIdx + 1, usedCourts, current, currentCost + cost);
        current.pop();
        usedCourts.delete(court.id);
      }
    }

    findBestAssignment(0, new Set(), [], 0);

    // Record the chosen assignments
    for (let i = 0; i < bestAssignment.length; i++) {
      recordAssignment(matches[i], bestAssignment[i]);
    }

    result.push(bestAssignment);
  }

  return result;
}

/**
 * Generate random teams from a list of players.
 * Requires even number of players.
 */
// ── Americano Format ──

export interface AmericanoRoundResult {
  matches: {
    team1: [string, string]; // player IDs
    team2: [string, string]; // player IDs
    courtIndex: number;
  }[];
}

/**
 * Generate Round 1 of an Americano tournament.
 * Random pairing of players into teams, then teams into matches.
 */
export function generateAmericanoRound1(
  playerIds: string[],
  courtsCount: number,
  seed?: string
): AmericanoRoundResult {
  const n = playerIds.length;
  if (n < 4 || n % 2 !== 0) {
    throw new Error("É necessário um número par de jogadores (mínimo 4) para o formato Americano.");
  }

  const rng = seedrandom(seed || "americano-r1");
  const shuffled = [...playerIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Pair adjacent: [0,1], [2,3], [4,5], ...
  const teams: [string, string][] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    teams.push([shuffled[i], shuffled[i + 1]]);
  }

  // Match adjacent teams: team0 vs team1, team2 vs team3, ...
  const matches: AmericanoRoundResult["matches"] = [];
  for (let i = 0; i < teams.length - 1; i += 2) {
    matches.push({
      team1: teams[i],
      team2: teams[i + 1],
      courtIndex: Math.floor(i / 2) % courtsCount,
    });
  }

  return { matches };
}

/**
 * Generate subsequent rounds (N>1) of an Americano tournament.
 * Sort players by current standings, pair adjacent players,
 * match adjacent teams, avoiding repeated partners when possible.
 */
export function generateNextAmericanoRound(
  playerIds: string[],
  courtsCount: number,
  standings: { playerId: string; points: number }[],
  previousPairings: [string, string][], // pairs that already played together
  roundIndex: number
): AmericanoRoundResult {
  const n = playerIds.length;
  if (n < 4 || n % 2 !== 0) {
    throw new Error("É necessário um número par de jogadores (mínimo 4) para o formato Americano.");
  }

  // Sort by points descending (stable sort preserving order for ties)
  const sorted = [...standings].sort((a, b) => b.points - a.points);
  const sortedIds = sorted.map((s) => s.playerId);

  // Build a set of previous pairings for quick lookup
  const pairingSet = new Set<string>();
  for (const [a, b] of previousPairings) {
    pairingSet.add(a < b ? `${a}|${b}` : `${b}|${a}`);
  }

  function hasPaired(a: string, b: string): boolean {
    return pairingSet.has(a < b ? `${a}|${b}` : `${b}|${a}`);
  }

  // Pair adjacent players by ranking: #1 with #2, #3 with #4, etc.
  // If a pair has already played together, try swapping with the next pair
  const teams: [string, string][] = [];
  const used = new Set<string>();
  const remaining = [...sortedIds];

  while (remaining.length >= 2) {
    const a = remaining[0];
    remaining.splice(0, 1);

    // Find best partner: prefer adjacent in ranking, avoid repeated
    let bestIdx = 0;
    let bestHasPaired = hasPaired(a, remaining[0]);

    for (let i = 1; i < remaining.length && bestHasPaired; i++) {
      if (!hasPaired(a, remaining[i])) {
        bestIdx = i;
        bestHasPaired = false;
        break;
      }
    }

    const b = remaining[bestIdx];
    remaining.splice(bestIdx, 1);
    teams.push([a, b]);
  }

  // Match adjacent teams: team(#1,#2) vs team(#3,#4), etc.
  // Best players on best court (lowest courtIndex)
  const matches: AmericanoRoundResult["matches"] = [];
  for (let i = 0; i < teams.length - 1; i += 2) {
    matches.push({
      team1: teams[i],
      team2: teams[i + 1],
      courtIndex: Math.floor(i / 2) % courtsCount,
    });
  }

  return { matches };
}

// ── Sobe e Desce (Céu Inferno) Format ──

export interface SobeDesceRoundResult {
  matches: {
    team1: [string, string];
    team2: [string, string];
    courtIndex: number; // 0 = best court, N-1 = worst court
  }[];
}

/**
 * Generate Round 1 of a Sobe e Desce tournament.
 * Random distribution of players across courts.
 * Each court gets 4 players, randomly paired into 2 teams.
 */
export function generateSobeDesceRound1(
  playerIds: string[],
  courtsCount: number,
  seed?: string
): SobeDesceRoundResult {
  const n = playerIds.length;
  if (n < 4 || n % 4 !== 0) {
    throw new Error("É necessário um múltiplo de 4 jogadores para o formato Sobe e Desce.");
  }
  if (n / 4 > courtsCount) {
    throw new Error(`São necessários pelo menos ${n / 4} campos para ${n} jogadores.`);
  }

  const rng = seedrandom(seed || "sobedesce-r1");
  const shuffled = [...playerIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const matches: SobeDesceRoundResult["matches"] = [];
  const playersPerCourt = 4;
  const numCourts = Math.min(n / playersPerCourt, courtsCount);

  for (let c = 0; c < numCourts; c++) {
    const base = c * playersPerCourt;
    matches.push({
      team1: [shuffled[base], shuffled[base + 1]],
      team2: [shuffled[base + 2], shuffled[base + 3]],
      courtIndex: c,
    });
  }

  return { matches };
}

/**
 * Generate next round of Sobe e Desce based on previous round results.
 *
 * Logic per court (after round N):
 * - Court 0 (best): Winners stay at court 0, losers go to court 1
 * - Court K (middle): Winners from court K go to court K-1, losers go to court K+1
 * - Court N-1 (worst): Winners go to court N-2, losers stay at court N-1
 *
 * Then within each court, the 4 players are randomly paired into 2v2.
 */
export function generateNextSobeDesceRound(
  previousRoundMatches: {
    courtIndex: number;
    team1: [string, string];
    team2: [string, string];
    winnerTeam: 1 | 2;
  }[],
  courtsCount: number,
  roundIndex: number
): SobeDesceRoundResult {
  const sorted = [...previousRoundMatches].sort((a, b) => a.courtIndex - b.courtIndex);
  const numCourts = sorted.length;

  const courtWinners: [string, string][] = [];
  const courtLosers: [string, string][] = [];

  for (const match of sorted) {
    if (match.winnerTeam === 1) {
      courtWinners.push(match.team1);
      courtLosers.push(match.team2);
    } else {
      courtWinners.push(match.team2);
      courtLosers.push(match.team1);
    }
  }

  const newCourtPlayers: string[][] = Array.from({ length: numCourts }, () => []);

  for (let c = 0; c < numCourts; c++) {
    const winners = courtWinners[c];
    const losers = courtLosers[c];

    if (c === 0) {
      newCourtPlayers[0].push(...winners);
      if (numCourts > 1) {
        newCourtPlayers[1].push(...losers);
      } else {
        newCourtPlayers[0].push(...losers);
      }
    } else if (c === numCourts - 1) {
      newCourtPlayers[c].push(...losers);
      newCourtPlayers[c - 1].push(...winners);
    } else {
      newCourtPlayers[c - 1].push(...winners);
      newCourtPlayers[c + 1].push(...losers);
    }
  }

  const rng = seedrandom(`sobedesce-r${roundIndex}`);
  const matches: SobeDesceRoundResult["matches"] = [];

  for (let c = 0; c < numCourts; c++) {
    const players = newCourtPlayers[c];
    if (players.length !== 4) {
      throw new Error(`Campo ${c + 1} ficou com ${players.length} jogadores em vez de 4. Verifique a configuração.`);
    }

    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }

    matches.push({
      team1: [players[0], players[1]],
      team2: [players[2], players[3]],
      courtIndex: c,
    });
  }

  return { matches };
}

export function generateRandomTeams(
  playerIds: string[],
  seed: string
): { player1Id: string; player2Id: string }[] {
  if (playerIds.length % 2 !== 0) {
    throw new Error("Número ímpar de jogadores. É necessário um número par para formar equipas de 2.");
  }

  const rng = seedrandom(seed);
  const shuffled = [...playerIds];

  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const teams: { player1Id: string; player2Id: string }[] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    teams.push({ player1Id: shuffled[i], player2Id: shuffled[i + 1] });
  }

  return teams;
}
