import Link from "next/link";
import { Footer } from "@/components/landing/footer";

export default function SobrePage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-surface border-b border-border backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2C12 2 5 8 5 12s3 8 7 10" />
                <path d="M12 2c0 0 7 6 7 10s-3 8-7 10" />
                <line x1="2" y1="12" x2="22" y2="12" />
              </svg>
            </div>
            <span className="text-xl font-extrabold tracking-tight text-text">
              Copa<span className="text-primary">Pro</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-text-muted hover:text-text transition-colors">Entrar</Link>
            <Link href="/registar" className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary to-primary-light px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all active:scale-[0.98]">Criar Conta</Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary/[0.04] via-surface to-accent/[0.03]">
          <div className="max-w-4xl mx-auto px-6 py-20 text-center animate-fade-in-up">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-text mb-4">
              Sobre o <span className="bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">CopaPro</span>
            </h1>
            <p className="text-lg text-text-muted max-w-2xl mx-auto leading-relaxed">
              A plataforma que transforma a gestão de ligas de padel numa experiência simples, transparente e profissional.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="max-w-4xl mx-auto px-6 py-16 space-y-16">
          {/* Missão */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 0 1-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-text tracking-tight">A nossa missão</h2>
              <p className="text-text-muted leading-relaxed">
                O CopaPro nasceu da frustração de gerir ligas de padel com folhas de Excel, grupos de WhatsApp desorganizados e cálculos manuais propensos a erros.
              </p>
              <p className="text-text-muted leading-relaxed">
                A nossa missão é dar a cada organizador de liga as ferramentas profissionais que precisa para se concentrar no que realmente importa: <strong className="text-text">o jogo.</strong>
              </p>
            </div>
            <div className="bg-surface-alt rounded-2xl border border-border p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="text-3xl font-extrabold text-primary tabular-nums">100%</div>
                <div className="text-sm text-text-muted">Automação do calendário Round Robin</div>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center gap-4">
                <div className="text-3xl font-extrabold text-success tabular-nums">0</div>
                <div className="text-sm text-text-muted">Erros de cálculo no ranking</div>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center gap-4">
                <div className="text-3xl font-extrabold text-accent tabular-nums">&lt;2 min</div>
                <div className="text-sm text-text-muted">Para criar a sua primeira liga</div>
              </div>
            </div>
          </div>

          {/* Valores */}
          <div>
            <h2 className="text-2xl font-extrabold text-text tracking-tight mb-8 text-center">Os nossos valores</h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                {
                  title: "Transparência",
                  desc: "Rankings claros com sistema de pontuação visível. Cada jogador sabe exatamente como a classificação é calculada.",
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  ),
                },
                {
                  title: "Simplicidade",
                  desc: "Interface intuitiva que qualquer pessoa consegue usar. Sem manuais, sem configurações complexas.",
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                    </svg>
                  ),
                },
                {
                  title: "Comunidade",
                  desc: "Construído para fortalecer a comunidade do padel. Cada funcionalidade aproxima jogadores e organizadores.",
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                    </svg>
                  ),
                },
              ].map((v) => (
                <div key={v.title} className="bg-surface-alt rounded-2xl border border-border p-6 space-y-3 card-hover">
                  <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary">
                    {v.icon}
                  </div>
                  <h3 className="text-base font-bold text-text">{v.title}</h3>
                  <p className="text-sm text-text-muted leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tecnologia */}
          <div className="bg-surface-alt rounded-2xl border border-border p-8 text-center space-y-4">
            <h2 className="text-2xl font-extrabold text-text tracking-tight">Construído com tecnologia moderna</h2>
            <p className="text-text-muted max-w-xl mx-auto leading-relaxed">
              O CopaPro é desenvolvido com as tecnologias mais recentes para garantir performance, segurança e fiabilidade.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              {["Next.js", "TypeScript", "PostgreSQL", "Prisma", "Tailwind CSS", "NextAuth"].map((tech) => (
                <span key={tech} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-surface border border-border text-xs font-semibold text-text-muted">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
