import Link from "next/link";

type RankingEntry = {
  position: number;
  playerName: string;
  pointsTotal: number;
  matchesPlayed: number;
  wins: number;
};

type RecentMatch = {
  teamA: string;
  teamB: string;
  score: string;
  round: number;
};

type HeroProps = {
  leagueName: string | null;
  seasonName: string | null;
  rankings: RankingEntry[];
  recentMatches: RecentMatch[];
};

export function HeroSection({ leagueName, seasonName, rankings, recentMatches }: HeroProps) {
  const hasData = rankings.length > 0;

  return (
    <section className="relative overflow-hidden bg-surface">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-accent/[0.03]" />

      <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — Copy */}
          <div className="space-y-8 animate-fade-in-up">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold leading-[1.1] tracking-tight text-text">
                As ligas de Padel merecem mais do que folhas{" "}
                <span className="bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">Excel.</span>
              </h1>
              <p className="text-lg text-text-muted leading-relaxed max-w-lg">
                Organize equipas, gere calendários Round Robin e acompanhe
                rankings individuais por época com total transparência.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/ligas"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary to-primary-light px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-[0.98]"
              >
                Criar Liga
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl bg-surface px-7 py-3.5 text-sm font-semibold text-text border border-border shadow-sm hover:bg-surface-hover hover:border-primary/30 transition-all"
              >
                Ver Demonstração
              </Link>
            </div>
          </div>

          {/* Right — Live data or empty state */}
          <div className="hidden lg:block animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <div className="relative">
              {/* Background glow */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-primary/5 via-transparent to-accent/5 rounded-3xl" />

              <div className="relative space-y-4">
                {/* Ranking table */}
                <div className="bg-surface rounded-2xl border border-border shadow-lg shadow-border/50 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-2 h-2 rounded-full ${hasData ? "bg-success" : "bg-border"}`} />
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                      {hasData
                        ? `Ranking — ${seasonName}`
                        : "Ranking — Sem dados"}
                    </span>
                  </div>

                  {hasData ? (
                    <div className="space-y-0">
                      {rankings.map((r) => (
                        <div
                          key={r.position}
                          className="flex items-center justify-between py-2.5 border-b border-border-light last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                r.position === 1
                                  ? "bg-primary/10 text-primary"
                                  : "bg-surface-hover text-text-muted"
                              }`}
                            >
                              {r.position}
                            </span>
                            <span className="text-sm font-medium text-text">
                              {r.playerName}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-text-muted">
                              {r.matchesPlayed}J {r.wins}V
                            </span>
                            <span
                              className={`text-sm font-bold tabular-nums ${
                                r.position === 1 ? "text-primary" : "text-text"
                              }`}
                            >
                              {r.pointsTotal} pts
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-sm text-text-muted">
                        Crie uma liga e registe resultados para ver o ranking aqui.
                      </p>
                    </div>
                  )}
                </div>

                {/* Recent matches + league info */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Recent matches block */}
                  <div className="bg-surface rounded-2xl border border-border shadow-lg shadow-border/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-2 h-2 rounded-full ${recentMatches.length > 0 ? "bg-accent" : "bg-border"}`} />
                      <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                        {recentMatches.length > 0
                          ? "Últimos Resultados"
                          : "Resultados"}
                      </span>
                    </div>
                    {recentMatches.length > 0 ? (
                      <div className="space-y-2">
                        {recentMatches.map((m, i) => (
                          <div
                            key={i}
                            className="flex flex-col gap-0.5 text-xs py-1.5 border-b border-border-light last:border-0"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-text font-medium truncate max-w-[120px]">
                                {m.teamA}
                              </span>
                              <span className="font-mono text-text-muted text-[10px]">
                                R{m.round}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-text font-medium truncate max-w-[120px]">
                                {m.teamB}
                              </span>
                              <span className="font-mono text-primary font-semibold">
                                {m.score}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-4 text-center">
                        <p className="text-[11px] text-text-muted">
                          Sem jogos registados
                        </p>
                      </div>
                    )}
                  </div>

                  {/* League info card */}
                  <div className="bg-surface rounded-2xl border border-border shadow-lg shadow-border/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-2 h-2 rounded-full ${hasData ? "bg-primary-light" : "bg-border"}`} />
                      <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Liga
                      </span>
                    </div>
                    {hasData ? (
                      <div className="text-center space-y-2 py-2">
                        <div className="text-sm font-semibold text-text">
                          {leagueName}
                        </div>
                        <div className="text-xs text-text-muted">
                          {seasonName}
                        </div>
                        <div className="flex justify-center gap-4 mt-2">
                          <div className="text-center">
                            <div className="text-lg font-bold text-primary tabular-nums">
                              {rankings.length}
                            </div>
                            <div className="text-[10px] text-text-muted uppercase">
                              Jogadores
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-accent tabular-nums">
                              {rankings.reduce((sum, r) => sum + r.matchesPlayed, 0)}
                            </div>
                            <div className="text-[10px] text-text-muted uppercase">
                              Jogos
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center">
                        <p className="text-[11px] text-text-muted">
                          Nenhuma liga ativa
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
