export const dynamic = "force-dynamic";

import { getLeagueMembersAsPlayers, getSeason } from "@/lib/actions";
import { requireLeagueManager } from "@/lib/auth-guards";
import { getUserPlanLimits } from "@/lib/plan-guards";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TournamentWizard } from "./wizard";

export default async function NewTournamentPage({ params }: { params: Promise<{ leagueId: string; seasonId: string }> }) {
  const { leagueId, seasonId } = await params;
  await requireLeagueManager(leagueId);
  const season = await getSeason(seasonId);
  const players = await getLeagueMembersAsPlayers(leagueId);

  if (!season) notFound();

  // Check plan limits before showing the wizard
  const { plan, limits } = await getUserPlanLimits();
  const tournamentCount = season.tournaments.length;
  const canCreate = limits.maxTournamentsPerSeason === null || tournamentCount < limits.maxTournamentsPerSeason;

  if (!canCreate) {
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

        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-6 py-5 space-y-3">
          <p className="font-semibold">Limite de torneios atingido</p>
          <p className="text-sm">
            O plano <strong>{plan}</strong> permite no máximo <strong>{limits.maxTournamentsPerSeason}</strong> torneio(s) por época.
            Esta época já tem <strong>{tournamentCount}</strong> torneio(s).
          </p>
          <div className="flex gap-3 pt-1">
            <Link href="/planos" className="inline-flex items-center gap-1 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              Ver Planos — Upgrade
            </Link>
            <Link href={`/ligas/${leagueId}/epocas/${seasonId}`} className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors">
              ← Voltar à Época
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
