export const dynamic = "force-dynamic";

import { getTournamentForEdit, getLeagueMembersAsPlayers } from "@/lib/actions";
import { notFound } from "next/navigation";
import { TournamentWizard } from "@/app/(app)/ligas/[leagueId]/epocas/[seasonId]/torneios/novo/wizard";

export default async function EditTournamentPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;

  let tournament;
  try {
    tournament = await getTournamentForEdit(tournamentId);
  } catch {
    notFound();
  }

  if (!tournament) notFound();

  const allPlayers = await getLeagueMembersAsPlayers(tournament.leagueId);

  // Build selectionOrder from inscriptions (ordered by orderIndex) or fallback to teams
  const selectionOrder = tournament.inscriptions && tournament.inscriptions.length > 0
    ? tournament.inscriptions.map((i: any) => i.playerId)
    : tournament.teams.flatMap((t: any) => [t.player1Id, t.player2Id].filter(Boolean));

  const selectedPlayerIds = selectionOrder;

  // Extract court names
  const courtNames = tournament.courts
    ? tournament.courts.map((c: any) => c.name)
    : Array.from({ length: tournament.courtsCount }, (_, i) => `Campo ${i + 1}`);

  const initialData = {
    name: tournament.name,
    startDate: tournament.startDate ? tournament.startDate.split("T")[0] : undefined,
    courtsCount: tournament.courtsCount,
    courtNames,
    matchesPerPair: tournament.matchesPerPair,
    numberOfSets: tournament.numberOfSets,
    teamSize: tournament.teamSize ?? 2,
    teamMode: tournament.teamMode,
    randomSeed: tournament.randomSeed ?? undefined,
    numberOfRounds: tournament.numberOfRounds ?? undefined,
    rankedSplitSubMode: tournament.rankedSplitSubMode ?? undefined,
    teams: tournament.teams.filter((t: any) => !t.roundId).map((t: any) => ({
      name: t.name,
      player1Id: t.player1Id,
      player2Id: t.player2Id,
    })),
    selectedPlayerIds,
    selectionOrder,
  };

  return (
    <TournamentWizard
      leagueId={tournament.leagueId}
      seasonId={tournament.seasonId}
      existingPlayers={allPlayers}
      leagueName={tournament.league.name}
      seasonName={tournament.season.name}
      editMode={{
        tournamentId: tournament.id,
        initialData,
      }}
    />
  );
}
