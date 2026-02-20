import Link from "next/link";

export function CtaSection() {
  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-8 py-16 sm:px-16 sm:py-20 text-center">
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-5">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                backgroundSize: "24px 24px",
              }}
            />
          </div>

          {/* Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />

          <div className="relative space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Comece a sua liga hoje.
            </h2>
            <p className="text-slate-400 text-lg max-w-md mx-auto">
              Sem configurações complexas. Crie a sua primeira liga em menos de
              2 minutos.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link
                href="/ligas"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 transition-all hover:shadow-emerald-500/50"
              >
                Criar Liga
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm px-8 py-4 text-sm font-semibold text-white border border-white/20 hover:bg-white/20 transition-all"
              >
                Explorar Plataforma
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
