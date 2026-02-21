"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { desistPlayer } from "@/lib/actions";

interface Inscription {
  id: string;
  playerId: string;
  orderIndex: number;
  status: string;
  replacesId: string | null;
  player: {
    id: string;
    fullName: string;
    nickname: string | null;
  };
}

export function PlayerManagement({
  tournamentId,
  inscriptions,
}: {
  tournamentId: string;
  inscriptions: Inscription[];
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const titulares = inscriptions.filter(
    (i) => i.status === "TITULAR" || i.status === "PROMOVIDO"
  );
  const suplentes = inscriptions.filter((i) => i.status === "SUPLENTE");
  const desistidos = inscriptions.filter((i) => i.status === "DESISTIU");

  const handleDesist = async (playerId: string) => {
    setLoading(playerId);
    setError(null);
    try {
      const result = await desistPlayer(tournamentId, playerId);
      if (result.promoted) {
        // Success with substitution
      }
      setConfirmId(null);
    } catch (e) {
      setError((e as Error).message || "Erro ao processar desistência.");
    }
    setLoading(null);
  };

  const playerName = (p: { fullName: string; nickname: string | null }) =>
    p.nickname || p.fullName.split(" ")[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestão de Jogadores</CardTitle>
      </CardHeader>
      <div className="space-y-4">
        {/* Titulares */}
        <div>
          <h3 className="text-sm font-semibold text-slate-600 mb-2 px-3">
            Titulares ({titulares.length})
          </h3>
          <div className="grid gap-1.5">
            {titulares.map((insc) => (
              <div
                key={insc.id}
                className="flex items-center justify-between px-3 py-2 bg-surface-alt rounded-lg text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{playerName(insc.player)}</span>
                  {insc.status === "PROMOVIDO" && (
                    <Badge variant="info">Promovido</Badge>
                  )}
                </div>
                {confirmId === insc.playerId ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-600">Confirmar?</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDesist(insc.playerId)}
                      disabled={loading === insc.playerId}
                      className="text-red-600 hover:bg-red-50 text-xs px-2 py-1"
                    >
                      {loading === insc.playerId ? "..." : "Sim"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmId(null)}
                      className="text-xs px-2 py-1"
                    >
                      Não
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmId(insc.playerId)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs px-2 py-1"
                  >
                    Desistir
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Suplentes */}
        {suplentes.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-2 px-3">
              Fila de Suplentes ({suplentes.length})
            </h3>
            <div className="grid gap-1.5">
              {suplentes.map((insc, idx) => (
                <div
                  key={insc.id}
                  className="flex items-center justify-between px-3 py-2 bg-amber-50 rounded-lg text-sm"
                >
                  <span className="font-medium">{playerName(insc.player)}</span>
                  <Badge variant="warning">#{idx + 1} na fila</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Desistidos */}
        {desistidos.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-2 px-3">
              Desistências ({desistidos.length})
            </h3>
            <div className="grid gap-1.5">
              {desistidos.map((insc) => (
                <div
                  key={insc.id}
                  className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg text-sm line-through text-text-muted"
                >
                  <span>{playerName(insc.player)}</span>
                  <Badge variant="default">Desistiu</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mx-3">
            {error}
          </p>
        )}
      </div>
    </Card>
  );
}
