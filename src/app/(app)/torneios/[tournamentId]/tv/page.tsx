import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { TVMonitor } from "./tv-monitor";

export default async function TVPage({ params }: { params: Promise<{ tournamentId: string }> }) {
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
      season: true,
      courts: { orderBy: { orderIndex: "asc" } },
      tournamentCourts: { include: { court: true }, orderBy: { court: { orderIndex: "asc" } } },
    },
  });

  if (!tournament) notFound();

  return <TVMonitor tournament={tournament} />;
}
