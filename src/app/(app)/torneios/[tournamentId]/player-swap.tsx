"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { swapTournamentPlayers } from "@/lib/actions";
import { sanitizeError } from "@/lib/error-utils";

interface Player {
  id: string;
  fullName: string;
  nickname: string | null;
}

interface PlayerSwapProps {
  tournamentId: string;
  players: Player[];
}

export function PlayerSwap({ tournamentId, players }: PlayerSwapProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playerAId, setPlayerAId] = useState("");
  const [playerBId, setPlayerBId] = useState("");

  const handleSwap = async () => {
    if (!playerAId || !playerBId) {
      toast.error("Selecione os dois jogadores.");
      return;
    }
    if (playerAId === playerBId) {
      toast.error("Os dois jogadores devem ser diferentes.");
      return;
    }

    setLoading(true);
    try {
      await swapTournamentPlayers(tournamentId, playerAId, playerBId);
      toast.success("Jogadores trocados com sucesso. A recarregar...");
      // Full page reload to ensure fresh data (router.refresh may use stale cache)
      setTimeout(() => window.location.reload(), 500);
    } catch (e) {
      toast.error(sanitizeError(e, "Erro ao trocar jogadores."));
      setLoading(false);
    }
  };

  const displayName = (p: Player) => p.nickname || p.fullName.split(" ")[0];

  const playerAName = playerAId ? displayName(players.find((p) => p.id === playerAId)!) : "";
  const playerBName = playerBId ? displayName(players.find((p) => p.id === playerBId)!) : "";

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" variant="secondary">
        Trocar Jogadores
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Trocar Jogadores"
        variant="warning"
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSwap}
              disabled={loading || !playerAId || !playerBId || playerAId === playerBId}
            >
              {loading ? "A trocar..." : "Confirmar Troca"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            O Jogador A ficará em todas as equipas e jogos do Jogador B, e vice-versa.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Jogador A</label>
              <select
                value={playerAId}
                onChange={(e) => setPlayerAId(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              >
                <option value="">Selecionar jogador...</option>
                {players
                  .filter((p) => p.id !== playerBId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nickname || p.fullName}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-center">
              <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Jogador B</label>
              <select
                value={playerBId}
                onChange={(e) => setPlayerBId(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              >
                <option value="">Selecionar jogador...</option>
                {players
                  .filter((p) => p.id !== playerAId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nickname || p.fullName}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {playerAId && playerBId && playerAId !== playerBId && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-amber-800">
                <strong>{playerAName}</strong> ↔ <strong>{playerBName}</strong>
              </p>
              <p className="text-amber-700 mt-1">
                Todas as equipas e jogos de {playerAName} passarão para {playerBName} e vice-versa.
              </p>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
