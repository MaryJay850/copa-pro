"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  generateSchedule,
  forceRegenerateSchedule,
  finishTournament,
} from "@/lib/actions";

export function TournamentActions({
  tournamentId,
  status,
  leagueId,
  seasonId,
}: {
  tournamentId: string;
  status: string;
  leagueId: string;
  seasonId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      await generateSchedule(tournamentId);
      router.refresh();
    } catch (e: unknown) {
      const err = e as Error;
      if (err.message === "CONFIRM_REGENERATE") {
        setShowConfirm(true);
      } else {
        alert(err.message);
      }
    }
    setLoading(false);
  };

  const handleForceRegenerate = async () => {
    setLoading(true);
    try {
      await forceRegenerateSchedule(tournamentId);
      setShowConfirm(false);
      router.refresh();
    } catch (e: unknown) {
      alert((e as Error).message);
    }
    setLoading(false);
  };

  const handleFinish = async () => {
    if (
      !confirm(
        "Tem a certeza que deseja encerrar este torneio? Todos os jogos devem estar completos."
      )
    )
      return;
    setLoading(true);
    try {
      await finishTournament(tournamentId);
      router.refresh();
    } catch (e: unknown) {
      alert((e as Error).message);
    }
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      {status === "DRAFT" && (
        <Button onClick={handleGenerate} disabled={loading} size="sm">
          Gerar Calendário
        </Button>
      )}

      {(status === "PUBLISHED" || status === "RUNNING") && (
        <>
          <Button
            onClick={handleGenerate}
            disabled={loading}
            size="sm"
            variant="secondary"
          >
            Regenerar Calendário
          </Button>
          <Button
            onClick={handleFinish}
            disabled={loading}
            size="sm"
            variant="secondary"
          >
            Encerrar Torneio
          </Button>
        </>
      )}

      <Button onClick={handlePrint} size="sm" variant="ghost">
        Imprimir / Exportar
      </Button>

      {showConfirm && (
        <div className="w-full bg-amber-50 border border-amber-200 rounded-lg p-4 mt-2">
          <p className="text-sm text-amber-800 mb-2">
            Existem resultados registados. Regenerar o calendário irá
            apagar todos os resultados e atualizar o ranking.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="danger"
              onClick={handleForceRegenerate}
              disabled={loading}
            >
              Confirmar Regeneração
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowConfirm(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
