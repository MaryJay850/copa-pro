import Link from "next/link";
import { Footer } from "@/components/landing/footer";

export default function TermosPage() {
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
          <div className="max-w-4xl mx-auto px-6 py-16 text-center animate-fade-in-up">
            <h1 className="text-4xl font-extrabold tracking-tight text-text mb-2">
              Termos e Condições
            </h1>
            <p className="text-sm text-text-muted">Última atualização: março 2026</p>
          </div>
        </section>

        {/* Content */}
        <section className="max-w-3xl mx-auto px-6 py-12">
          <div className="bg-surface rounded-2xl border border-border shadow-sm p-8 space-y-8 text-sm text-text-muted leading-relaxed">
            <div>
              <h2 className="text-lg font-bold text-text mb-3">1. Aceitação dos Termos</h2>
              <p>
                Ao aceder e utilizar a plataforma CopaPro, o utilizador aceita os presentes Termos e Condições na sua totalidade.
                Se não concordar com algum dos termos, não deverá utilizar a plataforma.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-text mb-3">2. Descrição do Serviço</h2>
              <p>
                O CopaPro é uma plataforma de gestão de ligas de padel que permite aos utilizadores criar e gerir ligas, torneios,
                equipas, calendários e rankings. O serviço é fornecido tal como está, sujeito a atualizações e melhorias contínuas.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-text mb-3">3. Registo e Conta</h2>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>O utilizador deve fornecer informações verdadeiras e atualizadas no registo.</li>
                <li>Cada pessoa pode ter apenas uma conta ativa.</li>
                <li>O utilizador é responsável por manter a confidencialidade da sua palavra-passe.</li>
                <li>O CopaPro reserva-se o direito de suspender contas que violem estes termos.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-bold text-text mb-3">4. Planos e Pagamentos</h2>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>O plano Free é gratuito e não requer método de pagamento.</li>
                <li>Os planos pagos (Pro e Club) são cobrados mensalmente ou anualmente, conforme selecionado.</li>
                <li>Os preços podem ser alterados com aviso prévio de 30 dias.</li>
                <li>O cancelamento pode ser feito a qualquer momento, mantendo o acesso até ao final do período pago.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-bold text-text mb-3">5. Utilização Aceitável</h2>
              <p className="mb-2">O utilizador compromete-se a não:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Utilizar a plataforma para fins ilegais ou não autorizados.</li>
                <li>Tentar aceder a dados de outros utilizadores sem autorização.</li>
                <li>Interferir com o funcionamento normal da plataforma.</li>
                <li>Criar contas falsas ou partilhar credenciais de acesso.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-bold text-text mb-3">6. Propriedade Intelectual</h2>
              <p>
                Todo o conteúdo da plataforma CopaPro, incluindo design, código, logótipos e textos,
                é propriedade do CopaPro e está protegido por leis de propriedade intelectual.
                Os dados inseridos pelos utilizadores (resultados, jogadores, etc.) permanecem propriedade dos mesmos.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-text mb-3">7. Limitação de Responsabilidade</h2>
              <p>
                O CopaPro não se responsabiliza por perdas de dados resultantes de falhas técnicas,
                utilização indevida da plataforma ou circunstâncias fora do nosso controlo.
                O serviço é fornecido &quot;tal como está&quot; sem garantias expressas ou implícitas.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-text mb-3">8. Alterações aos Termos</h2>
              <p>
                O CopaPro pode atualizar estes Termos e Condições a qualquer momento.
                As alterações serão comunicadas por email e/ou notificação na plataforma.
                A continuação da utilização após alterações constitui aceitação dos novos termos.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-text mb-3">9. Lei Aplicável</h2>
              <p>
                Estes termos são regidos pela lei portuguesa. Qualquer litígio será submetido
                aos tribunais competentes em Portugal.
              </p>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-text-muted">
                Para questões sobre estes termos, contacte-nos através da página de{" "}
                <Link href="/contacto" className="text-primary hover:underline font-medium">contacto</Link>.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
