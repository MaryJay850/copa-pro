export const dynamic = "force-dynamic";

import { getTournament } from "@/lib/actions";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MatchCard } from "@/components/match-card";
import { EmptyState } from "@/components/ui/empty-state";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TournamentActions } from "./actions-client";

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
        <div className="flex gap-4 mt-2 text-sm text-text-muted">
          <span>{tournament.teams.length} equipas</span>
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

      {/* Actions bar */}
      <TournamentActions
        tournamentId={tournament.id}
        status={tournament.status}
        leagueId={tournament.leagueId}
        seasonId={tournament.seasonId}
        hasResults={finishedMatches > 0}
      />

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
                  team.player1.fullName.split(" ")[0]}{" "}
                &amp;{" "}
                {team.player2.nickname ||
                  team.player2.fullName.split(" ")[0]}
              </span>
            </div>
          ))}
        </div>
      </Card>

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
                  <MatchCard key={match.id} match={match} numberOfSets={tournament.numberOfSets} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
