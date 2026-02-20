export function ScoringSection() {
  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-6 py-20 lg:py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Sistema de Pontuação Transparente
          </h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-10">
          {/* Points breakdown */}
          <div className="grid grid-cols-3 gap-4">
            <PointCard value="+3" label="por vitória" accent="emerald" />
            <PointCard value="+2" label="por set ganho" accent="blue" />
            <PointCard value="+1" label="por empate" accent="amber" />
          </div>

          {/* Separator */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Critérios de Desempate
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Tiebreak order */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { label: "Pts", desc: "Pontos" },
              { label: "V", desc: "Vitórias" },
              { label: "Dif", desc: "Dif. Sets" },
              { label: "SG", desc: "Sets Ganhos" },
              { label: "E", desc: "Empates" },
            ].map((item, i) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="flex flex-col items-center bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 min-w-[80px]">
                  <span className="text-lg font-extrabold text-slate-800">
                    {item.label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                    {item.desc}
                  </span>
                </div>
                {i < 4 && (
                  <svg
                    className="w-4 h-4 text-slate-300 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PointCard({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent: "emerald" | "blue" | "amber";
}) {
  const styles = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
  };

  return (
    <div
      className={`rounded-2xl border p-6 text-center ${styles[accent]}`}
    >
      <div className="text-3xl sm:text-4xl font-extrabold mb-1">{value}</div>
      <div className="text-sm font-medium opacity-80">{label}</div>
    </div>
  );
}
