import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const leagueId = searchParams.get("leagueId");
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

  const where: any = {};
  if (leagueId) where.leagueId = leagueId;
  if (status) where.status = status;

  const tournaments = await prisma.tournament.findMany({
    where,
    select: {
      id: true,
      name: true,
      status: true,
      teamMode: true,
      format: true,
      teamSize: true,
      courtsCount: true,
      numberOfSets: true,
      numberOfRounds: true,
      createdAt: true,
      league: { select: { id: true, name: true } },
      season: { select: { id: true, name: true } },
      _count: { select: { matches: true, inscriptions: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(
    {
      data: tournaments,
      count: tournaments.length,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=30",
      },
    }
  );
}
