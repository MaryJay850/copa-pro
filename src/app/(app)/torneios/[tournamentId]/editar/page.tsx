export const dynamic = "force-dynamic";

import { getTournamentForEdit, getLeagueMembersAsPlayers } from "@/lib/actions";
import { notFound } from "next/navigation";
import Link from "next/link";
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
    teams: tournament.teams.map((t: any) => ({
      name: t.name,
      player1Id: t.player1Id,
      player2Id: t.player2Id,
    })),
    selectedPlayerIds,
    selectionOrder,
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-text-muted mb-1">
          <Link href="/ligas" className="hover:text-text">
            Ligas
          </Link>
          <span>/</span>
          <Link
            href={`/ligas/${tournament.leagueId}`}
            className="hover:text-text"
          >
            {tournament.league.name}
          </Link>
          <span>/</span>
          <Link
            href={`/ligas/${tournament.leagueId}/epocas/${tournament.seasonId}`}
            className="hover:text-text"
          >
            {tournament.season.name}
          </Link>
          <span>/</span>
          <Link
            href={`/torneios/${tournament.id}`}
            className="hover:text-text"
          >
            {tournament.name}
          </Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-bold">Editar Torneio</h1>
      </div>

      <TournamentWizard
        leagueId={tournament.leagueId}
        seasonId={tournament.seasonId}
        existingPlayers={allPlayers}
        editMode={{
          tournamentId: tournament.id,
          initialData,
        }}
      />
    </div>
  );
}
