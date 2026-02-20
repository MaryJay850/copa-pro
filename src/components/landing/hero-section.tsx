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
    <section className="relative overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — Copy */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold leading-[1.1] tracking-tight text-slate-900">
                As ligas de Padel merecem mais do que folhas{" "}
                <span className="text-emerald-600">Excel.</span>
              </h1>
              <p className="text-lg text-slate-500 leading-relaxed max-w-lg">
                Organize equipas, gere calendários Round Robin e acompanhe
                rankings individuais por época com total transparência.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/ligas"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 transition-all hover:shadow-emerald-600/40"
              >
                Criar Liga
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                Ver Demonstração
              </Link>
            </div>
          </div>

          {/* Right — Live data or empty state */}
          <div className="hidden lg:block">
            <div className="relative">
              {/* Background glow */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-50 via-white to-slate-50 rounded-3xl" />

              <div className="relative space-y-4">
                {/* Ranking table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-2 h-2 rounded-full ${hasData ? "bg-emerald-500" : "bg-slate-300"}`} />
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
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
                          className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                r.position === 1
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {r.position}
                            </span>
                            <span className="text-sm font-medium text-slate-700">
                              {r.playerName}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400">
                              {r.matchesPlayed}J {r.wins}V
                            </span>
                            <span
                              className={`text-sm font-bold ${
                                r.position === 1 ? "text-emerald-600" : "text-slate-700"
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
                      <p className="text-sm text-slate-400">
                        Crie uma liga e registe resultados para ver o ranking aqui.
                      </p>
                    </div>
                  )}
                </div>

                {/* Recent matches + league info */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Recent matches block */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-2 h-2 rounded-full ${recentMatches.length > 0 ? "bg-amber-400" : "bg-slate-300"}`} />
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
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
                            className="flex flex-col gap-0.5 text-xs py-1.5 border-b border-slate-100 last:border-0"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600 font-medium truncate max-w-[120px]">
                                {m.teamA}
                              </span>
                              <span className="font-mono text-slate-400 text-[10px]">
                                R{m.round}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600 font-medium truncate max-w-[120px]">
                                {m.teamB}
                              </span>
                              <span className="font-mono text-emerald-600 font-semibold">
                                {m.score}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-4 text-center">
                        <p className="text-[11px] text-slate-400">
                          Sem jogos registados
                        </p>
                      </div>
                    )}
                  </div>

                  {/* League info card */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-2 h-2 rounded-full ${hasData ? "bg-blue-400" : "bg-slate-300"}`} />
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Liga
                      </span>
                    </div>
                    {hasData ? (
                      <div className="text-center space-y-2 py-2">
                        <div className="text-sm font-semibold text-slate-700">
                          {leagueName}
                        </div>
                        <div className="text-xs text-slate-400">
                          {seasonName}
                        </div>
                        <div className="flex justify-center gap-4 mt-2">
                          <div className="text-center">
                            <div className="text-lg font-bold text-emerald-600">
                              {rankings.length}
                            </div>
                            <div className="text-[10px] text-slate-400 uppercase">
                              Jogadores
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">
                              {rankings.reduce((sum, r) => sum + r.matchesPlayed, 0)}
                            </div>
                            <div className="text-[10px] text-slate-400 uppercase">
                              Jogos
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center">
                        <p className="text-[11px] text-slate-400">
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
