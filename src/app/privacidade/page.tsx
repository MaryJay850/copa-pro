import Link from "next/link";
import { Footer } from "@/components/landing/footer";

export default function PrivacidadePage() {
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
              Política de Privacidade
            </h1>
            <p className="text-sm text-text-muted">Última atualização: março 2026</p>
          </div>
        </section>

        {/* Content */}
        <section className="max-w-3xl mx-auto px-6 py-12">
          <div className="bg-surface rounded-2xl border border-border shadow-sm p-8 space-y-8 text-sm text-text-muted leading-relaxed">
            <div>
              <h2 className="text-lg font-bold text-text mb-3">1. Responsável pelo Tratamento</h2>
              <p>
                A entidade responsável pelo tratamento dos dados pessoais recolhidos na plataforma CopaPro
                é a equipa CopaPro, com sede em Portugal. Para questões relacionadas com privacidade,
                contacte-nos em <strong className="text-text">suporte@copapro.pt</strong>.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-text mb-3">2. Dados Recolhidos</h2>
              <p className="mb-3">Recolhemos os seguintes dados pessoais:</p>
              <div className="bg-surface-alt rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0">1</span>
                  <div>
                    <strong className="text-text">Dados de registo:</strong> nome completo, alcunha, email, número de telemóvel e palavra-passe (encriptada).
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0">2</span>
                  <div>
                    <strong className="text-text">Dados de utilização:</strong> resultados de jogos, rankings, estatísticas, participação em torneios e ligas.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0">3</span>
                  <div>
                    <strong className="text-text">Dados técnicos:</strong> endereço IP, tipo de browser, sistema operativo e dados de sessão.
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-text mb-3">3. Finalidade do Tratamento</h2>
              <p className="mb-2">Os dados pessoais são utilizados para:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Criar e gerir a conta do utilizador na plataforma.</li>
                <li>Disponibilizar as funcionalidades de gestão de ligas, torneios e rankings.</li>
                <li>Enviar notificações relacionadas com a atividade na plataforma.</li>
                <li>Enviar comunicações sobre atualizações do serviço.</li>
                <li>Melhorar a qualidade e segurança da plataforma.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-bold text-text mb-3">4. Base Legal</h2>
              <p>
                O tratamento de dados pessoais baseia-se no consentimento do utilizador (ao registar-se),
                na execução do contrato de prestação de serviço e em interesses legítimos de melhoria do serviço,
                em conformidade com o Regulamento Geral sobre a Proteção de Dados (RGPD).
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-text mb-3">5. Partilha de Dados</h2>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong className="text-text">Dentro da liga:</strong> nome, alcunha e estatísticas de jogo são visíveis para outros membros da mesma liga.</li>
                <li><strong className="text-text">Terceiros:</strong> não vendemos nem partilhamos dados pessoais com terceiros para fins de marketing.</li>
                <li><strong className="text-text">Prestadores de serviço:</strong> utilizamos serviços de alojamento e email que podem processar dados em nosso nome, sob acordos de confidencialidade.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-bold text-text mb-3">6. Segurança dos Dados</h2>
              <p>
                Implementamos medidas técnicas e organizativas para proteger os dados pessoais,
                incluindo encriptação de palavras-passe, comunicações HTTPS e controlo de acesso.
                No entanto, nenhum sistema é completamente seguro e não podemos garantir segurança absoluta.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-text mb-3">7. Retenção de Dados</h2>
              <p>
                Os dados pessoais são conservados enquanto a conta estiver ativa. Após a eliminação da conta,
                os dados são removidos num prazo máximo de 30 dias, exceto quando exigido por lei.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-text mb-3">8. Direitos do Utilizador</h2>
              <p className="mb-2">Nos termos do RGPD, o utilizador tem o direito de:</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { right: "Acesso", desc: "Consultar os seus dados pessoais" },
                  { right: "Retificação", desc: "Corrigir dados incorretos" },
                  { right: "Eliminação", desc: "Solicitar a remoção dos dados" },
                  { right: "Portabilidade", desc: "Receber os dados em formato digital" },
                  { right: "Oposição", desc: "Opor-se ao tratamento dos dados" },
                  { right: "Limitação", desc: "Restringir o tratamento dos dados" },
                ].map((item) => (
                  <div key={item.right} className="flex items-start gap-2 bg-surface-alt rounded-lg border border-border px-3 py-2">
                    <svg className="w-4 h-4 text-success mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <div>
                      <strong className="text-text text-xs">{item.right}</strong>
                      <p className="text-xs text-text-muted">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs">
                Para exercer qualquer destes direitos, contacte-nos em <strong className="text-text">suporte@copapro.pt</strong>.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-text mb-3">9. Cookies</h2>
              <p>
                A plataforma utiliza cookies essenciais para o funcionamento (autenticação e preferências de sessão).
                Não utilizamos cookies de rastreamento ou publicidade.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-text mb-3">10. Alterações à Política</h2>
              <p>
                Esta política pode ser atualizada periodicamente. Quaisquer alterações significativas
                serão comunicadas por email e/ou notificação na plataforma.
              </p>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-text-muted">
                Para questões sobre privacidade, contacte-nos através da página de{" "}
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
