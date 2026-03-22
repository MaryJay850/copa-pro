"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RankingTable } from "@/components/ranking-table";
import { RecentResults } from "@/components/recent-results";
import { EmptyState } from "@/components/ui/empty-state";
import { OnboardingTour } from "@/components/onboarding-tour";
import Link from "next/link";

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
  data,
}: {
  data: DashboardData;
}) {

  return (
    <div className="space-y-8 animate-fade-in-up">
      <OnboardingTour />

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

        </>
      )}
    </div>
  );
}
