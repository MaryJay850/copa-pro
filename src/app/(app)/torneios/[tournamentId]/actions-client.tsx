"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  generateSchedule,
  forceRegenerateSchedule,
  finishTournament,
  deleteTournament,
  cloneTournament,
  reopenTournament,
} from "@/lib/actions";
import { sanitizeError } from "@/lib/error-utils";

export function TournamentActions({
  tournamentId,
  status,
  leagueId,
  seasonId,
  hasResults,
  finishedMatches = 0,
  totalMatches = 0,
}: {
  tournamentId: string;
  status: string;
  leagueId: string;
  seasonId: string;
  hasResults: boolean;
  finishedMatches?: number;
  totalMatches?: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
        toast.error(sanitizeError(err));
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
      toast.error(sanitizeError(e));
    }
    setLoading(false);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await finishTournament(tournamentId);
      setShowFinishModal(false);
      router.refresh();
    } catch (e: unknown) {
      toast.error(sanitizeError(e));
    }
    setLoading(false);
  };

  const handleReopen = async () => {
    setLoading(true);
    try {
      await reopenTournament(tournamentId);
      setShowReopenModal(false);
      router.refresh();
    } catch (e: unknown) {
      toast.error(sanitizeError(e));
    }
    setLoading(false);
  };

  const handleClone = async () => {
    setLoading(true);
    try {
      const result = await cloneTournament(tournamentId);
      router.push(`/torneios/${result.id}`);
    } catch (e: unknown) {
      toast.error(sanitizeError(e));
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteTournament(tournamentId);
      router.push(`/ligas/${leagueId}/epocas/${seasonId}`);
    } catch (e: unknown) {
      toast.error(sanitizeError(e));
    }
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const canEdit = status === "DRAFT" || (status !== "FINISHED" && !hasResults);

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
            onClick={() => setShowFinishModal(true)}
            disabled={loading}
            size="sm"
            variant="secondary"
          >
            Encerrar Torneio
          </Button>
        </>
      )}

      {status === "FINISHED" && (
        <Button onClick={() => setShowReopenModal(true)} disabled={loading} size="sm" variant="secondary">
          Reabrir Torneio
        </Button>
      )}

      {canEdit && (
        <Link href={`/torneios/${tournamentId}/editar`}>
          <Button size="sm" variant="secondary">
            Editar Configuração
          </Button>
        </Link>
      )}

      <Button onClick={handleClone} disabled={loading} size="sm" variant="secondary">
        Duplicar Torneio
      </Button>

      <Button onClick={handlePrint} size="sm" variant="ghost">
        Imprimir / Exportar
      </Button>

      {status !== "FINISHED" && (
        <Link href={`/torneios/${tournamentId}/placar`} target="_blank">
          <Button size="sm" variant="secondary">
            <svg className="w-4 h-4 mr-1.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="18" rx="2" strokeWidth="2"/><path d="M12 3v18M2 12h20" strokeWidth="2"/></svg>
            Placar de Jogo
          </Button>
        </Link>
      )}

      {status !== "FINISHED" && (
        <Button onClick={() => setShowDeleteModal(true)} disabled={loading} size="sm" variant="danger">
          Eliminar Torneio
        </Button>
      )}

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

      {/* Reopen Warning Modal */}
      <Modal
        open={showReopenModal}
        onClose={() => setShowReopenModal(false)}
        title="Reabrir Torneio?"
        variant="warning"
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setShowReopenModal(false)}>
              Cancelar
            </Button>
            <Button size="sm" variant="danger" onClick={handleReopen} disabled={loading}>
              {loading ? "A reabrir..." : "Confirmar Reabertura"}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <p>Ao reabrir este torneio:</p>
          <ul className="list-disc list-inside space-y-1 text-text">
            <li>O estado voltará a &quot;A decorrer&quot;</li>
            <li>Os rankings da época serão recalculados</li>
            <li>Poderá editar resultados existentes</li>
          </ul>
          {hasResults && (
            <p className="text-amber-600 font-medium mt-2">
              ⚠️ Este torneio tem resultados registados que podem ser afetados.
            </p>
          )}
        </div>
      </Modal>

      {/* Finish Warning Modal */}
      <Modal
        open={showFinishModal}
        onClose={() => setShowFinishModal(false)}
        title="Encerrar Torneio?"
        variant="warning"
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setShowFinishModal(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleFinish} disabled={loading}>
              {loading ? "A encerrar..." : "Confirmar Encerramento"}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <p>Tem a certeza que deseja encerrar este torneio?</p>
          <p className="text-sm text-text-muted">
            <strong>{finishedMatches}</strong> de <strong>{totalMatches}</strong> jogos completos.
          </p>
          {totalMatches - finishedMatches > 0 && (
            <p className="text-sm text-amber-600 font-medium">
              Os {totalMatches - finishedMatches} jogos incompletos e as rondas sem resultados serão eliminados.
            </p>
          )}
        </div>
      </Modal>

      {/* Delete Danger Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Eliminar Torneio?"
        variant="danger"
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button size="sm" variant="danger" onClick={handleDelete} disabled={loading}>
              {loading ? "A eliminar..." : "Eliminar Definitivamente"}
            </Button>
          </>
        }
      >
        <p>Esta ação é irreversível. Todos os dados (equipas, calendário, resultados) serão perdidos permanentemente.</p>
      </Modal>
    </div>
  );
}
