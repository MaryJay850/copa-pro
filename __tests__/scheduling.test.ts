import { describe, it, expect } from "vitest";
import {
  generateRoundRobinPairings,
  generateRandomTeams,
} from "../src/lib/scheduling";
function makeTeams(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `team-${i + 1}`,
    index: i,
  }));
}
describe("generateRoundRobinPairings", () => {
  it("generates correct number of pairings for 4 teams single RR", () => {
    const teams = makeTeams(4);
    const pairings = generateRoundRobinPairings(teams, 2, 1);
    // 4 teams = C(4,2) = 6 matches
    expect(pairings.length).toBe(6);
  });
  it("generates correct number of pairings for 4 teams double RR", () => {
    const teams = makeTeams(4);
    const pairings = generateRoundRobinPairings(teams, 2, 2);
    // Double RR = 12 matches
    expect(pairings.length).toBe(12);
  });
  it("generates correct number of pairings for 6 teams single RR", () => {
    const teams = makeTeams(6);
    const pairings = generateRoundRobinPairings(teams, 3, 1);
    // 6 teams = C(6,2) = 15 matches
    expect(pairings.length).toBe(15);
  });
  it("ensures no team plays twice in the same round", () => {
    const teams = makeTeams(6);
    const pairings = generateRoundRobinPairings(teams, 2, 1);
    // Group by roundIndex
    const roundMap = new Map<number, typeof pairings>();
    for (const p of pairings) {
      const arr = roundMap.get(p.roundIndex) || [];
      arr.push(p);
      roundMap.set(p.roundIndex, arr);
    }
    for (const [roundIdx, matches] of roundMap) {
      const teamsInRound = new Set<string>();
      for (const m of matches) {
        expect(teamsInRound.has(m.teamA.id)).toBe(false);
        expect(teamsInRound.has(m.teamB.id)).toBe(false);
        teamsInRound.add(m.teamA.id);
        teamsInRound.add(m.teamB.id);
      }
    }
  });
  it("respects court count limit per round", () => {
    const teams = makeTeams(6);
    const courtsCount = 2;
    const pairings = generateRoundRobinPairings(teams, courtsCount, 1);
    const roundMap = new Map<number, number>();
    for (const p of pairings) {
      roundMap.set(p.roundIndex, (roundMap.get(p.roundIndex) || 0) + 1);
    }
    for (const [, count] of roundMap) {
      expect(count).toBeLessThanOrEqual(courtsCount);
    }
  });
  it("handles 2 teams correctly", () => {
    const teams = makeTeams(2);
    const pairings = generateRoundRobinPairings(teams, 1, 1);
    expect(pairings.length).toBe(1);
    expect(pairings[0].teamA.id).toBe("team-1");
    expect(pairings[0].teamB.id).toBe("team-2");
  });
  it("handles 3 teams (odd) with bye", () => {
    const teams = makeTeams(3);
    const pairings = generateRoundRobinPairings(teams, 1, 1);
    // C(3,2) = 3 matches
    expect(pairings.length).toBe(3);
  });
  it("produces deterministic results with same seed", () => {
    const teams = makeTeams(6);
    const p1 = generateRoundRobinPairings(teams, 2, 1, "test-seed");
    const p2 = generateRoundRobinPairings(teams, 2, 1, "test-seed");
    expect(p1.length).toBe(p2.length);
    for (let i = 0; i < p1.length; i++) {
      expect(p1[i].teamA.id).toBe(p2[i].teamA.id);
      expect(p1[i].teamB.id).toBe(p2[i].teamB.id);
      expect(p1[i].roundIndex).toBe(p2[i].roundIndex);
    }
  });
  it("returns empty for less than 2 teams", () => {
    expect(generateRoundRobinPairings(makeTeams(1), 1, 1).length).toBe(0);
    expect(generateRoundRobinPairings([], 1, 1).length).toBe(0);
  });
  it("all team pairs appear exactly once in single RR", () => {
    const teams = makeTeams(4);
    const pairings = generateRoundRobinPairings(teams, 2, 1);
    const pairSet = new Set<string>();
    for (const p of pairings) {
      const key = [p.teamA.id, p.teamB.id].sort().join("-");
      expect(pairSet.has(key)).toBe(false);
      pairSet.add(key);
    }
    // Should have all C(4,2)=6 pairs
    expect(pairSet.size).toBe(6);
  });
  it("all team pairs appear exactly twice in double RR", () => {
    const teams = makeTeams(4);
    const pairings = generateRoundRobinPairings(teams, 2, 2);
    const pairCount = new Map<string, number>();
    for (const p of pairings) {
      const key = [p.teamA.id, p.teamB.id].sort().join("-");
      pairCount.set(key, (pairCount.get(key) || 0) + 1);
    }
    for (const [, count] of pairCount) {
      expect(count).toBe(2);
    }
  });
});
describe("generateRandomTeams", () => {
  it("generates correct number of teams", () => {
    const players = ["p1", "p2", "p3", "p4", "p5", "p6"];
    const teams = generateRandomTeams(players, "seed1");
    expect(teams.length).toBe(3);
  });
  it("throws for odd number of players", () => {
    expect(() => generateRandomTeams(["p1", "p2", "p3"], "seed1")).toThrow();
  });
  it("is deterministic with same seed", () => {
    const players = ["p1", "p2", "p3", "p4", "p5", "p6"];
    const t1 = generateRandomTeams(players, "seed1");
    const t2 = generateRandomTeams(players, "seed1");
    expect(t1).toEqual(t2);
  });
  it("produces different results with different seeds", () => {
    const players = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"];
    const t1 = generateRandomTeams(players, "seedA");
    const t2 = generateRandomTeams(players, "seedB");
    // Extremely unlikely to be the same with 8 players
    const same = t1.every(
      (team, i) =>
        team.player1Id === t2[i].player1Id &&
        team.player2Id === t2[i].player2Id
    );
    expect(same).toBe(false);
  });
  it("includes all players exactly once", () => {
    const players = ["p1", "p2", "p3", "p4"];
    const teams = generateRandomTeams(players, "seed1");
    const allPlayers = teams.flatMap((t) => [t.player1Id, t.player2Id]);
    expect(allPlayers.sort()).toEqual(players.sort());
  });
});