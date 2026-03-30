import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await params;

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      fullName: true,
      nickname: true,
      eloRating: true,
      _count: { select: { teamsAsPlayer1: true, teamsAsPlayer2: true } },
    },
  });

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      data: {
        id: player.id,
        name: player.nickname || player.fullName,
        fullName: player.fullName,
        nickname: player.nickname,
        elo: player.eloRating,
        totalTeams:
          player._count.teamsAsPlayer1 + player._count.teamsAsPlayer2,
      },
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60",
      },
    }
  );
}
