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
      league: { select: { id: true, name: true } },
      season: { select: { id: true, name: true } },
      rounds: {
        orderBy: { index: "asc" },
        include: {
          matches: {
            orderBy: { slotIndex: "asc" },
            include: {
              teamA: {
                include: {
                  player1: {
                    select: { id: true, fullName: true, nickname: true },
                  },
                  player2: {
                    select: { id: true, fullName: true, nickname: true },
                  },
                },
              },
              teamB: {
                include: {
                  player1: {
                    select: { id: true, fullName: true, nickname: true },
                  },
                  player2: {
                    select: { id: true, fullName: true, nickname: true },
                  },
                },
              },
              court: { select: { id: true, name: true } },
            },
          },
        },
      },
      courts: { select: { id: true, name: true }, orderBy: { orderIndex: "asc" } },
      inscriptions: {
        include: {
          player: {
            select: {
              id: true,
              fullName: true,
              nickname: true,
              eloRating: true,
            },
          },
        },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  // Transform matches for cleaner API output
  const transformedRounds = tournament.rounds.map((round) => ({
    index: round.index,
    matches: round.matches.map((match) => ({
      id: match.id,
      status: match.status,
      resultType: match.resultType,
      court: match.court?.name || null,
      teamA: {
        id: match.teamAId,
        name: match.teamA?.name,
        players: [
          match.teamA?.player1
            ? {
                id: match.teamA.player1.id,
                name:
                  match.teamA.player1.nickname || match.teamA.player1.fullName,
              }
            : null,
          match.teamA?.player2
            ? {
                id: match.teamA.player2.id,
                name:
                  match.teamA.player2.nickname || match.teamA.player2.fullName,
              }
            : null,
        ].filter(Boolean),
      },
      teamB: {
        id: match.teamBId,
        name: match.teamB?.name,
        players: [
          match.teamB?.player1
            ? {
                id: match.teamB.player1.id,
                name:
                  match.teamB.player1.nickname || match.teamB.player1.fullName,
              }
            : null,
          match.teamB?.player2
            ? {
                id: match.teamB.player2.id,
                name:
                  match.teamB.player2.nickname || match.teamB.player2.fullName,
              }
            : null,
        ].filter(Boolean),
      },
      scores: {
        set1: match.set1A !== null ? [match.set1A, match.set1B] : null,
        set2: match.set2A !== null ? [match.set2A, match.set2B] : null,
        set3: match.set3A !== null ? [match.set3A, match.set3B] : null,
      },
      winnerId: match.winnerTeamId,
    })),
  }));

  return NextResponse.json(
    {
      data: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        format: tournament.format,
        teamMode: tournament.teamMode,
        teamSize: tournament.teamSize,
        courtsCount: tournament.courtsCount,
        numberOfSets: tournament.numberOfSets,
        numberOfRounds: tournament.numberOfRounds,
        league: tournament.league,
        season: tournament.season,
        courts: tournament.courts,
        players: tournament.inscriptions.map((i) => ({
          id: i.player.id,
          name: i.player.nickname || i.player.fullName,
          elo: i.player.eloRating,
          status: i.status,
        })),
        rounds: transformedRounds,
      },
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=15",
      },
    }
  );
}
