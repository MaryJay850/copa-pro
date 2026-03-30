"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { seedPadelClubsPortugal } from "@/lib/actions/seed-clubs";
import { toast } from "sonner";

type Preview = {
  totalInCatalog: number;
  alreadyExists: number;
  toCreate: number;
  totalCourtsToCreate: number;
  byRegion: { region: string; count: number }[];
};

export function ImportClubsClient({ preview }: { preview: Preview }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    total: number;
    created: number;
    skipped: number;
    message: string;
  } | null>(null);

  const handleImport = async () => {
    setLoading(true);
    try {
      const res = await seedPadelClubsPortugal();
      setResult(res);
      toast.success(res.message);
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao importar clubes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Preview */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Resumo da Importação
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface-alt rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-primary">{preview.totalInCatalog}</div>
            <div className="text-xs text-text-muted mt-1">Total no catálogo</div>
          </div>
          <div className="bg-surface-alt rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{preview.toCreate}</div>
            <div className="text-xs text-text-muted mt-1">Novos a importar</div>
          </div>
          <div className="bg-surface-alt rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{preview.alreadyExists}</div>
            <div className="text-xs text-text-muted mt-1">Já existentes</div>
          </div>
          <div className="bg-surface-alt rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{preview.totalCourtsToCreate}</div>
            <div className="text-xs text-text-muted mt-1">Campos a criar</div>
          </div>
        </div>

        <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">Por Região</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {preview.byRegion.filter((r) => r.count > 0).map((r) => (
            <div key={r.region} className="flex items-center justify-between bg-surface-alt rounded-lg px-3 py-2">
              <span className="text-sm font-medium">{r.region}</span>
              <Badge variant="info">{r.count}</Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Data Source Info */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Fontes de Dados
        </h2>
        <p className="text-sm text-text-muted mb-3">
          Os dados foram recolhidos automaticamente por IA a partir de múltiplas fontes públicas:
        </p>
        <ul className="text-sm text-text-muted space-y-1.5 list-disc list-inside">
          <li>Urban Sports Club — diretório de clubes por distrito</li>
          <li>Padelizados.pt — guia de clubes e campos em Portugal</li>
          <li>PadelDir.com — diretório internacional de padel</li>
          <li>Superprof.pt — artigos sobre campos de padel</li>
          <li>Padel Lands — listagem europeia de instalações</li>
        </ul>
        <p className="text-xs text-text-muted mt-3 italic">
          Nota: O número de campos é aproximado e pode não refletir alterações recentes.
          Os clubes são criados com campos genéricos ("Campo 1", "Campo 2", etc.)
          que podem ser renomeados posteriormente na gestão do clube.
        </p>
      </Card>

      {/* Action */}
      {!result ? (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Iniciar Importação</h2>
              <p className="text-sm text-text-muted mt-1">
                {preview.toCreate === 0
                  ? "Todos os clubes do catálogo já foram importados."
                  : `Serão criados ${preview.toCreate} clubes e ${preview.totalCourtsToCreate} campos.`}
              </p>
            </div>
            <Button
              onClick={handleImport}
              disabled={loading || preview.toCreate === 0}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" opacity="0.75" />
                  </svg>
                  A importar...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Importar {preview.toCreate} Clubes
                </span>
              )}
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6 border-emerald-200 bg-emerald-50/50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-emerald-800">Importação Concluída!</h2>
              <p className="text-sm text-emerald-700 mt-1">{result.message}</p>
              <div className="flex gap-3 mt-4">
                <Button variant="secondary" onClick={() => router.push("/admin/clubes")}>
                  Ver Clubes
                </Button>
                <Button variant="ghost" onClick={() => { setResult(null); router.refresh(); }}>
                  Importar Novamente
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
