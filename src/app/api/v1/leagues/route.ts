import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const leagues = await prisma.league.findMany({
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: { select: { seasons: true, tournaments: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    { data: leagues },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60",
      },
    }
  );
}
