"use client";

import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RankingTable } from "@/components/ranking-table";
import { RecentResults } from "@/components/recent-results";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import { EmptyState } from "@/components/ui/empty-state";
import { OnboardingTour } from "@/components/onboarding-tour";
import { LeagueAvailabilityView } from "@/components/league-availability-view";
import Link from "next/link";

type FilterOption = {
  id: string;
  name: string;
  seasons: {
    id: string;
    name: string;
    isActive: boolean;
    tournaments: { id: string; name: string; status: string }[];
  }[];
};

type DashboardData = {
  league: { id: string; name: string } | null;
  season: { id: string; name: string } | null;
  rankings: {
    position: number;
    playerName: string;
    pointsTotal: number;
    matchesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    setsWon: number;
    setsLost: number;
    setsDiff: number;
  }[];
  recentMatches: unknown[];
  activeTournaments: {
    id: string;
    name: string;
    status: string;
    totalMatches: number;
    finishedMatches: number;
    teamsCount: number;
  }[];
};

export function DashboardContent({
  filters,
  data,
  selectedLeagueId,
  selectedSeasonId,
  selectedTournamentId,
}: {
  filters: FilterOption[];
  data: DashboardData;
  selectedLeagueId?: string;
  selectedSeasonId?: string;
  selectedTournamentId?: string;
}) {
  const router = useRouter();

  // Find selected league and season for cascading filters
  const activeLeague =
    filters.find((l) => l.id === selectedLeagueId) ??
    filters.find((l) => l.id === data.league?.id) ??
    filters[0];

  const activeSeasons = activeLeague?.seasons ?? [];
  const activeSeason =
    activeSeasons.find((s) => s.id === selectedSeasonId) ??
    activeSeasons.find((s) => s.id === data.season?.id) ??
    activeSeasons.find((s) => s.isActive) ??
    activeSeasons[0];

  const activeTournaments = activeSeason?.tournaments ?? [];

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (key === "liga") {
      if (value) params.set("liga", value);
    } else if (key === "epoca") {
      if (activeLeague) params.set("liga", activeLeague.id);
      if (value) params.set("epoca", value);
    } else if (key === "torneio") {
      if (activeLeague) params.set("liga", activeLeague.id);
      if (activeSeason) params.set("epoca", activeSeason.id);
      if (value) params.set("torneio", value);
    }
    router.push(`/dashboard?${params.toString()}`);
  };

  const selectClass = "rounded-xl border border-border bg-surface px-3.5 py-2 text-sm font-medium transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-primary/30 cursor-pointer";

  return (
    <div className="space-y-8 animate-fade-in-up">
      <OnboardingTour />

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center bg-surface rounded-2xl border border-border p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>

        <select
          value={activeLeague?.id ?? ""}
          onChange={(e) => handleFilterChange("liga", e.target.value)}
          className={selectClass}
        >
          <option value="">Todas as Ligas</option>
          {filters.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>

        <select
          value={activeSeason?.id ?? ""}
          onChange={(e) => handleFilterChange("epoca", e.target.value)}
          className={selectClass}
          disabled={!activeLeague}
        >
          <option value="">Todas as Épocas</option>
          {activeSeasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} {s.isActive ? "(activa)" : ""}
            </option>
          ))}
        </select>

        <select
          value={selectedTournamentId ?? ""}
          onChange={(e) => handleFilterChange("torneio", e.target.value)}
          className={selectClass}
          disabled={!activeSeason}
        >
          <option value="">Todos os Torneios</option>
          {activeTournaments.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {!data.league ? (
        <Card className="text-center py-8">
          <EmptyState
            title="Sem dados disponíveis"
            description="Crie uma liga e um torneio para começar a ver rankings e resultados aqui."
            action={
              <Link href="/ligas">
                <Button>Criar Liga</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          {/* Active league breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <span>A mostrar:</span>
            <Link
              href={`/ligas/${data.league.id}`}
              className="font-semibold text-text hover:text-primary transition-colors"
            >
              {data.league.name}
            </Link>
            {data.season && (
              <>
                <span className="text-border">/</span>
                <Link
                  href={`/ligas/${data.league.id}/epocas/${data.season.id}`}
                  className="font-semibold text-text hover:text-primary transition-colors"
                >
                  {data.season.name}
                </Link>
              </>
            )}
          </div>

          {/* Quick Stats */}
          {data.rankings.length > 0 && (() => {
            const totalMatches = data.rankings.reduce((s, r) => s + r.matchesPlayed, 0);
            const totalSetsWon = data.rankings.reduce((s, r) => s + r.setsWon, 0);
            const totalSetsLost = data.rankings.reduce((s, r) => s + r.setsLost, 0);
            const topPlayer = data.rankings[0];
            return (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                <Card className="stat-card stat-card-blue py-4 px-5 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-text tabular-nums">{data.rankings.length}</p>
                    <p className="text-xs text-text-muted font-medium">Jogadores</p>
                  </div>
                </Card>
                <Card className="stat-card stat-card-green py-4 px-5 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-text tabular-nums">{Math.round(totalMatches / 2)}</p>
                    <p className="text-xs text-text-muted font-medium">Jogos Totais</p>
                  </div>
                </Card>
                <Card className="stat-card stat-card-amber py-4 px-5 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-text tabular-nums">{totalSetsWon + totalSetsLost}</p>
                    <p className="text-xs text-text-muted font-medium">Sets Disputados</p>
                  </div>
                </Card>
                <Card className="stat-card stat-card-purple py-4 px-5 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-extrabold text-text truncate">{topPlayer?.playerName ?? "\u2014"}</p>
                    <p className="text-xs text-text-muted font-medium">Líder ({topPlayer?.pointsTotal ?? 0} pts)</p>
                  </div>
                </Card>
              </div>
            );
          })()}

          {/* Active Tournaments */}
          {data.activeTournaments.length > 0 && (
            <section>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2.5 tracking-tight">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Torneios em Curso
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.activeTournaments.map((t, i) => {
                  const pct =
                    t.totalMatches > 0
                      ? Math.round((t.finishedMatches / t.totalMatches) * 100)
                      : 0;
                  return (
                    <Link key={t.id} href={`/torneios/${t.id}`}>
                      <Card className={`card-hover cursor-pointer animate-fade-in-up stagger-${i + 1}`}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-bold text-text tracking-tight">{t.name}</h3>
                          <Badge
                            variant={t.status === "RUNNING" ? "warning" : "info"}
                            pulse={t.status === "RUNNING"}
                          >
                            {t.status === "RUNNING" ? "A decorrer" : "Publicado"}
                          </Badge>
                        </div>
                        <div className="flex gap-3 text-xs text-text-muted mb-3 font-medium">
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {t.teamsCount} equipas
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            {t.finishedMatches}/{t.totalMatches} jogos
                          </span>
                        </div>
                        <div className="w-full bg-surface-hover rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-primary to-primary-light rounded-full h-2 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-text-muted mt-1.5 text-right font-semibold tabular-nums">
                          {pct}%
                        </p>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Ranking */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold tracking-tight">
                Ranking {data.season ? `\u2014 ${data.season.name}` : ""}
              </h2>
              {data.league && data.season && (
                <Link
                  href={`/ligas/${data.league.id}/epocas/${data.season.id}`}
                  className="text-sm text-primary hover:text-primary-dark font-semibold transition-colors flex items-center gap-1"
                >
                  Ver completo
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              )}
            </div>
            <Card>
              {data.rankings.length > 0 ? (
                <RankingTable rows={data.rankings} />
              ) : (
                <EmptyState
                  title="Sem ranking"
                  description="Complete jogos para ver o ranking individual."
                />
              )}
            </Card>
          </section>

          {/* Recent Results */}
          <section>
            <h2 className="text-lg font-bold mb-4 tracking-tight">
              Últimos Resultados
            </h2>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <RecentResults matches={data.recentMatches as any} />
          </section>

          {/* Availability Calendar */}
          <section>
            <AvailabilityCalendar />
          </section>

          {/* League Availability */}
          {data.league && (
            <section>
              <LeagueAvailabilityView leagueId={data.league.id} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
