import Link from "next/link";

export function PricingSection() {
  return (
    <section className="bg-surface">
      <div className="max-w-7xl mx-auto px-6 py-20 lg:py-24">
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary mb-3">
            Planos
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-text tracking-tight">
            Escolha o plano ideal para a sua liga.
          </h2>
          <p className="text-text-muted mt-3 max-w-xl mx-auto">
            Comece gratuitamente. Faça upgrade quando a sua liga crescer.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* FREE */}
          <div className="rounded-2xl border border-border bg-surface p-8 flex flex-col card-hover">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-text">Free</h3>
              <p className="text-sm text-text-muted mt-1">Para experimentar e ligas pequenas</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-text">0€</span>
              <span className="text-sm text-text-muted">/mês</span>
            </div>
            <ul className="space-y-3 text-sm text-text-muted mb-8 flex-1">
              <PricingFeature>1 liga</PricingFeature>
              <PricingFeature>1 época ativa</PricingFeature>
              <PricingFeature>2 torneios por época</PricingFeature>
              <PricingFeature>Até 8 equipas por torneio</PricingFeature>
              <PricingFeature>Até 2 campos</PricingFeature>
              <PricingFeature>Ranking individual completo</PricingFeature>
              <PricingFeature>Registo de resultados</PricingFeature>
              <PricingFeature>Perfil de jogador</PricingFeature>
              <PricingFeature>Dashboard com filtros</PricingFeature>
              <PricingFeature>Dark mode</PricingFeature>
            </ul>
            <Link
              href="/registar"
              className="block text-center rounded-xl border-2 border-border px-6 py-3 text-sm font-semibold text-text hover:border-primary/30 hover:bg-surface-hover transition-all"
            >
              Começar Grátis
            </Link>
          </div>

          {/* PRO — highlighted */}
          <div className="relative rounded-2xl border-2 border-primary bg-surface p-8 flex flex-col shadow-lg shadow-primary/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center rounded-full bg-gradient-to-r from-primary to-primary-light px-3 py-1 text-xs font-bold text-white">
                Popular
              </span>
            </div>
            <div className="mb-6">
              <h3 className="text-lg font-bold text-text">Pro</h3>
              <p className="text-sm text-text-muted mt-1">Para gestores de liga sérios</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-text">4,99€</span>
              <span className="text-sm text-text-muted">/mês</span>
              <p className="text-xs text-primary font-medium mt-1">ou 39,99€/ano (poupe 33%)</p>
            </div>
            <ul className="space-y-3 text-sm text-text-muted mb-8 flex-1">
              <PricingFeature highlight>Tudo do Free, mais:</PricingFeature>
              <PricingFeature>Torneios e épocas ilimitadas</PricingFeature>
              <PricingFeature>Equipas e campos ilimitados</PricingFeature>
              <PricingFeature>Equipas aleatórias com seed</PricingFeature>
              <PricingFeature>Double Round Robin</PricingFeature>
              <PricingFeature>Sistema Elo completo + gráfico</PricingFeature>
              <PricingFeature>Head-to-Head entre jogadores</PricingFeature>
              <PricingFeature>Submissão de resultados por jogadores</PricingFeature>
              <PricingFeature>Calendário de disponibilidade</PricingFeature>
              <PricingFeature>Substituição automática de jogadores</PricingFeature>
              <PricingFeature>Export PDF e iCalendar</PricingFeature>
              <PricingFeature>Notificações em tempo real</PricingFeature>
              <PricingFeature>Clonagem de torneios e épocas</PricingFeature>
            </ul>
            <Link
              href="/planos"
              className="block text-center rounded-xl bg-gradient-to-r from-primary to-primary-light px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all active:scale-[0.98]"
            >
              Escolher Pro
            </Link>
          </div>

          {/* CLUB */}
          <div className="rounded-2xl border border-border bg-surface p-8 flex flex-col card-hover">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-text">Club</h3>
              <p className="text-sm text-text-muted mt-1">Para clubes e organizações</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-text">14,99€</span>
              <span className="text-sm text-text-muted">/mês</span>
              <p className="text-xs text-text-muted font-medium mt-1">ou 119,99€/ano (poupe 33%)</p>
            </div>
            <ul className="space-y-3 text-sm text-text-muted mb-8 flex-1">
              <PricingFeature highlight>Tudo do Pro, mais:</PricingFeature>
              <PricingFeature>Ligas ilimitadas</PricingFeature>
              <PricingFeature>Integração WhatsApp automática</PricingFeature>
              <PricingFeature>Grupo WhatsApp com sync bidirecional</PricingFeature>
              <PricingFeature>Mensagens automáticas (resultados, rankings)</PricingFeature>
              <PricingFeature>Import CSV de jogadores</PricingFeature>
              <PricingFeature>Painel de administração completo</PricingFeature>
              <PricingFeature>Analytics avançados com gráficos</PricingFeature>
              <PricingFeature>Registo de auditoria</PricingFeature>
              <PricingFeature>Configurações do sistema</PricingFeature>
              <PricingFeature>Gestão de múltiplos gestores</PricingFeature>
              <PricingFeature>Horários de campos personalizados</PricingFeature>
              <PricingFeature>Suporte prioritário</PricingFeature>
            </ul>
            <Link
              href="/planos"
              className="block text-center rounded-xl border-2 border-border px-6 py-3 text-sm font-semibold text-text hover:border-primary/30 hover:bg-surface-hover transition-all"
            >
              Escolher Club
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingFeature({
  children,
  highlight = false,
}: {
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <li className="flex items-start gap-2">
      {highlight ? (
        <span className="mt-0.5 text-primary font-bold text-xs">★</span>
      ) : (
        <svg
          className="w-4 h-4 mt-0.5 text-success shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      )}
      <span className={highlight ? "font-semibold text-primary" : ""}>{children}</span>
    </li>
  );
}
