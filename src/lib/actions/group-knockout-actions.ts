"use server";

import { prisma } from "../db";
import { requireLeagueManager } from "../auth-guards";
import { generateRoundRobinPairings, type TeamRef } from "../scheduling";
import { revalidatePath } from "next/cache";

// ── Group Standings ──

interface TeamStanding {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  setsDiff: number;
  gamesWon: number;
  gamesLost: number;
  gamesDiff: number;
  points: number;
}

export async function getGroupStandings(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      groups: {
        include: {
          entries: { include: { team: true } },
        },
        orderBy: { index: "asc" },
      },
      matches: {
        where: { bracketPhase: "GROUP" },
        include: { teamA: true, teamB: true },
      },
    },
  });

  if (!tournament) throw new Error("Torneio não encontrado.");

  const pointsWin = tournament.pointsWin ?? 3;
  const pointsDraw = tournament.pointsDraw ?? 1;
  const pointsLoss = tournament.pointsLoss ?? 0;

  const criteria: string[] = tournament.tiebreakerCriteria
    ? JSON.parse(tournament.tiebreakerCriteria)
    : ["POINTS", "SETS_DIFF", "GAMES_DIFF", "SETS_WON", "GAMES_WON", "HEAD_TO_HEAD", "RANDOM"];

  const groupStandings: { groupId: string; groupName: string; standings: TeamStanding[] }[] = [];

  for (const group of tournament.groups) {
    const teamIds = new Set(group.entries.map((e) => e.teamId));
    const standings = new Map<string, TeamStanding>();

    // Init standings for all teams
    for (const entry of group.entries) {
      standings.set(entry.teamId, {
        teamId: entry.teamId,
        teamName: entry.team.name,
        played: 0, wins: 0, draws: 0, losses: 0,
        setsWon: 0, setsLost: 0, setsDiff: 0,
        gamesWon: 0, gamesLost: 0, gamesDiff: 0,
        points: 0,
      });
    }

    // Process matches for this group
    const groupMatches = tournament.matches.filter(
      (m) => teamIds.has(m.teamAId) && teamIds.has(m.teamBId) && m.status === "FINISHED"
    );

    for (const match of groupMatches) {
      const sA = standings.get(match.teamAId)!;
      const sB = standings.get(match.teamBId)!;
      if (!sA || !sB) continue;

      sA.played++;
      sB.played++;

      // Count sets
      let setsA = 0, setsB = 0;
      let gamesA = 0, gamesB = 0;
      for (let s = 1; s <= 3; s++) {
        const a = (match as any)[`set${s}A`] as number | null;
        const b = (match as any)[`set${s}B`] as number | null;
        if (a === null || b === null) continue;
        gamesA += a;
        gamesB += b;
        if (a > b) setsA++;
        else if (b > a) setsB++;
      }

      sA.setsWon += setsA; sA.setsLost += setsB;
      sB.setsWon += setsB; sB.setsLost += setsA;
      sA.gamesWon += gamesA; sA.gamesLost += gamesB;
      sB.gamesWon += gamesB; sB.gamesLost += gamesA;

      // Determine winner
      if (match.resultType === "DRAW") {
        sA.draws++; sB.draws++;
        sA.points += pointsDraw; sB.points += pointsDraw;
      } else if (match.winnerTeamId === match.teamAId) {
        sA.wins++; sB.losses++;
        sA.points += pointsWin; sB.points += pointsLoss;
      } else if (match.winnerTeamId === match.teamBId) {
        sB.wins++; sA.losses++;
        sB.points += pointsWin; sA.points += pointsLoss;
      }
    }

    // Calculate differentials
    for (const s of standings.values()) {
      s.setsDiff = s.setsWon - s.setsLost;
      s.gamesDiff = s.gamesWon - s.gamesLost;
    }

    // Sort by tiebreaker criteria
    const sorted = Array.from(standings.values()).sort((a, b) => {
      for (const criterion of criteria) {
        let diff = 0;
        switch (criterion) {
          case "POINTS": diff = b.points - a.points; break;
          case "WINS": diff = b.wins - a.wins; break;
          case "HEAD_TO_HEAD": {
            // Find direct match between a and b
            const directMatch = groupMatches.find(
              (m) => (m.teamAId === a.teamId && m.teamBId === b.teamId) ||
                     (m.teamAId === b.teamId && m.teamBId === a.teamId)
            );
            if (directMatch?.winnerTeamId === a.teamId) diff = -1;
            else if (directMatch?.winnerTeamId === b.teamId) diff = 1;
            break;
          }
          case "SETS_DIFF": diff = b.setsDiff - a.setsDiff; break;
          case "GAMES_DIFF": diff = b.gamesDiff - a.gamesDiff; break;
          case "SETS_WON": diff = b.setsWon - a.setsWon; break;
          case "GAMES_WON": diff = b.gamesWon - a.gamesWon; break;
          case "RANDOM": diff = Math.random() - 0.5; break;
        }
        if (diff !== 0) return diff;
      }
      return 0;
    });

    groupStandings.push({
      groupId: group.id,
      groupName: group.name,
      standings: sorted,
    });
  }

  return JSON.parse(JSON.stringify(groupStandings));
}

// ── Generate Group Schedule ──

export async function generateGroupSchedule(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      groups: {
        include: { entries: { include: { team: true } } },
        orderBy: { index: "asc" },
      },
      tournamentCourts: { include: { court: true }, orderBy: { court: { orderIndex: "asc" } } },
      courts: true,
    },
  });

  if (!tournament) throw new Error("Torneio não encontrado.");
  await requireLeagueManager(tournament.leagueId ?? "");

  if (tournament.format !== "GROUP_KNOCKOUT") {
    throw new Error("Este torneio nao e do formato Fase de Grupos + Eliminatorias.");
  }

  // Delete existing group matches and rounds
  await prisma.match.deleteMany({ where: { tournamentId, bracketPhase: "GROUP" } });
  await prisma.round.deleteMany({ where: { tournamentId } });

  const courts = tournament.tournamentCourts.length > 0
    ? tournament.tournamentCourts.map((tc) => tc.court)
    : tournament.courts;

  const seed = tournament.randomSeed || "default";
  const numberOfSets = tournament.numberOfSets;

  let globalRoundIndex = 0;

  for (const group of tournament.groups) {
    const teamRefs: TeamRef[] = group.entries.map((e, i) => ({
      id: e.teamId,
      index: i,
    }));

    if (teamRefs.length < 2) continue;

    // Get courts for this group (filter by groupLabel if set)
    const groupCourtsFromLabel = tournament.tournamentCourts
      .filter((tc) => tc.groupLabel === String.fromCharCode(65 + group.index)) // "A", "B", "C"...
      .map((tc) => tc.court);

    const groupCourts = groupCourtsFromLabel.length > 0
      ? groupCourtsFromLabel
      : courts; // fallback: use all courts

    const pairings = generateRoundRobinPairings(
      teamRefs,
      groupCourts.length,
      tournament.matchesPerPair,
      seed + `_G${group.index}`
    );

    for (const p of pairings) {
      const roundIndex = p.roundIndex + globalRoundIndex;

      // Create round if needed
      let round = await prisma.round.findUnique({
        where: { tournamentId_index: { tournamentId, index: roundIndex } },
      });
      if (!round) {
        round = await prisma.round.create({
          data: { tournamentId, index: roundIndex },
        });
      }

      const courtId = groupCourts[p.courtIndex]?.id || null;

      await prisma.match.create({
        data: {
          tournamentId,
          roundId: round.id,
          courtId,
          slotIndex: p.slotIndex,
          teamAId: p.teamA.id,
          teamBId: p.teamB.id,
          status: "SCHEDULED",
          resultType: "UNDECIDED",
          bracketPhase: "GROUP",
          bracketIndex: group.index,
        },
      });
    }

    // Offset round indices for next group if needed
    if (pairings.length > 0) {
      const maxPairingRound = Math.max(...pairings.map((p) => p.roundIndex));
      globalRoundIndex += maxPairingRound;
    }
  }

  // Update tournament phase
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { currentPhase: "GROUPS", status: "RUNNING" },
  });

  revalidatePath(`/torneios/${tournamentId}`);
}

// ── Advance to Knockout ──

export async function advanceToKnockout(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      matches: true,
      groups: {
        include: { entries: { include: { team: true } } },
        orderBy: { index: "asc" },
      },
      tournamentCourts: { include: { court: true } },
    },
  });

  if (!tournament) throw new Error("Torneio não encontrado.");
  await requireLeagueManager(tournament.leagueId ?? "");

  if (tournament.format !== "GROUP_KNOCKOUT") {
    throw new Error("Este torneio nao e do formato Fase de Grupos + Eliminatorias.");
  }

  // Check all group matches are finished
  const groupMatches = tournament.matches.filter((m) => m.bracketPhase === "GROUP");
  const unfinished = groupMatches.filter((m) => m.status !== "FINISHED");
  if (unfinished.length > 0) {
    throw new Error(`Ainda existem ${unfinished.length} jogos de grupo por terminar.`);
  }

  // Get standings
  const standings = await getGroupStandings(tournamentId);
  const teamsAdvancing = tournament.teamsAdvancing || 1;

  // Collect advancing teams (top N from each group)
  const advancingTeams: { teamId: string; groupIndex: number; position: number }[] = [];
  for (const gs of standings) {
    const group = tournament.groups.find((g) => g.id === gs.groupId)!;
    for (let i = 0; i < Math.min(teamsAdvancing, gs.standings.length); i++) {
      advancingTeams.push({
        teamId: gs.standings[i].teamId,
        groupIndex: group.index,
        position: i + 1,
      });
    }
  }

  const totalAdvancing = advancingTeams.length;

  // Shuffle for random seeding
  const rng = () => Math.random(); // Could use seedrandom for reproducibility
  for (let i = advancingTeams.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [advancingTeams[i], advancingTeams[j]] = [advancingTeams[j], advancingTeams[i]];
  }

  // Delete existing knockout matches
  await prisma.match.deleteMany({
    where: { tournamentId, bracketPhase: { in: ["QF", "SF", "FINAL", "THIRD_PLACE"] } },
  });

  // Determine bracket structure
  const hasQF = tournament.hasQuarterFinals && totalAdvancing >= 8;
  const hasSF = tournament.hasSemiFinals && totalAdvancing >= 4;

  // Get courts for knockout phases
  const getKnockoutCourts = (phase: string) => {
    const phaseCourts = tournament.tournamentCourts
      .filter((tc) => tc.groupLabel === phase)
      .map((tc) => tc.court);
    if (phaseCourts.length > 0) return phaseCourts;
    // Fallback: use all tournament courts
    return tournament.tournamentCourts.map((tc) => tc.court);
  };

  // Get max round index
  const lastRound = await prisma.round.findFirst({
    where: { tournamentId },
    orderBy: { index: "desc" },
  });
  let nextRoundIndex = (lastRound?.index || 0) + 1;

  // Create knockout matches
  if (hasQF) {
    const qfRound = await prisma.round.create({
      data: { tournamentId, index: nextRoundIndex++ },
    });
    const qfCourts = getKnockoutCourts("QF");
    for (let i = 0; i < 4; i++) {
      const teamA = advancingTeams[i * 2];
      const teamB = advancingTeams[i * 2 + 1];
      await prisma.match.create({
        data: {
          tournamentId,
          roundId: qfRound.id,
          courtId: qfCourts[i % qfCourts.length]?.id || null,
          slotIndex: i,
          teamAId: teamA.teamId,
          teamBId: teamB.teamId,
          status: "SCHEDULED",
          resultType: "UNDECIDED",
          bracketPhase: "QF",
          bracketIndex: i,
          ...(tournament.knockoutSets ? {} : {}),
        },
      });
    }
  }

  if (hasSF && !hasQF) {
    // SF directly from group stage (4 teams)
    const sfRound = await prisma.round.create({
      data: { tournamentId, index: nextRoundIndex++ },
    });
    const sfCourts = getKnockoutCourts("SF");
    for (let i = 0; i < 2; i++) {
      const teamA = advancingTeams[i * 2];
      const teamB = advancingTeams[i * 2 + 1];
      await prisma.match.create({
        data: {
          tournamentId,
          roundId: sfRound.id,
          courtId: sfCourts[i % sfCourts.length]?.id || null,
          slotIndex: i,
          teamAId: teamA.teamId,
          teamBId: teamB.teamId,
          status: "SCHEDULED",
          resultType: "UNDECIDED",
          bracketPhase: "SF",
          bracketIndex: i,
        },
      });
    }
  } else if (hasSF && hasQF) {
    // SF: placeholder matches — will be filled when QF finishes
    // For now, create with first available teams (will be updated on QF completion)
    const sfRound = await prisma.round.create({
      data: { tournamentId, index: nextRoundIndex++ },
    });
    const sfCourts = getKnockoutCourts("SF");
    // We need placeholder teams — use first 4 advancing as placeholders
    // They'll be overwritten when QF results come in
    for (let i = 0; i < 2; i++) {
      await prisma.match.create({
        data: {
          tournamentId,
          roundId: sfRound.id,
          courtId: sfCourts[i % sfCourts.length]?.id || null,
          slotIndex: i,
          teamAId: advancingTeams[0].teamId, // Placeholder
          teamBId: advancingTeams[1].teamId, // Placeholder
          status: "PENDING_TEAMS",
          resultType: "UNDECIDED",
          bracketPhase: "SF",
          bracketIndex: i,
        },
      });
    }
  }

  if (!hasQF && !hasSF && totalAdvancing === 2) {
    // Direct final
    const finalRound = await prisma.round.create({
      data: { tournamentId, index: nextRoundIndex++ },
    });
    const finalCourts = getKnockoutCourts("FINAL");
    await prisma.match.create({
      data: {
        tournamentId,
        roundId: finalRound.id,
        courtId: finalCourts[0]?.id || null,
        slotIndex: 0,
        teamAId: advancingTeams[0].teamId,
        teamBId: advancingTeams[1].teamId,
        status: "SCHEDULED",
        resultType: "UNDECIDED",
        bracketPhase: "FINAL",
        bracketIndex: 0,
      },
    });
  } else if (hasSF || hasQF) {
    // Final placeholder
    const finalRound = await prisma.round.create({
      data: { tournamentId, index: nextRoundIndex++ },
    });
    const finalCourts = getKnockoutCourts("FINAL");
    await prisma.match.create({
      data: {
        tournamentId,
        roundId: finalRound.id,
        courtId: finalCourts[0]?.id || null,
        slotIndex: 0,
        teamAId: advancingTeams[0].teamId, // Placeholder
        teamBId: advancingTeams[1].teamId, // Placeholder
        status: "PENDING_TEAMS",
        resultType: "UNDECIDED",
        bracketPhase: "FINAL",
        bracketIndex: 0,
      },
    });

    // 3rd place match if configured
    if (tournament.hasThirdPlace && hasSF) {
      await prisma.match.create({
        data: {
          tournamentId,
          roundId: finalRound.id,
          courtId: finalCourts[0]?.id || null,
          slotIndex: 1,
          teamAId: advancingTeams[0].teamId, // Placeholder
          teamBId: advancingTeams[1].teamId, // Placeholder
          status: "PENDING_TEAMS",
          resultType: "UNDECIDED",
          bracketPhase: "THIRD_PLACE",
          bracketIndex: 0,
        },
      });
    }
  }

  // Update tournament phase
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { currentPhase: "KNOCKOUT" },
  });

  revalidatePath(`/torneios/${tournamentId}`);
}

// ── Progress Bracket (called when a knockout match finishes) ──

export async function progressBracket(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { tournament: true },
  });

  if (!match || !match.winnerTeamId || !match.bracketPhase) return;

  const tournamentId = match.tournamentId;

  if (match.bracketPhase === "QF") {
    // QF winner advances to SF
    const sfMatches = await prisma.match.findMany({
      where: { tournamentId, bracketPhase: "SF" },
      orderBy: { bracketIndex: "asc" },
    });

    // QF0 winner -> SF0 teamA, QF1 winner -> SF0 teamB
    // QF2 winner -> SF1 teamA, QF3 winner -> SF1 teamB
    const sfIndex = Math.floor(match.bracketIndex! / 2);
    const isTeamA = match.bracketIndex! % 2 === 0;
    const sfMatch = sfMatches[sfIndex];

    if (sfMatch) {
      await prisma.match.update({
        where: { id: sfMatch.id },
        data: {
          ...(isTeamA ? { teamAId: match.winnerTeamId } : { teamBId: match.winnerTeamId }),
          // Check if both teams are now set
          status: "SCHEDULED",
        },
      });
    }
  }

  if (match.bracketPhase === "SF") {
    // SF winner -> Final, SF loser -> 3rd place
    const finalMatch = await prisma.match.findFirst({
      where: { tournamentId, bracketPhase: "FINAL" },
    });
    const thirdPlaceMatch = await prisma.match.findFirst({
      where: { tournamentId, bracketPhase: "THIRD_PLACE" },
    });

    const isTeamA = match.bracketIndex === 0;
    const loserId = match.teamAId === match.winnerTeamId ? match.teamBId : match.teamAId;

    if (finalMatch) {
      await prisma.match.update({
        where: { id: finalMatch.id },
        data: {
          ...(isTeamA ? { teamAId: match.winnerTeamId } : { teamBId: match.winnerTeamId }),
          status: "SCHEDULED",
        },
      });
    }

    if (thirdPlaceMatch) {
      await prisma.match.update({
        where: { id: thirdPlaceMatch.id },
        data: {
          ...(isTeamA ? { teamAId: loserId } : { teamBId: loserId }),
          status: "SCHEDULED",
        },
      });
    }
  }

  revalidatePath(`/torneios/${tournamentId}`);
}
