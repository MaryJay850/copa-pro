"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { saveFinalResults } from "@/lib/actions/final-result-actions";
import { toast } from "sonner";

/** Calculate position points (client-side mirror of server logic) */
function calculatePositionPoints(position: number): { positionPts: number; bonusPts: number; totalPts: number } {
  const bonusPts = 5;
  let positionPts: number;
  if (position === 1) {
    positionPts = 10;
  } else if (position === 2) {
    positionPts = 8;
  } else {
    positionPts = Math.max(0, 10 - position);
  }
  return { positionPts, bonusPts, totalPts: positionPts + bonusPts };
}

type Player = {
  id: string;
  fullName: string;
  nickname: string | null;
};

type Inscription = {
  playerId: string;
  player: Player;
  status: string;
};

type FinalResult = {
  id: string;
  position: number;
  player1: Player;
  player2: Player | null;
  positionPts: number;
  bonusPts: number;
  totalPts: number;
};

interface Props {
  tournamentId: string;
  inscriptions: Inscription[];
  teamSize: number;
  canManage: boolean;
  existingResults: FinalResult[];
}

type ResultEntry = {
  position: number;
  player1Id: string;
  player2Id: string | null;
};

export function FinalResultsManager({ tournamentId, inscriptions, teamSize, canManage, existingResults }: Props) {
  const [editing, setEditing] = useState(existingResults.length === 0 && canManage);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<ResultEntry[]>(() => {
    if (existingResults.length > 0) {
      return existingResults.map((r) => ({
        position: r.position,
        player1Id: r.player1.id,
        player2Id: r.player2?.id || null,
      }));
    }
    return [];
  });

  const titulares = inscriptions.filter((i) => i.status === "TITULAR");
  const players = titulares.map((i) => i.player);

  // For 2v2, we need pairs. Calculate max positions (number of pairs/individuals)
  const maxPositions = teamSize === 2 ? Math.floor(players.length / 2) : players.length;

  const getPlayerName = (id: string) => {
    const p = players.find((pl) => pl.id === id);
    return p ? (p.nickname || p.fullName) : "?";
  };

  // Players already assigned to a position
  const assignedPlayerIds = new Set<string>();
  for (const r of results) {
    if (r.player1Id) assignedPlayerIds.add(r.player1Id);
    if (r.player2Id) assignedPlayerIds.add(r.player2Id);
  }

  const availablePlayers = (currentPos: number, slot: "player1" | "player2") => {
    const currentEntry = results.find((r) => r.position === currentPos);
    return players.filter((p) => {
      if (slot === "player1" && currentEntry?.player1Id === p.id) return true;
      if (slot === "player2" && currentEntry?.player2Id === p.id) return true;
      return !assignedPlayerIds.has(p.id);
    });
  };

  const addPosition = () => {
    const nextPos = results.length + 1;
    if (nextPos > maxPositions) return;
    setResults([...results, { position: nextPos, player1Id: "", player2Id: teamSize === 2 ? "" : null }]);
  };

  const updateResult = (position: number, field: string, value: string) => {
    setResults(results.map((r) => {
      if (r.position !== position) return r;
      return { ...r, [field]: value || null };
    }));
  };

  const removePosition = (position: number) => {
    const filtered = results.filter((r) => r.position !== position);
    // Re-number positions
    setResults(filtered.map((r, i) => ({ ...r, position: i + 1 })));
  };

  const handleSave = async () => {
    // Validate
    for (const r of results) {
      if (!r.player1Id) {
        toast.error(`Posição ${r.position}: selecione pelo menos o jogador 1.`);
        return;
      }
      if (teamSize === 2 && !r.player2Id) {
        toast.error(`Posição ${r.position}: selecione o jogador 2.`);
        return;
      }
    }

    setSaving(true);
    try {
      await saveFinalResults(tournamentId, results);
      toast.success("Classificação final guardada com sucesso!");
      setEditing(false);
      // Refresh
      window.location.reload();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao guardar classificação.");
    } finally {
      setSaving(false);
    }
  };

  const medals = ["🥇", "🥈", "🥉"];

  // View mode: show existing results
  if (!editing && existingResults.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Classificação Final
          </h2>
          {canManage && (
            <Button variant="ghost" onClick={() => setEditing(true)}>
              Editar
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt/50">
                <th className="px-3 py-2 text-left text-xs font-bold text-text-muted w-10">#</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-text-muted">Dupla</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-text-muted w-16">Posição</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-text-muted w-20">Participação</th>
                <th className="px-2 py-2 text-center text-xs font-bold text-text-muted w-16">Total</th>
              </tr>
            </thead>
            <tbody>
              {existingResults.map((r) => {
                const medalBg =
                  r.position === 1 ? "bg-amber-50 border-l-4 border-l-amber-400" :
                  r.position === 2 ? "bg-gray-50 border-l-4 border-l-gray-400" :
                  r.position === 3 ? "bg-orange-50 border-l-4 border-l-orange-400" : "";

                const p1Name = r.player1.nickname || r.player1.fullName;
                const p2Name = r.player2 ? (r.player2.nickname || r.player2.fullName) : null;

                return (
                  <tr key={r.id} className={`border-b border-border last:border-0 ${medalBg}`}>
                    <td className="px-3 py-2.5 text-center">
                      {r.position <= 3 ? (
                        <span className="text-lg">{medals[r.position - 1]}</span>
                      ) : (
                        <span className="text-text-muted font-medium">{r.position}º</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-medium">
                      {p1Name}
                      {p2Name && <span className="text-text-muted"> & </span>}
                      {p2Name}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <span className="font-bold text-primary">{r.positionPts}</span>
                    </td>
                    <td className="px-2 py-2.5 text-center text-text-muted">+{r.bonusPts}</td>
                    <td className="px-2 py-2.5 text-center">
                      <span className="font-extrabold text-primary">{r.totalPts}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-text-muted italic">
          Pontuação: 1º=10, 2º=8, 3º=7, 4º=6... (mín. 0) + 5 pts participação
        </p>
      </div>
    );
  }

  // Edit mode
  if (!canManage) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-text-muted">A classificação final ainda não foi reportada pelo gestor.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold flex items-center gap-2">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          Reportar Classificação Final
        </h2>
        <p className="text-xs text-text-muted mt-1">
          Atribua a posição final de cada dupla. Pontos: 1º=10, 2º=8, 3º=7, 4º=6... + 5 participação
        </p>
      </div>

      <div className="space-y-3">
        {results.map((r) => {
          const pts = calculatePositionPoints(r.position);
          return (
            <div key={r.position} className="flex items-center gap-3 bg-surface-alt rounded-lg px-4 py-3">
              <div className="flex-shrink-0 w-10 text-center">
                {r.position <= 3 ? (
                  <span className="text-lg">{medals[r.position - 1]}</span>
                ) : (
                  <span className="font-bold text-text-muted">{r.position}º</span>
                )}
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={r.player1Id}
                  onChange={(e) => updateResult(r.position, "player1Id", e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                >
                  <option value="">Jogador 1...</option>
                  {availablePlayers(r.position, "player1").map((p) => (
                    <option key={p.id} value={p.id}>{p.nickname || p.fullName}</option>
                  ))}
                </select>
                {teamSize === 2 && (
                  <select
                    value={r.player2Id || ""}
                    onChange={(e) => updateResult(r.position, "player2Id", e.target.value)}
                    className="w-full rounded-lg border border-border bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                  >
                    <option value="">Jogador 2...</option>
                    {availablePlayers(r.position, "player2").map((p) => (
                      <option key={p.id} value={p.id}>{p.nickname || p.fullName}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex-shrink-0 text-right w-16">
                <Badge variant="info">{pts.totalPts} pts</Badge>
              </div>

              <button
                type="button"
                onClick={() => removePosition(r.position)}
                className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        {results.length < maxPositions && (
          <Button variant="secondary" onClick={addPosition}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Adicionar {results.length + 1}º Lugar
          </Button>
        )}

        {results.length > 0 && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "A guardar..." : "Guardar Classificação"}
          </Button>
        )}

        {existingResults.length > 0 && (
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}
