"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EloChart } from "@/components/elo-chart";
import { MatchHistorySection } from "@/components/match-history";
import Link from "next/link";

type MyDashboardData = {
  player: {
    id: string;
    fullName: string;
    nickname: string | null;
    eloRating: number;
  } | null;
  myStats: {
    position: number;
    totalPlayers: number;
    pointsTotal: number;
    matchesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    setsWon: number;
    setsLost: number;
    setsDiff: number;
    winRate: number;
  } | null;
  leagues: { id: string; name: string }[];
  activeLeague: { id: string; name: string } | null;
  activeSeason?: { id: string; name: string } | null;
  rankings: {
    position: number;
    playerId?: string;
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
  myRecentMatches: any[];
  activeTournaments: any[];
  headToHead: {
    opponentName: string;
    played: number;
    wins: number;
    losses: number;
  }[];
  allTournaments: { id: string; name: string; status: string }[];
};

function playerDisplayName(p: { fullName: string; nickname: string | null }) {
  return p.nickname || p.fullName;
}

export function DashboardContent({ data }: { data: MyDashboardData | null }) {
  if (!data || !data.activeLeague) {
    return (
      <div className="animate-fade-in-up">
        <Card className="text-center py-12">
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
      </div>
    );
  }

  const { player, myStats, rankings, myRecentMatches, activeLeague, activeSeason, headToHead, allTournaments } = data;
  const displayName = player ? (player.nickname || player.fullName) : "Utilizador";
  const initials = player
    ? player.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <div className="animate-fade-in-up">
      {/* ─── Main Grid: Content (left) + Sidebar (right) ─── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ─── LEFT: Main Content ─── */}
        <div className="space-y-5 min-w-0">
          {/* Player Header */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary-light to-success" />
            <div className="pt-3 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white text-xl font-extrabold shadow-md flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-text tracking-tight truncate">{player?.fullName || displayName}</h2>
                {player?.nickname && (
                  <p className="text-sm text-text-muted">&quot;{player.nickname}&quot;</p>
                )}
                {myStats && (
                  <Badge variant={myStats.winRate >= 50 ? "success" : "warning"}>
                    {myStats.winRate}% win rate
                  </Badge>
                )}
              </div>
            </div>
          </Card>

          {/* Stat Cards Row */}
          {myStats && (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              <Card className="stat-card stat-card-blue py-3 px-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4.5 h-4.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-text tabular-nums">{myStats.matchesPlayed}</p>
                  <p className="text-[11px] text-text-muted font-medium">Jogos</p>
                </div>
              </Card>
              <Card className="stat-card stat-card-green py-3 px-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4.5 h-4.5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-text tabular-nums">{myStats.wins}</p>
                  <p className="text-[11px] text-text-muted font-medium">Vitórias</p>
                </div>
              </Card>
              <Card className="stat-card stat-card-red py-3 px-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-danger/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4.5 h-4.5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-text tabular-nums">{myStats.losses}</p>
                  <p className="text-[11px] text-text-muted font-medium">Derrotas</p>
                </div>
              </Card>
              <Card className="stat-card stat-card-amber py-3 px-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4.5 h-4.5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-text tabular-nums">{myStats.winRate}%</p>
                  <p className="text-[11px] text-text-muted font-medium">Win Rate</p>
                </div>
              </Card>
            </div>
          )}

          {/* Sets Stats */}
          {myStats && (
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas de Sets</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="py-2">
                  <p className="text-xl font-extrabold tabular-nums text-success">{myStats.setsWon}</p>
                  <p className="text-xs text-text-muted font-medium mt-0.5">Ganhos</p>
                </div>
                <div className="py-2">
                  <p className="text-xl font-extrabold tabular-nums text-danger">{myStats.setsLost}</p>
                  <p className="text-xs text-text-muted font-medium mt-0.5">Perdidos</p>
                </div>
                <div className="py-2">
                  <p className={`text-xl font-extrabold tabular-nums ${myStats.setsDiff > 0 ? "text-success" : myStats.setsDiff < 0 ? "text-danger" : "text-text-muted"}`}>
                    {myStats.setsDiff > 0 ? "+" : ""}{myStats.setsDiff}
                  </p>
                  <p className="text-xs text-text-muted font-medium mt-0.5">Diferença</p>
                </div>
              </div>
            </Card>
          )}

          {/* Elo Evolution */}
          {player && (
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Evolução Elo</CardTitle>
                <span className="text-sm text-text-muted">
                  Rating Atual: <span className="font-bold text-text tabular-nums">{Math.round(player.eloRating)}</span>
                </span>
              </CardHeader>
              <EloChart playerId={player.id} currentRating={player.eloRating} />
            </Card>
          )}

          {/* Head-to-Head */}
          {headToHead.length > 0 && (
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Frente a Frente</CardTitle>
                {player && (
                  <Link
                    href={`/jogadores/${player.id}`}
                    className="text-sm text-primary hover:text-primary-dark font-semibold transition-colors"
                  >
                    Ver tudo
                  </Link>
                )}
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
                    {headToHead.map((h) => {
                      const pct = h.played > 0 ? Math.round((h.wins / h.played) * 100) : 0;
                      return (
                        <tr key={h.opponentName} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
                          <td className="py-2.5 pr-3 font-semibold">{h.opponentName}</td>
                          <td className="py-2.5 pr-3 text-center text-text-muted tabular-nums">{h.played}</td>
                          <td className="py-2.5 pr-3 text-center text-success font-semibold tabular-nums">{h.wins}</td>
                          <td className="py-2.5 pr-3 text-center text-danger font-semibold tabular-nums">{h.losses}</td>
                          <td className="py-2.5 text-center">
                            <Badge variant={h.wins > h.losses ? "success" : h.wins < h.losses ? "danger" : "warning"}>
                              {pct}%
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Match History */}
          {player && <MatchHistorySection playerId={player.id} />}
        </div>

        {/* ─── RIGHT: Sidebar ─── */}
        <div className="space-y-5">
          {/* Liga selector */}
          <Card className="py-4 px-4">
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Liga</label>
            <Link href={`/ligas/${activeLeague.id}`} className="text-sm font-semibold text-text mt-1 hover:text-primary transition-colors block">{activeLeague.name}</Link>
          </Card>

          {/* Torneio info */}
          {allTournaments.length > 0 && (
            <Card className="py-4 px-4">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Torneio</label>
              <p className="text-sm font-semibold text-text mt-1 truncate">{allTournaments[0]?.name}</p>
            </Card>
          )}

          {/* My mini-profile card */}
          {player && myStats && (
            <Card className="py-4 px-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-text truncate">{displayName}</p>
                  <p className="text-[11px] text-text-muted">#{myStats.position} no ranking</p>
                </div>
                <span className="text-lg font-extrabold text-primary tabular-nums">{myStats.pointsTotal}</span>
              </div>
              <div className="grid grid-cols-6 gap-1 text-center text-[10px]">
                <div>
                  <p className="font-bold text-text tabular-nums">{myStats.matchesPlayed}</p>
                  <p className="text-text-muted">JGS</p>
                </div>
                <div>
                  <p className="font-bold text-success tabular-nums">{myStats.wins}</p>
                  <p className="text-text-muted">V</p>
                </div>
                <div>
                  <p className="font-bold text-warning tabular-nums">{myStats.draws}</p>
                  <p className="text-text-muted">E</p>
                </div>
                <div>
                  <p className="font-bold text-danger tabular-nums">{myStats.losses}</p>
                  <p className="text-text-muted">D</p>
                </div>
                <div>
                  <p className={`font-bold tabular-nums ${myStats.winRate >= 50 ? "text-success" : "text-danger"}`}>{myStats.winRate}%</p>
                  <p className="text-text-muted">WIN</p>
                </div>
                <div>
                  <p className="font-bold text-text tabular-nums">{myStats.setsWon}-{myStats.setsLost}</p>
                  <p className="text-text-muted">SETS</p>
                </div>
              </div>
            </Card>
          )}

          {/* Ranking */}
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Ranking</h3>
              {activeLeague && activeSeason && (
                <Link
                  href={`/ligas/${activeLeague.id}/epocas/${activeSeason.id}`}
                  className="text-xs text-primary hover:text-primary-dark font-semibold transition-colors"
                >
                  Ver tudo
                </Link>
              )}
            </div>
            {rankings.length > 0 ? (
              <div className="divide-y divide-border">
                {rankings.slice(0, 8).map((r) => {
                  const isMe = player && r.playerId === player.id;
                  return (
                    <div
                      key={r.position}
                      className={`flex items-center gap-2.5 px-4 py-2.5 transition-colors ${
                        isMe ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-surface-hover"
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                        r.position === 1
                          ? "bg-warning/20 text-warning"
                          : r.position === 2
                            ? "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                            : r.position === 3
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-surface-hover text-text-muted"
                      }`}>
                        {r.position}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isMe ? "text-primary" : "text-text"}`}>
                          {r.playerName}
                        </p>
                        <p className="text-[10px] text-text-muted tabular-nums">
                          {r.wins}V {r.draws}E {r.losses}D
                        </p>
                      </div>
                      <span className={`text-sm font-extrabold tabular-nums ${isMe ? "text-primary" : "text-text"}`}>
                        {r.pointsTotal}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-xs text-text-muted">Sem ranking disponível.</div>
            )}
          </Card>

          {/* My Recent Results (compact) */}
          {myRecentMatches.length > 0 && (
            <Card className="p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Os Meus Últimos Resultados</h3>
              </div>
              <div className="grid grid-cols-2 gap-px bg-border">
                {myRecentMatches.slice(0, 6).map((match: any) => {
                  const isTeamA = player && (
                    match.teamA?.player1?.id === player.id ||
                    match.teamA?.player2?.id === player.id
                  );

                  const setsA = [
                    match.set1A != null && match.set1B != null && match.set1A > match.set1B ? 1 : 0,
                    match.set2A != null && match.set2B != null && match.set2A > match.set2B ? 1 : 0,
                    match.set3A != null && match.set3B != null && match.set3A > match.set3B ? 1 : 0,
                  ].reduce((a: number, b: number) => a + b, 0);
                  const setsB = [
                    match.set1A != null && match.set1B != null && match.set1B > match.set1A ? 1 : 0,
                    match.set2A != null && match.set2B != null && match.set2B > match.set2A ? 1 : 0,
                    match.set3A != null && match.set3B != null && match.set3B > match.set3A ? 1 : 0,
                  ].reduce((a: number, b: number) => a + b, 0);

                  const myWon = isTeamA ? setsA > setsB : setsB > setsA;
                  const isDraw = setsA === setsB;

                  const scores: string[] = [];
                  if (match.set1A != null && match.set1B != null) scores.push(`${match.set1A}-${match.set1B}`);
                  if (match.set2A != null && match.set2B != null) scores.push(`${match.set2A}-${match.set2B}`);
                  if (match.set3A != null && match.set3B != null) scores.push(`${match.set3A}-${match.set3B}`);

                  return (
                    <div key={match.id} className="bg-surface p-3 space-y-1.5">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        isDraw
                          ? "bg-warning/15 text-warning"
                          : myWon
                            ? "bg-success/15 text-success"
                            : "bg-danger/15 text-danger"
                      }`}>
                        {isDraw ? "Empate" : myWon ? "Vitória" : "Derrota"}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {scores.map((s, i) => (
                          <span key={i} className="bg-surface-hover rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-text">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
