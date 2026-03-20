export function HowItWorksSection() {
  return (
    <section className="bg-surface-alt border-y border-border">
      <div className="max-w-7xl mx-auto px-6 py-20 lg:py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-text tracking-tight">
            Como funciona
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-4 relative">
          {/* Connectors — desktop only */}
          <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px">
            <div className="h-px w-full bg-gradient-to-r from-primary/30 via-primary/20 to-primary/30" />
          </div>

          <StepCard
            step={1}
            title="Crie a Liga e defina a Época"
            description="Comece por criar a sua liga e definir a época. Cada época tem os seus próprios torneios e ranking independente."
          />
          <StepCard
            step={2}
            title="Gere o Torneio e forme as equipas"
            description="Configure o número de campos, modo de equipas e formato. O calendário Round Robin é gerado automaticamente."
          />
          <StepCard
            step={3}
            title="Insira resultados e acompanhe o ranking"
            description="Registe os resultados set a set. O ranking individual é atualizado em tempo real após cada jogo."
          />
        </div>
      </div>
    </section>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center space-y-4 relative">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-surface border-2 border-primary/20 shadow-sm">
        <span className="text-2xl font-extrabold bg-gradient-to-br from-primary to-primary-light bg-clip-text text-transparent">{step}</span>
      </div>
      <h3 className="text-lg font-bold text-text">{title}</h3>
      <p className="text-sm text-text-muted leading-relaxed max-w-xs mx-auto">
        {description}
      </p>
    </div>
  );
}
