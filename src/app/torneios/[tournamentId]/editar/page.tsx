export const dynamic = "force-dynamic";

import { getTournamentForEdit, getPlayers } from "@/lib/actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TournamentWizard } from "@/app/ligas/[leagueId]/epocas/[seasonId]/torneios/novo/wizard";

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

  const allPlayers = await getPlayers();

  // Build the selectedPlayerIds from the existing teams
  const selectedPlayerIds = tournament.teams.flatMap((t) => [
    t.player1Id,
    t.player2Id,
  ]);

  const initialData = {
    name: tournament.name,
    courtsCount: tournament.courtsCount,
    matchesPerPair: tournament.matchesPerPair,
    teamMode: tournament.teamMode,
    randomSeed: tournament.randomSeed ?? undefined,
    teams: tournament.teams.map((t) => ({
      name: t.name,
      player1Id: t.player1Id,
      player2Id: t.player2Id,
    })),
    selectedPlayerIds,
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
