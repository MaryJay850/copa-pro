export const dynamic = "force-dynamic";

import { getLeagueMembersAsPlayers, getSeason } from "@/lib/actions";
import { requireLeagueManager } from "@/lib/auth-guards";
import { getUserPlanLimits } from "@/lib/plan-guards";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      <div className="space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="rounded-lg shadow-card bg-surface border border-border overflow-hidden">
          <div className="h-28" style={{ background: "linear-gradient(to right, #5766da, #7c6fe0, #a78bfa)" }} />
          <div className="px-6 pb-6 relative">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border-4 border-surface absolute -top-10 left-6" style={{ background: "linear-gradient(to bottom right, #5766da, #8b9cf7)" }}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="pt-14">
              <div className="flex items-center gap-2 text-xs text-text-muted mb-1 font-medium">
                <Link href="/ligas" className="hover:text-primary transition-colors">Ligas</Link>
                <span>&rsaquo;</span>
                <Link href={`/ligas/${leagueId}`} className="hover:text-primary transition-colors">{season.league.name}</Link>
                <span>&rsaquo;</span>
                <Link href={`/ligas/${leagueId}/epocas/${seasonId}`} className="hover:text-primary transition-colors">{season.name}</Link>
                <span>&rsaquo;</span>
              </div>
              <h1 className="text-xl font-extrabold tracking-tight">Novo Torneio</h1>
            </div>
          </div>
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
    <TournamentWizard
      leagueId={leagueId}
      seasonId={seasonId}
      existingPlayers={players}
      leagueName={season.league.name}
      seasonName={season.name}
    />
  );
}
