import { describe, it, expect } from "vitest";
import {
  computeMatchContribution,
  aggregateRankings,
  sortRankings,
  validateMatchScores,
  determineResult,
  parseSets,
  countSetsWon,
  type MatchData,
} from "../src/lib/ranking";

function makeMatch(overrides: Partial<MatchData> = {}): MatchData {
  return {
    set1A: 6,
    set1B: 3,
    set2A: 6,
    set2B: 4,
    set3A: null,
    set3B: null,
    status: "FINISHED",
    resultType: "WIN_A",
    teamAId: "teamA",
    teamBId: "teamB",
    teamA: { player1Id: "p1", player2Id: "p2" },
    teamB: { player1Id: "p3", player2Id: "p4" },
    ...overrides,
  };
}

describe("parseSets", () => {
  it("parses 2 sets", () => {
    const match = makeMatch();
    const sets = parseSets(match);
    expect(sets.length).toBe(2);
    expect(sets[0]).toEqual({ scoreA: 6, scoreB: 3, winnerSide: "A" });
    expect(sets[1]).toEqual({ scoreA: 6, scoreB: 4, winnerSide: "A" });
  });

  it("parses 3 sets", () => {
    const match = makeMatch({ set3A: 7, set3B: 5 });
    const sets = parseSets(match);
    expect(sets.length).toBe(3);
  });

  it("ignores null sets", () => {
    const match = makeMatch({ set2A: null, set2B: null });
    const sets = parseSets(match);
    expect(sets.length).toBe(1);
  });
});

describe("countSetsWon", () => {
  it("counts correctly for 2-0", () => {
    const sets = parseSets(makeMatch());
    const { setsA, setsB } = countSetsWon(sets);
    expect(setsA).toBe(2);
    expect(setsB).toBe(0);
  });

  it("counts correctly for 2-1", () => {
    const match = makeMatch({
      set1A: 4, set1B: 6,
      set2A: 6, set2B: 3,
      set3A: 6, set3B: 4,
      resultType: "WIN_A",
    });
    const sets = parseSets(match);
    const { setsA, setsB } = countSetsWon(sets);
    expect(setsA).toBe(2);
    expect(setsB).toBe(1);
  });
});

describe("computeMatchContribution", () => {
  it("awards correct points for 2-0 win", () => {
    // Team A wins 6-3, 6-4 (2 sets won)
    const match = makeMatch();
    const deltas = computeMatchContribution(match, false);

    expect(deltas.length).toBe(4);

    // Team A players: 2 sets * 2 = 4 set points + 3 match win = 7
    const p1 = deltas.find((d) => d.playerId === "p1")!;
    expect(p1.points).toBe(7);
    expect(p1.wins).toBe(1);
    expect(p1.setsWon).toBe(2);
    expect(p1.setsLost).toBe(0);

    // Team B players: 0 sets * 2 = 0 set points + 0 loss = 0
    const p3 = deltas.find((d) => d.playerId === "p3")!;
    expect(p3.points).toBe(0);
    expect(p3.losses).toBe(1);
    expect(p3.setsWon).toBe(0);
    expect(p3.setsLost).toBe(2);
  });

  it("awards correct points for 2-1 win", () => {
    // Team A wins 4-6, 6-3, 6-4
    const match = makeMatch({
      set1A: 4, set1B: 6,
      set2A: 6, set2B: 3,
      set3A: 6, set3B: 4,
      resultType: "WIN_A",
    });
    const deltas = computeMatchContribution(match, false);

    // Team A: 2 sets * 2 = 4 + 3 win = 7
    const p1 = deltas.find((d) => d.playerId === "p1")!;
    expect(p1.points).toBe(7);
    expect(p1.setsWon).toBe(2);
    expect(p1.setsLost).toBe(1);

    // Team B: 1 set * 2 = 2 + 0 loss = 2
    const p3 = deltas.find((d) => d.playerId === "p3")!;
    expect(p3.points).toBe(2);
    expect(p3.setsWon).toBe(1);
    expect(p3.setsLost).toBe(2);
  });

  it("awards correct points for draw", () => {
    // 1-1 in sets, draw result
    const match = makeMatch({
      set1A: 6, set1B: 3,
      set2A: 3, set2B: 6,
      set3A: null, set3B: null,
      resultType: "DRAW",
    });
    const deltas = computeMatchContribution(match, true);

    // Each team won 1 set: 1*2 = 2 set points + 1 draw point = 3
    const p1 = deltas.find((d) => d.playerId === "p1")!;
    expect(p1.points).toBe(3);
    expect(p1.draws).toBe(1);
    expect(p1.wins).toBe(0);

    const p3 = deltas.find((d) => d.playerId === "p3")!;
    expect(p3.points).toBe(3);
    expect(p3.draws).toBe(1);
  });

  it("returns empty for non-finished match", () => {
    const match = makeMatch({ status: "SCHEDULED" });
    expect(computeMatchContribution(match, false)).toEqual([]);
  });

  it("awards both players on same team equally", () => {
    const match = makeMatch();
    const deltas = computeMatchContribution(match, false);
    const p1 = deltas.find((d) => d.playerId === "p1")!;
    const p2 = deltas.find((d) => d.playerId === "p2")!;
    expect(p1.points).toBe(p2.points);
    expect(p1.wins).toBe(p2.wins);
    expect(p1.setsWon).toBe(p2.setsWon);
  });
});

describe("aggregateRankings", () => {
  it("aggregates multiple matches correctly", () => {
    const match1 = makeMatch();
    const match2 = makeMatch({
      set1A: 3, set1B: 6,
      set2A: 4, set2B: 6,
      resultType: "WIN_B",
    });

    const d1 = computeMatchContribution(match1, false);
    const d2 = computeMatchContribution(match2, false);
    const rankings = aggregateRankings([...d1, ...d2]);

    const p1 = rankings.find((r) => r.playerId === "p1")!;
    // Match 1: 7 points (win 2-0), Match 2: 0 points (loss 0-2)
    expect(p1.pointsTotal).toBe(7);
    expect(p1.matchesPlayed).toBe(2);
    expect(p1.wins).toBe(1);
    expect(p1.losses).toBe(1);
    expect(p1.setsWon).toBe(2);
    expect(p1.setsLost).toBe(2);
    expect(p1.setsDiff).toBe(0);
  });
});

describe("sortRankings", () => {
  it("sorts by pointsTotal first", () => {
    const entries = [
      { playerId: "a", pointsTotal: 5, wins: 1, draws: 0, losses: 1, setsWon: 3, setsLost: 2, setsDiff: 1, matchesPlayed: 2 },
      { playerId: "b", pointsTotal: 10, wins: 2, draws: 0, losses: 0, setsWon: 4, setsLost: 1, setsDiff: 3, matchesPlayed: 2 },
    ];
    const sorted = sortRankings(entries);
    expect(sorted[0].playerId).toBe("b");
  });

  it("uses wins as tiebreaker", () => {
    const entries = [
      { playerId: "a", pointsTotal: 10, wins: 1, draws: 2, losses: 0, setsWon: 3, setsLost: 2, setsDiff: 1, matchesPlayed: 3 },
      { playerId: "b", pointsTotal: 10, wins: 2, draws: 0, losses: 1, setsWon: 3, setsLost: 2, setsDiff: 1, matchesPlayed: 3 },
    ];
    const sorted = sortRankings(entries);
    expect(sorted[0].playerId).toBe("b");
  });

  it("uses setsDiff as second tiebreaker", () => {
    const entries = [
      { playerId: "a", pointsTotal: 10, wins: 2, draws: 0, losses: 1, setsWon: 4, setsLost: 3, setsDiff: 1, matchesPlayed: 3 },
      { playerId: "b", pointsTotal: 10, wins: 2, draws: 0, losses: 1, setsWon: 5, setsLost: 2, setsDiff: 3, matchesPlayed: 3 },
    ];
    const sorted = sortRankings(entries);
    expect(sorted[0].playerId).toBe("b");
  });
});

describe("validateMatchScores", () => {
  // ── 3 Sets (Best of 3) ──
  it("accepts valid 2-0 result (3 sets)", () => {
    expect(validateMatchScores(6, 3, 6, 4, null, null, false, 3)).toBeNull();
  });

  it("accepts valid 2-1 result (3 sets)", () => {
    expect(validateMatchScores(6, 3, 3, 6, 7, 5, false, 3)).toBeNull();
  });

  it("rejects tied set scores", () => {
    const err = validateMatchScores(6, 6, 6, 3, null, null, false, 3);
    expect(err).not.toBeNull();
  });

  it("rejects only 1 set in 3-set format", () => {
    const err = validateMatchScores(6, 3, null, null, null, null, false, 3);
    expect(err).not.toBeNull();
  });

  it("rejects unnecessary 3rd set when match is decided", () => {
    const err = validateMatchScores(6, 3, 6, 4, 6, 3, false, 3);
    expect(err).not.toBeNull();
  });

  it("rejects draw when allowDraws is off", () => {
    const err = validateMatchScores(6, 3, 3, 6, null, null, false, 3);
    expect(err).not.toBeNull();
  });

  it("accepts draw when allowDraws is on", () => {
    expect(validateMatchScores(6, 3, 3, 6, null, null, true, 3)).toBeNull();
  });

  it("rejects invalid score values", () => {
    const err = validateMatchScores(10, 3, 6, 4, null, null, false, 3);
    expect(err).not.toBeNull();
  });

  it("rejects negative scores", () => {
    const err = validateMatchScores(-1, 3, 6, 4, null, null, false, 3);
    expect(err).not.toBeNull();
  });

  // ── 1 Set ──
  it("accepts valid 1-set result", () => {
    expect(validateMatchScores(6, 3, null, null, null, null, false, 1)).toBeNull();
  });

  it("rejects extra sets in 1-set format", () => {
    const err = validateMatchScores(6, 3, 6, 4, null, null, false, 1);
    expect(err).not.toBeNull();
  });

  it("rejects missing set1 in 1-set format", () => {
    const err = validateMatchScores(null, null, null, null, null, null, false, 1);
    expect(err).not.toBeNull();
  });

  // ── 2 Sets ──
  it("accepts valid 2-set result (2-0)", () => {
    expect(validateMatchScores(6, 3, 6, 4, null, null, false, 2)).toBeNull();
  });

  it("accepts 1-1 draw in 2-set format when allowed", () => {
    expect(validateMatchScores(6, 3, 3, 6, null, null, true, 2)).toBeNull();
  });

  it("rejects 1-1 draw in 2-set format when not allowed", () => {
    const err = validateMatchScores(6, 3, 3, 6, null, null, false, 2);
    expect(err).not.toBeNull();
  });

  it("rejects 3rd set in 2-set format", () => {
    const err = validateMatchScores(6, 3, 3, 6, 6, 4, false, 2);
    expect(err).not.toBeNull();
  });

  it("rejects missing set2 in 2-set format", () => {
    const err = validateMatchScores(6, 3, null, null, null, null, false, 2);
    expect(err).not.toBeNull();
  });
});

describe("determineResult", () => {
  it("determines WIN_A for 2-0 (3 sets)", () => {
    const r = determineResult(6, 3, 6, 4, null, null, false, 3);
    expect(r.resultType).toBe("WIN_A");
    expect(r.setsA).toBe(2);
    expect(r.setsB).toBe(0);
  });

  it("determines WIN_B for 0-2 (3 sets)", () => {
    const r = determineResult(3, 6, 4, 6, null, null, false, 3);
    expect(r.resultType).toBe("WIN_B");
  });

  it("determines WIN_A for 2-1 (3 sets)", () => {
    const r = determineResult(6, 3, 3, 6, 6, 4, false, 3);
    expect(r.resultType).toBe("WIN_A");
    expect(r.setsA).toBe(2);
    expect(r.setsB).toBe(1);
  });

  it("determines DRAW when allowed (3 sets)", () => {
    const r = determineResult(6, 3, 3, 6, null, null, true, 3);
    expect(r.resultType).toBe("DRAW");
  });

  it("determines UNDECIDED when draw not allowed and tied", () => {
    const r = determineResult(6, 3, 3, 6, null, null, false, 3);
    expect(r.resultType).toBe("UNDECIDED");
  });

  // ── 1 Set ──
  it("determines WIN_A for 1-set win", () => {
    const r = determineResult(6, 3, null, null, null, null, false, 1);
    expect(r.resultType).toBe("WIN_A");
    expect(r.setsA).toBe(1);
    expect(r.setsB).toBe(0);
  });

  it("determines WIN_B for 1-set win", () => {
    const r = determineResult(3, 6, null, null, null, null, false, 1);
    expect(r.resultType).toBe("WIN_B");
  });

  // ── 2 Sets ──
  it("determines WIN_A for 2-0 (2 sets)", () => {
    const r = determineResult(6, 3, 6, 4, null, null, false, 2);
    expect(r.resultType).toBe("WIN_A");
    expect(r.setsA).toBe(2);
  });

  it("determines DRAW for 1-1 (2 sets, draws allowed)", () => {
    const r = determineResult(6, 3, 3, 6, null, null, true, 2);
    expect(r.resultType).toBe("DRAW");
  });
});
