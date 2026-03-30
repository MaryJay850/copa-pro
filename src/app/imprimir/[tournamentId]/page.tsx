import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { PrintView } from "./print-view";

export default async function PrintPage({ params }: { params: Promise<{ tournamentId: string }> }) {
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
            orderBy: { slotIndex: "asc" },
          },
        },
        orderBy: { index: "asc" },
      },
      league: true,
      season: true,
      inscriptions: {
        include: { player: true },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!tournament) notFound();

  // Compute standings for individual formats
  let standings: any[] = [];
  if (["AMERICANO", "SOBE_DESCE", "NONSTOP", "RANDOM_PER_ROUND"].includes(tournament.teamMode)) {
    const finishedMatches = tournament.rounds.flatMap(r => r.matches).filter(m => m.status === "FINISHED");
    const playerMap = new Map<string, any>();

    for (const match of finishedMatches) {
      for (const team of [match.teamA, match.teamB]) {
        if (!team) continue;
        for (const p of [team.player1, team.player2].filter(Boolean)) {
          if (!playerMap.has(p!.id)) {
            playerMap.set(p!.id, { id: p!.id, name: p!.nickname || p!.fullName, points: 0, matches: 0, wins: 0, setsWon: 0, setsLost: 0 });
          }
        }
      }
    }

    for (const match of finishedMatches) {
      const teamAPlayers = [match.teamA?.player1?.id, match.teamA?.player2?.id].filter(Boolean) as string[];
      const teamBPlayers = [match.teamB?.player1?.id, match.teamB?.player2?.id].filter(Boolean) as string[];
      [...teamAPlayers, ...teamBPlayers].forEach(pid => { const e = playerMap.get(pid); if (e) e.matches++; });

      const sets = [[match.set1A, match.set1B], [match.set2A, match.set2B], [match.set3A, match.set3B]];
      for (const [a, b] of sets) {
        if (a === null || b === null) continue;
        if (a > b) { teamAPlayers.forEach(pid => { const e = playerMap.get(pid); if (e) { e.setsWon++; e.points += 2; } }); teamBPlayers.forEach(pid => { const e = playerMap.get(pid); if (e) e.setsLost++; }); }
        else if (b > a) { teamBPlayers.forEach(pid => { const e = playerMap.get(pid); if (e) { e.setsWon++; e.points += 2; } }); teamAPlayers.forEach(pid => { const e = playerMap.get(pid); if (e) e.setsLost++; }); }
      }
      if (match.winnerTeamId === match.teamAId) teamAPlayers.forEach(pid => { const e = playerMap.get(pid); if (e) { e.wins++; e.points += 3; } });
      else if (match.winnerTeamId === match.teamBId) teamBPlayers.forEach(pid => { const e = playerMap.get(pid); if (e) { e.wins++; e.points += 3; } });
    }
    standings = Array.from(playerMap.values()).sort((a, b) => b.points - a.points);
  }

  return <PrintView tournament={tournament} standings={standings} />;
}
