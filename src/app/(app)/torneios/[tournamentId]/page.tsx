export const dynamic = "force-dynamic";

import { getTournament, getPendingSubmissions } from "@/lib/actions";
import { isLeagueManager, isAdmin } from "@/lib/auth-guards";
import { auth } from "@/lib/auth";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ScheduleView } from "./schedule-view";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TournamentActions } from "./actions-client";
import { PlayerManagement } from "@/components/player-management";
import { ExportCalendar } from "@/components/export-calendar";
import { PlayerSwap } from "./player-swap";
import { OcrResultsUpload } from "@/components/ocr-results-upload";

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
  const [tournament, session] = await Promise.all([
    getTournament(tournamentId),
    auth(),
  ]);

  if (!tournament) notFound();

  const canManage = await isLeagueManager(tournament.leagueId);
  const adminUser = await isAdmin();
  const s = statusLabels[tournament.status] || statusLabels.DRAFT;

  const currentUserId = (session?.user as any)?.id ?? null;
  const currentPlayerId = (session?.user as any)?.playerId ?? null;

  const allMatches = tournament.rounds.flatMap((r) => r.matches);
  const scheduledMatchIds = allMatches
    .filter((m) => m.status === "SCHEDULED")
    .map((m) => m.id);

  const pendingSubmissionsMap: Record<string, any> = {};
  if (scheduledMatchIds.length > 0 && currentPlayerId) {
    const submissions = await Promise.all(
      scheduledMatchIds.map((id) => getPendingSubmissions(id).then((s) => [id, s] as const))
    );
    for (const [id, sub] of submissions) {
      if (sub) pendingSubmissionsMap[id] = sub;
    }
  }

  const totalMatches = tournament.rounds.reduce(
    (acc, r) => acc + r.matches.length,
    0
  );
  const finishedMatches = tournament.rounds.reduce(
    (acc, r) =>
      acc + r.matches.filter((m) => m.status === "FINISHED").length,
    0
  );
  const progressPct = totalMatches > 0 ? Math.round((finishedMatches / totalMatches) * 100) : 0;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-text-muted mb-2 font-medium">
          <Link href="/ligas" className="hover:text-primary transition-colors">Ligas</Link>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          <Link href={`/ligas/${tournament.leagueId}`} className="hover:text-primary transition-colors">{tournament.league.name}</Link>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          <Link href={`/ligas/${tournament.leagueId}/epocas/${tournament.seasonId}`} className="hover:text-primary transition-colors">{tournament.season.name}</Link>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </div>

        <div className="flex items-center gap-3 flex-wrap mb-3">
          <h1 className="text-2xl font-extrabold tracking-tight">{tournament.name}</h1>
          <Badge variant={s.variant} pulse={tournament.status === "RUNNING"}>
            {s.label}
          </Badge>
        </div>

        {/* Metadata chips */}
        <div className="flex gap-2 flex-wrap">
          {tournament.startDate && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-text bg-surface rounded-lg border border-border px-2.5 py-1.5">
              <svg className="w-3.5 h-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              {new Date(tournament.startDate).toLocaleDateString("pt-PT", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-text bg-surface rounded-lg border border-border px-2.5 py-1.5">
            <svg className="w-3.5 h-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {tournament.teamSize === 1 ? "1v1" : "2v2"}
          </span>
          {tournament.teamMode === "RANDOM_PER_ROUND" ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-text bg-surface rounded-lg border border-border px-2.5 py-1.5">
              <svg className="w-3.5 h-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Aleatórias ({tournament.numberOfRounds || tournament.rounds.length} rondas)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-text bg-surface rounded-lg border border-border px-2.5 py-1.5">
              {tournament.teams.length} {tournament.teamSize === 1 ? "jogadores" : "equipas"}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-text bg-surface rounded-lg border border-border px-2.5 py-1.5">
            {tournament.courtsCount} {tournament.courtsCount === 1 ? "campo" : "campos"}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-text bg-surface rounded-lg border border-border px-2.5 py-1.5">
            {tournament.numberOfSets === 1 ? "1 Set" : tournament.numberOfSets === 2 ? "2 Sets" : "Melhor de 3"}
          </span>
        </div>

        {/* Progress bar */}
        {totalMatches > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-text-muted">Progresso</span>
              <span className="text-xs font-bold text-text tabular-nums">{finishedMatches}/{totalMatches} jogos ({progressPct}%)</span>
            </div>
            <div className="w-full bg-surface-hover rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary to-primary-light rounded-full h-2.5 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions bar */}
      {canManage && (
        <TournamentActions
          tournamentId={tournament.id}
          status={tournament.status}
          leagueId={tournament.leagueId}
          seasonId={tournament.seasonId}
          hasResults={finishedMatches > 0}
          finishedMatches={finishedMatches}
          totalMatches={totalMatches}
        />
      )}

      {/* Player Swap */}
      {adminUser && tournament.status !== "FINISHED" && tournament.teams.length > 0 && (
        <PlayerSwap
          tournamentId={tournament.id}
          players={(() => {
            const seen = new Set<string>();
            const result: { id: string; fullName: string; nickname: string | null }[] = [];
            for (const team of tournament.teams) {
              if (team.player1 && !seen.has(team.player1.id)) {
                seen.add(team.player1.id);
                result.push({ id: team.player1.id, fullName: team.player1.fullName, nickname: team.player1.nickname });
              }
              if (team.player2 && !seen.has(team.player2.id)) {
                seen.add(team.player2.id);
                result.push({ id: team.player2.id, fullName: team.player2.fullName, nickname: team.player2.nickname });
              }
            }
            return result.sort((a, b) => (a.nickname || a.fullName).localeCompare(b.nickname || b.fullName));
          })()}
        />
      )}

      {/* OCR Results Upload */}
      {canManage && tournament.status !== "FINISHED" && tournament.rounds.length > 0 && (
        <OcrResultsUpload
          tournamentId={tournament.id}
          matches={tournament.rounds.flatMap((r) =>
            r.matches.map((m) => ({
              id: m.id,
              roundIndex: r.index,
              courtName: m.court?.name || "",
              teamAName: m.teamA.name,
              teamBName: m.teamB.name,
              status: m.status,
            }))
          )}
          numberOfSets={tournament.numberOfSets}
          courts={tournament.courts?.map((c: any) => ({ id: c.id, name: c.name })) || []}
        />
      )}

      {/* Placar de Jogo */}
      {canManage && tournament.status !== "FINISHED" && tournament.rounds.length > 0 && (
        <div>
          <Link
            href={`/torneios/${tournament.id}/placar`}
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-amber-600 text-white hover:bg-amber-700 active:scale-[0.97] transition-all shadow"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="18" rx="2" strokeWidth="2"/><path d="M12 3v18M2 12h20" strokeWidth="2"/><path d="M7 8h2M15 8h2M7 16h2M15 16h2" strokeWidth="2" strokeLinecap="round"/></svg>
            Placar de Jogo
          </Link>
        </div>
      )}

      {/* Export Calendar */}
      {tournament.rounds.length > 0 && (
        <ExportCalendar
          tournamentName={tournament.name}
          startDate={tournament.startDate ? tournament.startDate.toString() : null}
          matches={tournament.rounds.flatMap((r) =>
            r.matches.map((m) => ({
              team1Name: m.teamA.name,
              team2Name: m.teamB.name,
              courtName: m.court?.name,
              roundIndex: r.index,
            }))
          )}
        />
      )}

      {/* Player Management */}
      {canManage && tournament.inscriptions && tournament.inscriptions.length > 0 && (
        <PlayerManagement
          tournamentId={tournament.id}
          inscriptions={tournament.inscriptions}
        />
      )}

      {/* Teams overview */}
      {tournament.teamMode === "RANDOM_PER_ROUND" ? (
        <Card>
          <CardHeader>
            <CardTitle>Equipas Aleatórias por Ronda</CardTitle>
          </CardHeader>
          <div className="px-1 pb-1">
            <p className="text-sm text-text-muted mb-3 font-medium">
              Cada ronda tem equipas diferentes geradas aleatoriamente.
              {tournament.numberOfRounds && ` ${tournament.numberOfRounds} rondas configuradas.`}
            </p>
            {tournament.rounds.length > 0 ? (
              <div className="space-y-3">
                {tournament.rounds.map((round: any) => {
                  const roundTeams = tournament.teams.filter((t: any) => t.roundId === round.id);
                  if (roundTeams.length === 0) return null;
                  return (
                    <div key={round.id} className="border border-border rounded-xl p-3">
                      <p className="text-sm font-bold mb-2">Ronda {round.index}</p>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {roundTeams.map((team: any) => (
                          <div key={team.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-surface-alt rounded-lg text-xs font-medium">
                            <span>{team.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-text-muted">Equipas serão geradas ao publicar o calendário.</p>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Equipas</CardTitle>
          </CardHeader>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {tournament.teams.map((team) => (
              <div
                key={team.id}
                className="flex items-center gap-3 px-3 py-2.5 bg-surface-alt rounded-xl text-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {team.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-sm">{team.name}</span>
                  <span className="text-text-muted text-xs ml-1.5">
                    {team.player1.nickname || team.player1.fullName.split(" ")[0]}
                    {team.player2 && (
                      <>
                        {" & "}
                        {team.player2.nickname || team.player2.fullName.split(" ")[0]}
                      </>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Inscriptions */}
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
                    className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm ${
                      insc.status === "DESISTIU" ? "bg-red-50 line-through text-text-muted" : "bg-surface-alt"
                    }`}
                  >
                    <span className={insc.status === "DESISTIU" ? "text-text-muted" : "font-semibold"}>
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

      {/* Schedule */}
      {tournament.rounds.length === 0 ? (
        <EmptyState
          title="Sem calendário"
          description="Gere o calendário para começar a registar resultados."
        />
      ) : (
        <ScheduleView
          rounds={tournament.rounds}
          numberOfSets={tournament.numberOfSets}
          canManage={canManage}
          startDate={tournament.startDate ? tournament.startDate.toString() : null}
          currentPlayerId={currentPlayerId ?? undefined}
          currentUserId={currentUserId ?? undefined}
          pendingSubmissionsMap={pendingSubmissionsMap}
          tournamentName={tournament.name}
          seasonName={tournament.season.name}
          tournamentId={tournament.id}
        />
      )}
    </div>
  );
}
