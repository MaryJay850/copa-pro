import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const { tournamentId } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      rounds: {
        include: {
          matches: {
            include: {
              teamA: { include: { player1: true, player2: true } },
              teamB: { include: { player1: true, player2: true } },
              court: true,
            },
          },
        },
        orderBy: { index: "asc" },
      },
      league: true,
      courts: { orderBy: { orderIndex: "asc" } },
      tournamentCourts: { include: { court: true } },
    },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Compute standings for individual formats
  let standings: any[] | null = null;
  if (
    ["AMERICANO", "SOBE_DESCE", "NONSTOP"].includes(tournament.teamMode)
  ) {
    const allMatches = tournament.rounds
      .flatMap((r) => r.matches)
      .filter((m) => m.status === "FINISHED");

    const playerMap = new Map<
      string,
      {
        id: string;
        name: string;
        points: number;
        matches: number;
        wins: number;
        setsWon: number;
        setsLost: number;
      }
    >();

    // Gather all players from finished matches
    for (const match of allMatches) {
      for (const team of [match.teamA, match.teamB]) {
        if (!team) continue;
        for (const p of [team.player1, team.player2].filter(Boolean)) {
          if (!playerMap.has(p!.id)) {
            playerMap.set(p!.id, {
              id: p!.id,
              name: p!.nickname || p!.fullName,
              points: 0,
              matches: 0,
              wins: 0,
              setsWon: 0,
              setsLost: 0,
            });
          }
        }
      }
    }

    // Calculate scores
    for (const match of allMatches) {
      const teamAPlayers = [
        match.teamA?.player1?.id,
        match.teamA?.player2?.id,
      ].filter(Boolean) as string[];
      const teamBPlayers = [
        match.teamB?.player1?.id,
        match.teamB?.player2?.id,
      ].filter(Boolean) as string[];
      const allPlayers = [...teamAPlayers, ...teamBPlayers];

      for (const pid of allPlayers) {
        const entry = playerMap.get(pid);
        if (entry) entry.matches++;
      }

      // Sets
      const sets: [number | null, number | null][] = [
        [match.set1A, match.set1B],
        [match.set2A, match.set2B],
        [match.set3A, match.set3B],
      ];

      for (const [a, b] of sets) {
        if (a === null || b === null) continue;
        if (a > b) {
          teamAPlayers.forEach((pid) => {
            const e = playerMap.get(pid);
            if (e) {
              e.setsWon++;
              e.points += 2;
            }
          });
          teamBPlayers.forEach((pid) => {
            const e = playerMap.get(pid);
            if (e) {
              e.setsLost++;
            }
          });
        } else if (b > a) {
          teamBPlayers.forEach((pid) => {
            const e = playerMap.get(pid);
            if (e) {
              e.setsWon++;
              e.points += 2;
            }
          });
          teamAPlayers.forEach((pid) => {
            const e = playerMap.get(pid);
            if (e) {
              e.setsLost++;
            }
          });
        }
      }

      // Match win bonus
      if (match.winnerTeamId === match.teamAId) {
        teamAPlayers.forEach((pid) => {
          const e = playerMap.get(pid);
          if (e) {
            e.wins++;
            e.points += 3;
          }
        });
      } else if (match.winnerTeamId === match.teamBId) {
        teamBPlayers.forEach((pid) => {
          const e = playerMap.get(pid);
          if (e) {
            e.wins++;
            e.points += 3;
          }
        });
      }
    }

    standings = Array.from(playerMap.values()).sort(
      (a, b) => b.points - a.points
    );
  }

  return NextResponse.json({ tournament, standings });
}
