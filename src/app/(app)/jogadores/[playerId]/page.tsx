export const dynamic = "force-dynamic";

import { getPlayerProfile } from "@/lib/actions";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EloChart } from "@/components/elo-chart";
import { MatchHistorySection } from "@/components/match-history";
import { PlayerStatsSection } from "@/components/player-stats";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PlayerProfileTabs } from "./tabs";

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  const profile = await getPlayerProfile(playerId);

  if (!profile) notFound();

  const initials = profile.fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const winRate = profile.stats.totalMatches > 0
    ? Math.round((profile.stats.wins / profile.stats.totalMatches) * 100)
    : 0;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-text-muted mb-2 font-medium">
          <Link href="/dashboard" className="hover:text-primary transition-colors">Painel</Link>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="text-2xl font-extrabold text-white">{initials}</span>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{profile.fullName}</h1>
            {profile.nickname && (
              <p className="text-sm text-text-muted font-medium">&quot;{profile.nickname}&quot;</p>
            )}
            {profile.stats.totalMatches > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={winRate >= 50 ? "success" : "warning"}>
                  {winRate}% win rate
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <PlayerProfileTabs
        playerId={playerId}
        overviewContent={
          <>
            {/* Overall Stats */}
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
              <Card className="stat-card stat-card-blue py-4 px-5 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-text tabular-nums">{profile.stats.totalMatches}</p>
                  <p className="text-xs text-text-muted font-medium">Jogos</p>
                </div>
              </Card>
              <Card className="stat-card stat-card-green py-4 px-5 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-text tabular-nums">{profile.stats.wins}</p>
                  <p className="text-xs text-text-muted font-medium">Vitórias</p>
                </div>
              </Card>
              <Card className="stat-card stat-card-red py-4 px-5 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-text tabular-nums">{profile.stats.losses}</p>
                  <p className="text-xs text-text-muted font-medium">Derrotas</p>
                </div>
              </Card>
              <Card className="stat-card stat-card-amber py-4 px-5 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-text tabular-nums">
                    {profile.stats.totalMatches > 0 ? `${winRate}%` : "\u2014"}
                  </p>
                  <p className="text-xs text-text-muted font-medium">Win Rate</p>
                </div>
              </Card>
            </div>

            {/* Sets Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas de Sets</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="py-2">
                  <p className="text-xl font-extrabold tabular-nums text-success">{profile.stats.setsWon}</p>
                  <p className="text-xs text-text-muted font-medium mt-0.5">Ganhos</p>
                </div>
                <div className="py-2">
                  <p className="text-xl font-extrabold tabular-nums text-danger">{profile.stats.setsLost}</p>
                  <p className="text-xs text-text-muted font-medium mt-0.5">Perdidos</p>
                </div>
                <div className="py-2">
                  <p className={`text-xl font-extrabold tabular-nums font-mono ${profile.stats.setsWon - profile.stats.setsLost > 0 ? "text-success" : profile.stats.setsWon - profile.stats.setsLost < 0 ? "text-danger" : "text-text-muted"}`}>
                    {profile.stats.setsWon - profile.stats.setsLost > 0 ? "+" : ""}
                    {profile.stats.setsWon - profile.stats.setsLost}
                  </p>
                  <p className="text-xs text-text-muted font-medium mt-0.5">Diferença</p>
                </div>
              </div>
            </Card>

            {/* Leagues */}
            {profile.leagues.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Ligas</CardTitle>
                </CardHeader>
                <div className="space-y-1">
                  {profile.leagues.map((l) => (
                    <Link key={l.id} href={`/ligas/${l.id}`} className="flex items-center gap-3 hover:bg-surface-alt rounded-xl px-3 py-2.5 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-sm font-semibold">{l.name}</span>
                        {l.location && <span className="text-xs text-text-muted ml-2">{l.location}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            )}

            {/* Elo Evolution */}
            <Card>
              <CardHeader>
                <CardTitle>Evolução Elo</CardTitle>
              </CardHeader>
              <EloChart playerId={playerId} currentRating={profile.eloRating} />
            </Card>

            {/* Match History */}
            <MatchHistorySection playerId={playerId} />

            {/* Head-to-Head */}
            {profile.headToHead.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Frente a Frente</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-text-muted uppercase tracking-wider font-semibold">
                        <th className="pb-2.5 pr-3">Adversário</th>
                        <th className="pb-2.5 pr-3 text-center">Jogos</th>
                        <th className="pb-2.5 pr-3 text-center">V</th>
                        <th className="pb-2.5 pr-3 text-center">D</th>
                        <th className="pb-2.5 text-center">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.headToHead.map((h) => (
                        <tr key={h.opponentName} className="border-b border-border/50 hover:bg-surface-alt transition-colors">
                          <td className="py-2.5 pr-3 font-semibold">{h.opponentName}</td>
                          <td className="py-2.5 pr-3 text-center text-text-muted tabular-nums">{h.played}</td>
                          <td className="py-2.5 pr-3 text-center text-success font-semibold tabular-nums">{h.wins}</td>
                          <td className="py-2.5 pr-3 text-center text-danger font-semibold tabular-nums">{h.losses}</td>
                          <td className="py-2.5 text-center">
                            <Badge variant={h.wins > h.losses ? "success" : h.wins < h.losses ? "danger" : "warning"}>
                              {h.played > 0 ? `${Math.round((h.wins / h.played) * 100)}%` : "\u2014"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        }
        statsContent={
          <PlayerStatsSection playerId={playerId} />
        }
      />
    </div>
  );
}
