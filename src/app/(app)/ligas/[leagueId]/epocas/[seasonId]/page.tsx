export const dynamic = "force-dynamic";

import { getSeason } from "@/lib/actions";
import { isLeagueManager } from "@/lib/auth-guards";
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
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-text-muted mb-1">
          <Link href="/ligas" className="hover:text-text">Ligas</Link>
          <span>/</span>
          <Link href={`/ligas/${leagueId}`} className="hover:text-text">{season.league.name}</Link>
          <span>/</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{season.name}</h1>
          <Badge variant={season.isActive ? "success" : "default"}>
            {season.isActive ? "Ativa" : "Encerrada"}
          </Badge>
        </div>
        {season.allowDraws && (
          <p className="text-xs text-amber-600 mt-1">Empates permitidos</p>
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

      {/* Point System Info */}
      <Card className="bg-blue-50/50 border-blue-100">
        <CardHeader>
          <CardTitle className="text-sm">Sistema de Pontos</CardTitle>
        </CardHeader>
        <div className="text-xs text-text-muted space-y-1">
          <p><strong>Set ganho:</strong> +2 pts por set</p>
          <p><strong>Vitória:</strong> +3 pts</p>
          <p><strong>Empate:</strong> +1 pt (se ativo)</p>
          <p className="pt-1 text-text-muted"><strong>Desempate:</strong> Pts &gt; Vitórias &gt; Dif. Sets &gt; Sets Ganhos &gt; Empates</p>
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
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Torneios</h2>
          {canManage && (
            <Link href={`/ligas/${leagueId}/epocas/${seasonId}/torneios/novo`}>
              <Button size="sm">+ Novo Torneio</Button>
            </Link>
          )}
        </div>

        {season.tournaments.length === 0 ? (
          <EmptyState
            title="Sem torneios"
            description="Crie um torneio para começar a jogar."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {season.tournaments.map((t) => {
              const s = statusLabels[t.status] || statusLabels.DRAFT;
              return (
                <Link key={t.id} href={`/torneios/${t.id}`}>
                  <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{t.name}</h3>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-text-muted">
                      <span>{t._count.teams} equipas</span>
                      <span>{t._count.matches} jogos</span>
                      <span>{t.teamMode === "RANDOM_TEAMS" ? "Equipas aleatórias" : t.teamMode === "MANUAL_TEAMS" ? "Equipas manuais" : "Equipas fixas"}</span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
