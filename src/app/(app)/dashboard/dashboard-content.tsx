"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
  myRecentMatches: {
    id: string;
    set1A: number | null;
    set1B: number | null;
    set2A: number | null;
    set2B: number | null;
    set3A: number | null;
    set3B: number | null;
    resultType: string;
    playedAt: string | null;
    teamA: {
      player1: { id?: string; fullName: string; nickname: string | null };
      player2: { id?: string; fullName: string; nickname: string | null };
    };
    teamB: {
      player1: { id?: string; fullName: string; nickname: string | null };
      player2: { id?: string; fullName: string; nickname: string | null };
    };
    tournament: { id: string; name: string };
  }[];
  activeTournaments: {
    id: string;
    name: string;
    status: string;
    totalMatches: number;
    finishedMatches: number;
    teamsCount: number;
  }[];
};

function playerDisplayName(p: { fullName: string; nickname: string | null }) {
  return p.nickname || p.fullName;
}

function StatBox({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: string | number;
  accent?: string;
  sub?: string;
}) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-extrabold tabular-nums ${accent || "text-text"}`}>{value}</p>
      <p className="text-[11px] text-text-muted font-medium uppercase tracking-wide mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-text-muted">{sub}</p>}
    </div>
  );
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

  const { player, myStats, rankings, myRecentMatches, activeTournaments, activeLeague, activeSeason } = data;
  const displayName = player ? (player.nickname || player.fullName) : "Utilizador";

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* League context */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Link href={`/ligas/${activeLeague.id}`} className="font-semibold text-text hover:text-primary transition-colors">
            {activeLeague.name}
          </Link>
          {activeSeason && (
            <>
              <span className="text-border">/</span>
              <Link
                href={`/ligas/${activeLeague.id}/epocas/${activeSeason.id}`}
                className="font-semibold text-text hover:text-primary transition-colors"
              >
                {activeSeason.name}
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ─── Main grid: Stats (left) + Ranking (right) ─── */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left column: My Stats (3/5 width) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Player profile card */}
          <Card className="relative overflow-hidden">
            {/* Accent top bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary-light to-success" />

            <div className="pt-4">
              {/* Name + position */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white text-xl font-extrabold shadow-md">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-text tracking-tight">{displayName}</h2>
                    {myStats && (
                      <p className="text-sm text-text-muted">
                        <span className="font-semibold text-primary">#{myStats.position}</span>
                        <span className="mx-1">/</span>
                        {myStats.totalPlayers} jogadores
                      </p>
                    )}
                  </div>
                </div>
                {myStats && (
                  <div className="text-right">
                    <p className="text-3xl font-extrabold text-primary tabular-nums">{myStats.pointsTotal}</p>
                    <p className="text-[11px] text-text-muted font-semibold uppercase tracking-wide">Pontos</p>
                  </div>
                )}
              </div>

              {/* Stats grid */}
              {myStats ? (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 pt-4 border-t border-border">
                  <StatBox label="Jogos" value={myStats.matchesPlayed} />
                  <StatBox label="Vitorias" value={myStats.wins} accent="text-success" />
                  <StatBox label="Empates" value={myStats.draws} accent="text-warning" />
                  <StatBox label="Derrotas" value={myStats.losses} accent="text-danger" />
                  <StatBox label="Win Rate" value={`${myStats.winRate}%`} accent={myStats.winRate >= 50 ? "text-success" : "text-danger"} />
                  <StatBox label="Sets" value={`${myStats.setsWon}-${myStats.setsLost}`} sub={`Dif: ${myStats.setsDiff > 0 ? "+" : ""}${myStats.setsDiff}`} />
                </div>
              ) : (
                <div className="pt-4 border-t border-border text-center text-sm text-text-muted py-6">
                  Sem estatísticas para esta época. Participe num torneio para começar.
                </div>
              )}
            </div>
          </Card>

          {/* Active tournaments */}
          {activeTournaments.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                Torneios em Curso
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {activeTournaments.map((t) => {
                  const pct = t.totalMatches > 0 ? Math.round((t.finishedMatches / t.totalMatches) * 100) : 0;
                  return (
                    <Link key={t.id} href={`/torneios/${t.id}`}>
                      <Card className="card-hover cursor-pointer py-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-sm text-text">{t.name}</h4>
                          <Badge variant={t.status === "RUNNING" ? "warning" : "info"} pulse={t.status === "RUNNING"}>
                            {t.status === "RUNNING" ? "A decorrer" : "Publicado"}
                          </Badge>
                        </div>
                        <div className="flex gap-3 text-xs text-text-muted mb-2">
                          <span>{t.teamsCount} equipas</span>
                          <span>{t.finishedMatches}/{t.totalMatches} jogos</span>
                        </div>
                        <div className="w-full bg-surface-hover rounded-full h-1.5">
                          <div
                            className="bg-gradient-to-r from-primary to-primary-light rounded-full h-1.5 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Ranking (2/5 width) */}
        <div className="lg:col-span-2">
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-sm font-bold text-text uppercase tracking-wider">Ranking</h3>
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
                {rankings.slice(0, 10).map((r) => {
                  const isMe = player && r.playerId === player.id;
                  return (
                    <div
                      key={r.position}
                      className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                        isMe ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-surface-hover"
                      }`}
                    >
                      {/* Position */}
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
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

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isMe ? "text-primary" : "text-text"}`}>
                          {r.playerName}
                          {isMe && <span className="ml-1.5 text-[10px] text-primary-light font-bold">(eu)</span>}
                        </p>
                        <p className="text-[11px] text-text-muted">
                          {r.wins}V {r.draws}E {r.losses}D
                        </p>
                      </div>

                      {/* Points */}
                      <span className={`text-sm font-extrabold tabular-nums ${isMe ? "text-primary" : "text-text"}`}>
                        {r.pointsTotal}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-5 py-8 text-center text-sm text-text-muted">
                Sem ranking disponível.
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ─── My Recent Matches ─── */}
      {myRecentMatches.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">
            Os Meus Últimos Resultados
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {myRecentMatches.map((match) => {
              // Determine if player was on team A or B
              const isTeamA = player && (
                match.teamA.player1.id === player.id ||
                (match.teamA.player2 && match.teamA.player2.id === player.id)
              );

              // Calculate set wins per team
              const setsA = [
                match.set1A != null && match.set1B != null && match.set1A > match.set1B ? 1 : 0,
                match.set2A != null && match.set2B != null && match.set2A > match.set2B ? 1 : 0,
                match.set3A != null && match.set3B != null && match.set3A > match.set3B ? 1 : 0,
              ].reduce((a, b) => a + b, 0);
              const setsB = [
                match.set1A != null && match.set1B != null && match.set1B > match.set1A ? 1 : 0,
                match.set2A != null && match.set2B != null && match.set2B > match.set2A ? 1 : 0,
                match.set3A != null && match.set3B != null && match.set3B > match.set3A ? 1 : 0,
              ].reduce((a, b) => a + b, 0);

              const myTeamWon = isTeamA ? setsA > setsB : setsB > setsA;
              const isDraw = setsA === setsB;

              // My partner
              const myTeam = isTeamA ? match.teamA : match.teamB;
              const opponentTeam = isTeamA ? match.teamB : match.teamA;
              const partner = player && myTeam.player1.id === player.id ? myTeam.player2 : myTeam.player1;

              // Score display
              const scores = [];
              if (match.set1A != null && match.set1B != null) scores.push(`${match.set1A}-${match.set1B}`);
              if (match.set2A != null && match.set2B != null) scores.push(`${match.set2A}-${match.set2B}`);
              if (match.set3A != null && match.set3B != null) scores.push(`${match.set3A}-${match.set3B}`);

              return (
                <Card key={match.id} className="py-4 px-4">
                  {/* Result badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                      isDraw
                        ? "bg-warning/15 text-warning"
                        : myTeamWon
                          ? "bg-success/15 text-success"
                          : "bg-danger/15 text-danger"
                    }`}>
                      {isDraw ? "Empate" : myTeamWon ? "Vitória" : "Derrota"}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {match.playedAt
                        ? new Date(match.playedAt).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })
                        : ""}
                    </span>
                  </div>

                  {/* Partner */}
                  <p className="text-xs text-text-muted mb-1">
                    com <span className="font-semibold text-text">{playerDisplayName(partner)}</span>
                  </p>

                  {/* Opponents */}
                  <p className="text-xs text-text-muted mb-3">
                    vs <span className="font-medium">{playerDisplayName(opponentTeam.player1)}</span>
                    {" & "}
                    <span className="font-medium">{playerDisplayName(opponentTeam.player2)}</span>
                  </p>

                  {/* Score */}
                  <div className="flex items-center gap-2">
                    {scores.map((s, i) => (
                      <span key={i} className="bg-surface-hover rounded px-2 py-1 text-xs font-bold tabular-nums text-text">
                        {s}
                      </span>
                    ))}
                  </div>

                  {/* Tournament */}
                  <p className="text-[10px] text-text-muted mt-2 truncate">
                    {match.tournament.name}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
