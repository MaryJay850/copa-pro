"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { importPlayersFromCSV } from "@/lib/actions";

export function CsvImport({ leagueId }: { leagueId: string }) {
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleImport = async () => {
    if (!csv.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await importPlayersFromCSV(leagueId, csv);
      setResult(res);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    }
    setLoading(false);
  };

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <span className="flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Importar CSV
        </span>
      </Button>
    );
  }

  return (
    <Card className="p-4 border-primary/30">
      <h3 className="text-sm font-semibold mb-2">Importar Jogadores via CSV</h3>
      <p className="text-xs text-text-muted mb-3">
        Uma linha por jogador. Formato: <code className="bg-surface-alt px-1 rounded">Nome Completo,Alcunha,Telemóvel,Email</code>
        <br />Apenas o nome é obrigatório. Exemplo:
      </p>
      <pre className="text-xs bg-surface-alt rounded p-2 mb-3 text-text-muted">
{`João Silva,Joãozinho,+351 912345678,joao@email.com
Maria Santos,,+351 923456789,
Pedro Costa,Pedrão,,pedro@email.com`}
      </pre>
      <textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        placeholder="Cole os dados CSV aqui..."
        rows={6}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono resize-y"
      />
      <div className="flex items-center gap-2 mt-3">
        <Button onClick={handleImport} disabled={loading || !csv.trim()} size="sm">
          {loading ? "A importar..." : "Importar"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setResult(null); setError(null); }}>
          Cancelar
        </Button>
      </div>
      {result && (
        <div className="mt-3 space-y-1">
          <p className="text-sm text-green-600 font-medium">
            {result.imported} jogador(es) importado(s) com sucesso.
          </p>
          {result.errors.length > 0 && (
            <div className="text-xs text-amber-600 space-y-0.5">
              {result.errors.map((e, i) => (
                <p key={i}>{e}</p>
              ))}
            </div>
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </Card>
  );
}
