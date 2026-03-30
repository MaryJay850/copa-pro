import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const { tournamentId } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, teamMode: true },
  });

  if (!tournament) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 }
    );
  }

  if (
    ["AMERICANO", "SOBE_DESCE", "NONSTOP", "RANDOM_PER_ROUND"].includes(
      tournament.teamMode
    )
  ) {
    // Compute individual standings (same logic as getAmericanoStandings)
    const matches = await prisma.match.findMany({
      where: { tournamentId, status: "FINISHED" },
      include: {
        teamA: { include: { player1: true, player2: true } },
        teamB: { include: { player1: true, player2: true } },
      },
    });

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

    for (const match of matches) {
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

    for (const match of matches) {
      const teamAPlayers = [
        match.teamA?.player1?.id,
        match.teamA?.player2?.id,
      ].filter(Boolean) as string[];
      const teamBPlayers = [
        match.teamB?.player1?.id,
        match.teamB?.player2?.id,
      ].filter(Boolean) as string[];

      [...teamAPlayers, ...teamBPlayers].forEach((pid) => {
        const e = playerMap.get(pid);
        if (e) e.matches++;
      });

      const sets = [
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

    const standings = Array.from(playerMap.values()).sort(
      (a, b) => b.points - a.points
    );

    return NextResponse.json(
      { data: standings },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=15",
        },
      }
    );
  }

  if (tournament.teamMode === "LADDER") {
    const positions = await prisma.ladderPosition.findMany({
      where: { tournamentId },
      include: {
        player: { select: { id: true, fullName: true, nickname: true } },
      },
      orderBy: { position: "asc" },
    });

    return NextResponse.json(
      {
        data: positions.map((p) => ({
          position: p.position,
          playerId: p.player.id,
          playerName: p.player.nickname || p.player.fullName,
        })),
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=15",
        },
      }
    );
  }

  return NextResponse.json(
    { data: [], message: "Standings not available for this format" },
    {
      headers: { "Access-Control-Allow-Origin": "*" },
    }
  );
}
