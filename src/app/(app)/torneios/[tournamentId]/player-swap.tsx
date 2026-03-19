"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { swapTournamentPlayers, getAvailablePlayersForSwap } from "@/lib/actions";
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
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [playerAId, setPlayerAId] = useState("");
  const [playerBId, setPlayerBId] = useState("");
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (open && availablePlayers.length === 0) {
      setLoadingAvailable(true);
      getAvailablePlayersForSwap(tournamentId)
        .then((players) => setAvailablePlayers(players))
        .catch(() => toast.error("Erro ao carregar jogadores disponíveis."))
        .finally(() => setLoadingAvailable(false));
    }
  }, [open, tournamentId, availablePlayers.length]);

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
      toast.success("Jogador substituído com sucesso. A recarregar...");
      setTimeout(() => window.location.reload(), 500);
    } catch (e) {
      toast.error(sanitizeError(e, "Erro ao substituir jogador."));
      setLoading(false);
    }
  };

  const displayName = (p: Player) => p.nickname || p.fullName.split(" ")[0];

  const playerAName = playerAId ? displayName(players.find((p) => p.id === playerAId)!) : "";
  const playerBName = playerBId ? displayName(availablePlayers.find((p) => p.id === playerBId)!) : "";

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" variant="secondary">
        Trocar Jogadores
      </Button>

      <Modal
        open={open}
        onClose={() => { setOpen(false); setPlayerAId(""); setPlayerBId(""); }}
        title="Substituir Jogador"
        variant="warning"
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setPlayerAId(""); setPlayerBId(""); }}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSwap}
              disabled={loading || !playerAId || !playerBId || playerAId === playerBId}
            >
              {loading ? "A substituir..." : "Confirmar Substituição"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Substitui um jogador inscrito no torneio por um membro da liga.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Jogador a sair (inscrito no torneio)</label>
              <select
                value={playerAId}
                onChange={(e) => setPlayerAId(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              >
                <option value="">Selecionar jogador...</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nickname || p.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-center">
              <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Jogador a entrar (membro da liga)</label>
              {loadingAvailable ? (
                <p className="text-sm text-text-muted py-2">A carregar jogadores disponíveis...</p>
              ) : availablePlayers.length === 0 ? (
                <p className="text-sm text-amber-600 py-2">Não há jogadores disponíveis na liga que não estejam já no torneio.</p>
              ) : (
                <select
                  value={playerBId}
                  onChange={(e) => setPlayerBId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                >
                  <option value="">Selecionar jogador...</option>
                  {availablePlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nickname || p.fullName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {playerAId && playerBId && playerAId !== playerBId && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-amber-800">
                <strong>{playerAName}</strong> → <strong>{playerBName}</strong>
              </p>
              <p className="text-amber-700 mt-1">
                {playerBName} ficará em todas as equipas e jogos de {playerAName}.
              </p>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
