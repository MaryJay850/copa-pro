"use client";

import { useState, useEffect } from "react";
import { getPlayerStats } from "@/lib/actions";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type PlayerStatsData = {
  player: {
    id: string;
    fullName: string;
    nickname: string | null;
    elo: number;
  };
  stats: {
    totalMatches: number;
    wins: number;
    losses: number;
    winRate: number;
    setsWon: number;
    setsLost: number;
    setDiff: number;
    totalPoints: number;
    tournamentsPlayed: number;
  };
  topPartners: Array<{ name: string; played: number; wins: number }>;
  topOpponents: Array<{ name: string; played: number; wins: number }>;
  recentMatches: Array<{
    id: string;
    tournamentName: string;
    tournamentId?: string;
    partner: string | null;
    opponents: string[];
    won: boolean;
    score: string;
  }>;
};

export function PlayerStatsSection({ playerId }: { playerId: string }) {
  const [data, setData] = useState<PlayerStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPlayerStats(playerId)
      .then((d) => setData(d as PlayerStatsData))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [playerId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-lg border border-border p-4 animate-pulse h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <div className="flex items-center justify-center h-32 text-text-muted text-sm">
          Sem dados disponíveis.
        </div>
      </Card>
    );
  }

  const { stats, topPartners, topOpponents, recentMatches } = data;

  return (
    <div className="space-y-6">
      {/* Extended Stats Grid */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Jogos"
          value={stats.totalMatches}
          icon={
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          color="primary"
        />
        <StatCard
          label="Vitórias"
          value={stats.wins}
          icon={
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="success"
        />
        <StatCard
          label="Win Rate"
          value={stats.totalMatches > 0 ? `${stats.winRate}%` : "\u2014"}
          icon={
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          }
          color="accent"
        />
        <StatCard
          label="Sets +/-"
          value={`${stats.setDiff > 0 ? "+" : ""}${stats.setDiff}`}
          sublabel={`${stats.setsWon}G / ${stats.setsLost}P`}
          icon={
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          color={stats.setDiff > 0 ? "success" : stats.setDiff < 0 ? "danger" : "primary"}
        />
        <StatCard
          label="Pontos"
          value={stats.totalPoints}
          icon={
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="info"
        />
        <StatCard
          label="Torneios"
          value={stats.tournamentsPlayed}
          icon={
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
          color="primary"
        />
      </div>

      {/* Win/Loss Bar */}
      {stats.totalMatches > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vitórias / Derrotas</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-success w-8 text-right">{stats.wins}</span>
              <div className="flex-1 h-6 bg-surface-alt rounded-full overflow-hidden flex">
                {stats.wins > 0 && (
                  <div
                    className="h-full bg-gradient-to-r from-success/80 to-success rounded-l-full flex items-center justify-center transition-all duration-500"
                    style={{ width: `${(stats.wins / stats.totalMatches) * 100}%` }}
                  >
                    {stats.winRate >= 15 && (
                      <span className="text-[10px] font-bold text-white">{stats.winRate}%</span>
                    )}
                  </div>
                )}
                {stats.losses > 0 && (
                  <div
                    className="h-full bg-gradient-to-r from-danger/80 to-danger rounded-r-full flex items-center justify-center transition-all duration-500"
                    style={{ width: `${(stats.losses / stats.totalMatches) * 100}%` }}
                  >
                    {(100 - stats.winRate) >= 15 && (
                      <span className="text-[10px] font-bold text-white">{100 - stats.winRate}%</span>
                    )}
                  </div>
                )}
              </div>
              <span className="text-xs font-semibold text-danger w-8">{stats.losses}</span>
            </div>
            <div className="flex justify-between text-[11px] text-text-muted px-11">
              <span>Vitórias</span>
              <span>Derrotas</span>
            </div>
          </div>
        </Card>
      )}

      {/* Partners & Opponents side by side */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Partners */}
        {topPartners.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <CardTitle>Parceiros Frequentes</CardTitle>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-text-muted uppercase tracking-wider font-semibold">
                    <th className="pb-2 pr-3">Jogador</th>
                    <th className="pb-2 pr-3 text-center">Jogos</th>
                    <th className="pb-2 pr-3 text-center">V</th>
                    <th className="pb-2 text-center">%</th>
                  </tr>
                </thead>
                <tbody>
                  {topPartners.map((p, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-surface-alt transition-colors">
                      <td className="py-2 pr-3 font-semibold">{p.name}</td>
                      <td className="py-2 pr-3 text-center text-text-muted tabular-nums">{p.played}</td>
                      <td className="py-2 pr-3 text-center text-success font-semibold tabular-nums">{p.wins}</td>
                      <td className="py-2 text-center">
                        <Badge variant={p.wins / p.played >= 0.5 ? "success" : "warning"}>
                          {Math.round((p.wins / p.played) * 100)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Top Opponents */}
        {topOpponents.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <CardTitle>Adversários Frequentes</CardTitle>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-text-muted uppercase tracking-wider font-semibold">
                    <th className="pb-2 pr-3">Jogador</th>
                    <th className="pb-2 pr-3 text-center">Jogos</th>
                    <th className="pb-2 pr-3 text-center">V</th>
                    <th className="pb-2 text-center">%</th>
                  </tr>
                </thead>
                <tbody>
                  {topOpponents.map((o, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-surface-alt transition-colors">
                      <td className="py-2 pr-3 font-semibold">{o.name}</td>
                      <td className="py-2 pr-3 text-center text-text-muted tabular-nums">{o.played}</td>
                      <td className="py-2 pr-3 text-center text-success font-semibold tabular-nums">{o.wins}</td>
                      <td className="py-2 text-center">
                        <Badge variant={o.wins / o.played >= 0.5 ? "success" : "danger"}>
                          {Math.round((o.wins / o.played) * 100)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Recent Match History */}
      {recentMatches.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Últimas Partidas</CardTitle>
              <span className="text-xs text-text-muted">{recentMatches.length} jogos</span>
            </div>
          </CardHeader>
          <div className="space-y-1.5">
            {recentMatches.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 px-3 py-2 bg-surface-alt rounded-lg"
              >
                {/* Result indicator */}
                <div className={`w-1 h-8 rounded-full flex-shrink-0 ${m.won ? "bg-success" : "bg-danger"}`} />

                {/* Result badge */}
                <Badge
                  variant={m.won ? "success" : "default"}
                  className="w-10 text-center text-[10px] flex-shrink-0"
                >
                  {m.won ? "V" : "D"}
                </Badge>

                {/* Match info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {m.partner && (
                      <span className="text-xs text-text-muted">
                        c/ {m.partner}
                      </span>
                    )}
                    <span className="text-xs font-medium">
                      vs {m.opponents.join(" & ")}
                    </span>
                  </div>
                  <span className="text-[11px] text-text-muted">{m.tournamentName}</span>
                </div>

                {/* Score */}
                <span className="text-xs font-mono text-text-muted whitespace-nowrap">
                  {m.score}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sublabel,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ReactNode;
  color: "primary" | "success" | "danger" | "accent" | "info";
}) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    primary: { bg: "bg-primary/10", text: "text-primary" },
    success: { bg: "bg-success/10", text: "text-success" },
    danger: { bg: "bg-danger/10", text: "text-danger" },
    accent: { bg: "bg-accent/10", text: "text-accent" },
    info: { bg: "bg-[rgba(87,102,218,0.1)]", text: "text-[#5766da]" },
  };

  const c = colorMap[color];

  return (
    <div className="bg-surface rounded-lg border border-border p-3.5 shadow-[0_0_24px_0_rgba(0,0,0,0.06),0_1px_0_0_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}>
          <span className={c.text}>{icon}</span>
        </div>
        <div>
          <p className="text-lg font-extrabold text-text tabular-nums leading-tight">{value}</p>
          <p className="text-[10px] text-text-muted font-medium leading-tight">{label}</p>
          {sublabel && <p className="text-[9px] text-text-muted leading-tight">{sublabel}</p>}
        </div>
      </div>
    </div>
  );
}
