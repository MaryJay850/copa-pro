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
