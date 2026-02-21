"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { sendCustomGroupMessage } from "@/lib/actions";

const TEMPLATES = [
  {
    id: "reminder",
    label: "Lembrete de Jogo",
    template: "\u{1F4E2} *Lembrete*\n\nN\u00E3o se esque\u00E7am dos jogos desta semana!\n\n_Consultem o calend\u00E1rio na plataforma._",
  },
  {
    id: "results",
    label: "Pedir Resultados",
    template: "\u{1F4CB} *Resultados em falta*\n\nPor favor, submetam os resultados dos jogos j\u00E1 realizados.\n\n_Obrigado!_",
  },
  {
    id: "availability",
    label: "Pedir Disponibilidade",
    template: "\u{1F4C5} *Disponibilidade*\n\nIndiquem a vossa disponibilidade para a pr\u00F3xima semana na plataforma.\n\n_Obrigado!_",
  },
  {
    id: "custom",
    label: "Mensagem Personalizada",
    template: "",
  },
];

export function WhatsAppMessageSender({
  leagueId,
  whatsappGroupId,
}: {
  leagueId: string;
  whatsappGroupId: string | null;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id);
  const [message, setMessage] = useState(TEMPLATES[0].template);
  const [sending, setSending] = useState(false);

  const handleTemplateChange = (id: string) => {
    setSelectedTemplate(id);
    const t = TEMPLATES.find((t) => t.id === id);
    if (t && t.id !== "custom") {
      setMessage(t.template);
    } else if (t?.id === "custom") {
      setMessage("");
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("A mensagem n\u00E3o pode estar vazia.");
      return;
    }
    if (!whatsappGroupId) {
      toast.error("Nenhum grupo WhatsApp configurado para esta liga.");
      return;
    }
    setSending(true);
    try {
      await sendCustomGroupMessage(leagueId, message);
      toast.success("Mensagem enviada com sucesso!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar mensagem.");
    }
    setSending(false);
  };

  if (!whatsappGroupId) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.286 0-4.397-.741-6.112-1.998l-.427-.31-2.645.887.887-2.645-.31-.427A9.935 9.935 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>
          </svg>
          Mensagens WhatsApp
        </CardTitle>
      </CardHeader>

      <div className="space-y-3">
        {/* Template selector */}
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTemplateChange(t.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedTemplate === t.id
                  ? "bg-primary text-white"
                  : "bg-surface-alt text-text-muted hover:text-text"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Message preview */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          placeholder="Escreva a sua mensagem..."
        />

        {/* Preview formatted */}
        {message && (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 text-xs">
            <p className="text-[10px] text-text-muted mb-1 font-medium">Pr\u00E9-visualiza\u00E7\u00E3o:</p>
            <pre className="whitespace-pre-wrap text-text font-sans">{message}</pre>
          </div>
        )}

        <Button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {sending ? "A enviar..." : "Enviar Mensagem"}
        </Button>
      </div>
    </Card>
  );
}
