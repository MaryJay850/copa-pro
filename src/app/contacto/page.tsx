"use client";

import { useState } from "react";
import Link from "next/link";
import { Footer } from "@/components/landing/footer";

export default function ContactoPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Para já, apenas simula o envio
    setSent(true);
  };

  const inputClass = "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-primary/30 transition-colors";

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
              Contacte-nos
            </h1>
            <p className="text-lg text-text-muted max-w-2xl mx-auto leading-relaxed">
              Tem alguma questão, sugestão ou precisa de ajuda? Estamos aqui para ajudar.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="max-w-4xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-5 gap-12">
            {/* Contact info */}
            <div className="md:col-span-2 space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text">Email</h3>
                    <p className="text-sm text-text-muted">suporte@copapro.pt</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text">Horário de suporte</h3>
                    <p className="text-sm text-text-muted">Segunda a Sexta, 9h - 18h</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text">Localização</h3>
                    <p className="text-sm text-text-muted">Portugal</p>
                  </div>
                </div>
              </div>

              <div className="bg-surface-alt rounded-2xl border border-border p-5">
                <h3 className="text-sm font-bold text-text mb-2">Tempo de resposta</h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  Respondemos a todas as mensagens num prazo máximo de 24 horas úteis. Para questões urgentes, indique &quot;URGENTE&quot; no assunto.
                </p>
              </div>
            </div>

            {/* Contact form */}
            <div className="md:col-span-3">
              {sent ? (
                <div className="bg-surface rounded-2xl border border-border shadow-sm p-8 text-center space-y-4 animate-fade-in-up">
                  <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-text">Mensagem enviada!</h2>
                  <p className="text-sm text-text-muted">
                    Obrigado por nos contactar. Responderemos o mais brevemente possível.
                  </p>
                  <Link href="/" className="inline-flex items-center text-sm text-primary font-medium hover:underline">
                    Voltar à página inicial
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-border shadow-sm p-6 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">Nome *</label>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} placeholder="O seu nome" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text mb-1">Email *</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} placeholder="email@exemplo.pt" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">Assunto *</label>
                    <select value={subject} onChange={(e) => setSubject(e.target.value)} required className={inputClass}>
                      <option value="">Selecione um assunto</option>
                      <option value="suporte">Suporte técnico</option>
                      <option value="comercial">Questão comercial</option>
                      <option value="sugestao">Sugestão de funcionalidade</option>
                      <option value="bug">Reportar um problema</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">Mensagem *</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      rows={5}
                      className={`${inputClass} resize-none`}
                      placeholder="Descreva a sua questão ou sugestão..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-light px-4 py-2.5 text-sm font-semibold text-white hover:shadow-md hover:shadow-primary/25 transition-all active:scale-[0.98]"
                  >
                    Enviar Mensagem
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
