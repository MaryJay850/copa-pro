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
 * Generate random teams from a list of players.
 * Requires even number of players.
 */
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
