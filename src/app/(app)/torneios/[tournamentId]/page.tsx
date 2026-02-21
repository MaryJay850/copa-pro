export const dynamic = "force-dynamic";

import { getTournament } from "@/lib/actions";
import { isLeagueManager } from "@/lib/auth-guards";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MatchCard } from "@/components/match-card";
import { EmptyState } from "@/components/ui/empty-state";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TournamentActions } from "./actions-client";
import { PlayerManagement } from "@/components/player-management";

const statusLabels: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "info" }
> = {
  DRAFT: { label: "Rascunho", variant: "default" },
  PUBLISHED: { label: "Publicado", variant: "info" },
  RUNNING: { label: "A decorrer", variant: "warning" },
  FINISHED: { label: "Terminado", variant: "success" },
};

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  const tournament = await getTournament(tournamentId);

  if (!tournament) notFound();

  const canManage = await isLeagueManager(tournament.leagueId);
  const s = statusLabels[tournament.status] || statusLabels.DRAFT;

  const totalMatches = tournament.rounds.reduce(
    (acc, r) => acc + r.matches.length,
    0
  );
  const finishedMatches = tournament.rounds.reduce(
    (acc, r) =>
      acc + r.matches.filter((m) => m.status === "FINISHED").length,
    0
  );

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
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">{tournament.name}</h1>
          <Badge variant={s.variant}>{s.label}</Badge>
        </div>
        <div className="flex gap-4 mt-2 text-sm text-text-muted flex-wrap">
          {tournament.startDate && (
            <span className="font-medium text-text">
              {new Date(tournament.startDate).toLocaleDateString("pt-PT", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </span>
          )}
          <span>{tournament.teamSize === 1 ? "1v1" : "2v2"}</span>
          <span>{tournament.teams.length} {tournament.teamSize === 1 ? "jogadores" : "equipas"}</span>
          <span>
            {tournament.courtsCount}{" "}
            {tournament.courtsCount === 1 ? "campo" : "campos"}
          </span>
          <span>
            {tournament.matchesPerPair === 1 ? "RR Simples" : "RR Duplo"}
          </span>
          <span>
            {tournament.numberOfSets === 1 ? "1 Set" : tournament.numberOfSets === 2 ? "2 Sets" : "Melhor de 3"}
          </span>
          <span>
            {finishedMatches}/{totalMatches} jogos completos
          </span>
        </div>
      </div>

      {/* Actions bar - only for admins and league managers */}
      {canManage && (
        <TournamentActions
          tournamentId={tournament.id}
          status={tournament.status}
          leagueId={tournament.leagueId}
          seasonId={tournament.seasonId}
          hasResults={finishedMatches > 0}
        />
      )}

      {/* Player Management - only for managers when inscriptions exist */}
      {canManage && tournament.inscriptions && tournament.inscriptions.length > 0 && (
        <PlayerManagement
          tournamentId={tournament.id}
          inscriptions={tournament.inscriptions}
        />
      )}

      {/* Teams overview */}
      <Card>
        <CardHeader>
          <CardTitle>Equipas</CardTitle>
        </CardHeader>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {tournament.teams.map((team) => (
            <div
              key={team.id}
              className="flex items-center gap-2 px-3 py-2 bg-surface-alt rounded-lg text-sm"
            >
              <span className="font-medium">{team.name}</span>
              <span className="text-text-muted text-xs">
                {team.player1.nickname ||
                  team.player1.fullName.split(" ")[0]}
                {team.player2 && (
                  <>
                    {" "}&amp;{" "}
                    {team.player2.nickname ||
                      team.player2.fullName.split(" ")[0]}
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Suplentes */}
      {tournament.inscriptions && tournament.inscriptions.length > 0 && (
        (() => {
          const suplentes = tournament.inscriptions.filter(
            (i: any) => i.status === "SUPLENTE" || i.status === "PROMOVIDO" || i.status === "DESISTIU"
          );
          if (suplentes.length === 0) return null;
          return (
            <Card>
              <CardHeader>
                <CardTitle>Inscrições</CardTitle>
              </CardHeader>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {tournament.inscriptions.map((insc: any, idx: number) => (
                  <div
                    key={insc.id}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm ${
                      insc.status === "DESISTIU" ? "bg-red-50 line-through text-text-muted" : "bg-surface-alt"
                    }`}
                  >
                    <span className={insc.status === "DESISTIU" ? "text-text-muted" : "font-medium"}>
                      {insc.player.nickname || insc.player.fullName.split(" ")[0]}
                    </span>
                    <Badge
                      variant={
                        insc.status === "TITULAR" ? "success"
                          : insc.status === "PROMOVIDO" ? "success"
                          : insc.status === "SUPLENTE" ? "warning"
                          : "default"
                      }
                    >
                      {insc.status === "TITULAR" ? "Titular"
                        : insc.status === "PROMOVIDO" ? "Promovido"
                        : insc.status === "SUPLENTE" ? `Suplente #${idx - tournament.inscriptions.filter((x: any) => x.status === "TITULAR" || x.status === "PROMOVIDO").length + 1}`
                        : "Desistiu"}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          );
        })()
      )}

      {/* Schedule by rounds */}
      {tournament.rounds.length === 0 ? (
        <EmptyState
          title="Sem calendário"
          description="Gere o calendário para começar a registar resultados."
        />
      ) : (
        <div className="space-y-4" id="schedule">
          {tournament.rounds.map((round) => (
            <Card key={round.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Ronda {round.index}</CardTitle>
                  <span className="text-xs text-text-muted">
                    {
                      round.matches.filter((m) => m.status === "FINISHED")
                        .length
                    }
                    /{round.matches.length} jogos
                  </span>
                </div>
              </CardHeader>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {round.matches.map((match) => (
                  <MatchCard key={match.id} match={match} numberOfSets={tournament.numberOfSets} canEdit={canManage} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
