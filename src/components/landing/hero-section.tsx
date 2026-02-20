import Link from "next/link";

export function HeroSection() {
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

          {/* Right — Visual mock */}
          <div className="hidden lg:block">
            <div className="relative">
              {/* Background glow */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-50 via-white to-slate-50 rounded-3xl" />

              <div className="relative space-y-4">
                {/* Mock ranking table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Ranking — Época 2025
                    </span>
                  </div>
                  <div className="space-y-0">
                    {[
                      { pos: 1, name: "Miguel Costa", pts: 42, color: "text-emerald-600" },
                      { pos: 2, name: "André Santos", pts: 38, color: "text-slate-700" },
                      { pos: 3, name: "João Silva", pts: 35, color: "text-slate-700" },
                      { pos: 4, name: "Ricardo Lopes", pts: 31, color: "text-slate-400" },
                    ].map((r) => (
                      <div
                        key={r.pos}
                        className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                            {r.pos}
                          </span>
                          <span className="text-sm font-medium text-slate-700">
                            {r.name}
                          </span>
                        </div>
                        <span className={`text-sm font-bold ${r.color}`}>
                          {r.pts} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mock schedule + team card row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Schedule block */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Ronda 3
                      </span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { a: "Equipa 1", b: "Equipa 3", score: "6-4 / 7-5" },
                        { a: "Equipa 2", b: "Equipa 4", score: "—" },
                      ].map((m, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs py-1.5"
                        >
                          <span className="text-slate-600 font-medium">
                            {m.a} vs {m.b}
                          </span>
                          <span className="font-mono text-slate-400">
                            {m.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Team card */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Equipa
                      </span>
                    </div>
                    <div className="text-center space-y-2">
                      <div className="text-sm font-semibold text-slate-700">
                        Equipa 1
                      </div>
                      <div className="flex justify-center gap-3">
                        <div className="text-center">
                          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 mx-auto">
                            MC
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            Miguel
                          </span>
                        </div>
                        <div className="text-center">
                          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 mx-auto">
                            AS
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            André
                          </span>
                        </div>
                      </div>
                    </div>
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
