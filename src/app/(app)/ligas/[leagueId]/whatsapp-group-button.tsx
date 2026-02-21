"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createOrSyncWhatsAppGroup } from "@/lib/actions";
import { sanitizeError } from "@/lib/error-utils";

interface WhatsAppGroupButtonProps {
  leagueId: string;
  hasGroup: boolean;
}

export function WhatsAppGroupButton({ leagueId, hasGroup }: WhatsAppGroupButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await createOrSyncWhatsAppGroup(leagueId);
      if (res.created) {
        setResult(`Grupo criado com sucesso! ${res.membersAdded} membro(s) adicionado(s).`);
      } else {
        const parts: string[] = [];
        if (res.membersAdded > 0) parts.push(`${res.membersAdded} adicionado(s)`);
        if (res.membersRemoved && res.membersRemoved > 0) parts.push(`${res.membersRemoved} removido(s)`);
        const detail = parts.length > 0 ? parts.join(", ") : "sem alterações";
        setResult(`Grupo sincronizado! ${detail}.`);
      }
    } catch (err) {
      setError(sanitizeError(err, "Erro ao criar grupo WhatsApp."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleClick}
        disabled={loading}
        size="sm"
        variant={hasGroup ? "secondary" : "primary"}
        className={
          hasGroup
            ? ""
            : "bg-[#25D366] hover:bg-[#128C7E] text-white"
        }
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {hasGroup ? "A sincronizar..." : "A criar grupo..."}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            {hasGroup ? "Sincronizar Grupo WhatsApp" : "Criar Grupo WhatsApp"}
          </span>
        )}
      </Button>

      {result && (
        <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded px-3 py-1.5">
          ✅ {result}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-1.5">
          ❌ {error}
        </p>
      )}
    </div>
  );
}
