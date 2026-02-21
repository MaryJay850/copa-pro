"use client";

import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RankingTable } from "@/components/ranking-table";
import { RecentResults } from "@/components/recent-results";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import { EmptyState } from "@/components/ui/empty-state";
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
      // Reset child filters
    } else if (key === "epoca") {
      if (activeLeague) params.set("liga", activeLeague.id);
      if (value) params.set("epoca", value);
      // Reset tournament filter
    } else if (key === "torneio") {
      if (activeLeague) params.set("liga", activeLeague.id);
      if (activeSeason) params.set("epoca", activeSeason.id);
      if (value) params.set("torneio", value);
    }
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <div className="space-y-8">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center bg-surface rounded-xl border border-border p-4">
        <span className="text-sm font-medium text-text-muted">Filtros:</span>

        <select
          value={activeLeague?.id ?? ""}
          onChange={(e) => handleFilterChange("liga", e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Todas as Ligas</option>
          {filters.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>

        <select
          value={activeSeason?.id ?? ""}
          onChange={(e) => handleFilterChange("epoca", e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          disabled={!activeSeason}
        >
          <option value="">Todos os Torneios</option>
          {activeTournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
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
          {/* Active league banner */}
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <span>A mostrar:</span>
            <Link
              href={`/ligas/${data.league.id}`}
              className="font-medium text-text hover:text-primary transition-colors"
            >
              {data.league.name}
            </Link>
            {data.season && (
              <>
                <span>·</span>
                <Link
                  href={`/ligas/${data.league.id}/epocas/${data.season.id}`}
                  className="font-medium text-text hover:text-primary transition-colors"
                >
                  {data.season.name}
                </Link>
              </>
            )}
          </div>

          {/* Quick Stats */}
          {data.rankings.length > 0 && (() => {
            const totalMatches = data.rankings.reduce((s, r) => s + r.matchesPlayed, 0);
            const totalWins = data.rankings.reduce((s, r) => s + r.wins, 0);
            const totalSetsWon = data.rankings.reduce((s, r) => s + r.setsWon, 0);
            const totalSetsLost = data.rankings.reduce((s, r) => s + r.setsLost, 0);
            const topPlayer = data.rankings[0];
            return (
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                <Card className="text-center py-3">
                  <p className="text-2xl font-bold text-primary">{data.rankings.length}</p>
                  <p className="text-xs text-text-muted">Jogadores</p>
                </Card>
                <Card className="text-center py-3">
                  <p className="text-2xl font-bold text-emerald-600">{Math.round(totalMatches / 2)}</p>
                  <p className="text-xs text-text-muted">Jogos Totais</p>
                </Card>
                <Card className="text-center py-3">
                  <p className="text-2xl font-bold text-accent">{totalSetsWon + totalSetsLost}</p>
                  <p className="text-xs text-text-muted">Sets Disputados</p>
                </Card>
                <Card className="text-center py-3">
                  <p className="text-lg font-bold text-primary">{topPlayer?.playerName ?? "—"}</p>
                  <p className="text-xs text-text-muted">Líder ({topPlayer?.pointsTotal ?? 0} pts)</p>
                </Card>
              </div>
            );
          })()}

          {/* Active Tournaments */}
          {data.activeTournaments.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Torneios em Curso
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.activeTournaments.map((t) => {
                  const pct =
                    t.totalMatches > 0
                      ? Math.round(
                          (t.finishedMatches / t.totalMatches) * 100
                        )
                      : 0;
                  return (
                    <Link key={t.id} href={`/torneios/${t.id}`}>
                      <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{t.name}</h3>
                          <Badge
                            variant={
                              t.status === "RUNNING" ? "warning" : "info"
                            }
                          >
                            {t.status === "RUNNING"
                              ? "A decorrer"
                              : "Publicado"}
                          </Badge>
                        </div>
                        <div className="flex gap-3 text-xs text-text-muted mb-3">
                          <span>{t.teamsCount} equipas</span>
                          <span>
                            {t.finishedMatches}/{t.totalMatches} jogos
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-primary rounded-full h-2 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-text-muted mt-1 text-right">
                          {pct}% completo
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
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">
                Ranking {data.season ? `— ${data.season.name}` : ""}
              </h2>
              {data.league && data.season && (
                <Link
                  href={`/ligas/${data.league.id}/epocas/${data.season.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  Ver completo →
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
            <h2 className="text-lg font-semibold mb-3">
              Últimos Resultados
            </h2>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <RecentResults matches={data.recentMatches as any} />
          </section>

          {/* Availability Calendar */}
          <section>
            <AvailabilityCalendar />
          </section>
        </>
      )}
    </div>
  );
}
