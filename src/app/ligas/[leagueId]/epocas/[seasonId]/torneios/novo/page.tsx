export const dynamic = "force-dynamic";

import { getPlayers, getSeason } from "@/lib/actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TournamentWizard } from "./wizard";

export default async function NewTournamentPage({ params }: { params: Promise<{ leagueId: string; seasonId: string }> }) {
  const { leagueId, seasonId } = await params;
  const season = await getSeason(seasonId);
  const players = await getPlayers();

  if (!season) notFound();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-text-muted mb-1">
          <Link href="/ligas" className="hover:text-text">Ligas</Link>
          <span>/</span>
          <Link href={`/ligas/${leagueId}`} className="hover:text-text">{season.league.name}</Link>
          <span>/</span>
          <Link href={`/ligas/${leagueId}/epocas/${seasonId}`} className="hover:text-text">{season.name}</Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-bold">Novo Torneio</h1>
      </div>

      <TournamentWizard
        leagueId={leagueId}
        seasonId={seasonId}
        existingPlayers={players}
      />
    </div>
  );
}
