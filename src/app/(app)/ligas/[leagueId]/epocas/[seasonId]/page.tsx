export const dynamic = "force-dynamic";

import { getSeason } from "@/lib/actions";
import { isLeagueManager } from "@/lib/auth-guards";
import { getUserPlanLimits } from "@/lib/plan-guards";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RankingTable } from "@/components/ranking-table";
import { ExportPDF } from "@/components/export-pdf";
import { EditSeasonForm } from "@/components/edit-season-form";
import { EmptyState } from "@/components/ui/empty-state";
import { notFound } from "next/navigation";
import Link from "next/link";

const statusLabels: Record<string, { label: string; variant: "default" | "success" | "warning" | "info" }> = {
  DRAFT: { label: "Rascunho", variant: "default" },
  PUBLISHED: { label: "Publicado", variant: "info" },
  RUNNING: { label: "A decorrer", variant: "warning" },
  FINISHED: { label: "Terminado", variant: "success" },
};

export default async function SeasonPage({ params }: { params: Promise<{ leagueId: string; seasonId: string }> }) {
  const { leagueId, seasonId } = await params;
  const season = await getSeason(seasonId);

  if (!season) notFound();

  const canManage = await isLeagueManager(leagueId);

  let canCreateTournament = true;
  let tournamentLimitMessage = "";
  if (canManage) {
    try {
      const { limits } = await getUserPlanLimits();
      if (limits.maxTournamentsPerSeason !== null && season.tournaments.length >= limits.maxTournamentsPerSeason) {
        canCreateTournament = false;
        tournamentLimitMessage = `Limite de ${limits.maxTournamentsPerSeason} torneios por época atingido.`;
      }
    } catch {
      // If plan check fails, allow creation
    }
  }

  const rankingRows = season.rankings.map((r, i) => ({
    position: i + 1,
    playerId: r.player.id,
    playerName: r.player.nickname || r.player.fullName,
    pointsTotal: r.pointsTotal,
    matchesPlayed: r.matchesPlayed,
    wins: r.wins,
    draws: r.draws,
    losses: r.losses,
    setsWon: r.setsWon,
    setsLost: r.setsLost,
    setsDiff: r.setsDiff,
  }));

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-text-muted mb-2 font-medium">
          <Link href="/ligas" className="hover:text-primary transition-colors">Ligas</Link>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          <Link href={`/ligas/${leagueId}`} className="hover:text-primary transition-colors">{season.league.name}</Link>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-extrabold tracking-tight">{season.name}</h1>
          <Badge variant={season.isActive ? "success" : "default"} pulse={season.isActive}>
            {season.isActive ? "Ativa" : "Encerrada"}
          </Badge>
        </div>
        {season.allowDraws && (
          <p className="text-xs text-amber-600 mt-2 font-medium flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            Empates permitidos
          </p>
        )}
      </div>

      {canManage && (
        <EditSeasonForm
          seasonId={seasonId}
          leagueId={leagueId}
          currentName={season.name}
          currentAllowDraws={season.allowDraws}
          currentStartDate={season.startDate || null}
          currentEndDate={season.endDate || null}
        />
      )}

      {/* Point System */}
      <Card className="bg-blue-50/50 border-blue-100">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4.5 h-4.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-text mb-1.5">Sistema de Pontos</h3>
            <div className="text-xs text-text-muted space-y-0.5 font-medium">
              <p><span className="text-text">Set ganho:</span> +2 pts por set</p>
              <p><span className="text-text">Vitória:</span> +3 pts</p>
              <p><span className="text-text">Empate:</span> +1 pt (se ativo)</p>
              <p className="pt-1 text-text-muted/70"><span className="text-text-muted">Desempate:</span> Pts &gt; Vitórias &gt; Dif. Sets &gt; Sets Ganhos &gt; Empates</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Ranking */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Ranking Individual</CardTitle>
            <ExportPDF title={`Ranking - ${season.name}`} rankings={rankingRows} />
          </div>
        </CardHeader>
        <RankingTable rows={rankingRows} />
      </Card>

      {/* Tournaments */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold tracking-tight">Torneios</h2>
          {canManage && (
            canCreateTournament ? (
              <Link href={`/ligas/${leagueId}/epocas/${seasonId}/torneios/novo`}>
                <Button size="sm">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Novo Torneio
                  </span>
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Button size="sm" disabled>+ Novo Torneio</Button>
                <Link href="/planos" className="text-xs text-primary hover:underline font-semibold">
                  {tournamentLimitMessage} Upgrade
                  <svg className="w-3 h-3 inline ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              </div>
            )
          )}
        </div>

        {season.tournaments.length === 0 ? (
          <EmptyState
            title="Sem torneios"
            description="Crie um torneio para começar a jogar."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {season.tournaments.map((t, i) => {
              const s = statusLabels[t.status] || statusLabels.DRAFT;
              return (
                <Link key={t.id} href={`/torneios/${t.id}`}>
                  <Card className={`card-hover cursor-pointer h-full animate-fade-in-up stagger-${i + 1}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold tracking-tight">{t.name}</h3>
                      <Badge variant={s.variant} pulse={t.status === "RUNNING"}>
                        {s.label}
                      </Badge>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-text-muted font-medium">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {t._count.teams} equipas
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        {t._count.matches} jogos
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
