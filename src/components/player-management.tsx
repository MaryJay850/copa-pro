"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { desistPlayer, checkInPlayer, checkInAllPlayers } from "@/lib/actions";
import { sanitizeError } from "@/lib/error-utils";

interface Inscription {
  id: string;
  playerId: string;
  orderIndex: number;
  status: string;
  replacesId: string | null;
  checkedIn?: boolean;
  checkedInAt?: string | null;
  player: {
    id: string;
    fullName: string;
    nickname: string | null;
  };
}

export function PlayerManagement({
  tournamentId,
  inscriptions,
  readOnly = false,
}: {
  tournamentId: string;
  inscriptions: Inscription[];
  readOnly?: boolean;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [checkingInAll, setCheckingInAll] = useState(false);

  const titulares = inscriptions.filter(
    (i) => i.status === "TITULAR" || i.status === "PROMOVIDO"
  );
  const suplentes = inscriptions.filter((i) => i.status === "SUPLENTE");
  const desistidos = inscriptions.filter((i) => i.status === "DESISTIU");

  const checkedInCount = titulares.filter((i) => i.checkedIn).length;
  const allCheckedIn = checkedInCount === titulares.length && titulares.length > 0;

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
      setError(sanitizeError(e, "Erro ao processar desistência."));
    }
    setLoading(null);
  };

  const handleCheckIn = async (playerId: string) => {
    setCheckingIn(playerId);
    setError(null);
    try {
      await checkInPlayer(tournamentId, playerId);
    } catch (e) {
      setError(sanitizeError(e, "Erro ao fazer check-in."));
    }
    setCheckingIn(null);
  };

  const handleCheckInAll = async () => {
    setCheckingInAll(true);
    setError(null);
    try {
      await checkInAllPlayers(tournamentId);
    } catch (e) {
      setError(sanitizeError(e, "Erro ao fazer check-in de todos."));
    }
    setCheckingInAll(false);
  };

  const playerName = (p: { fullName: string; nickname: string | null }) =>
    p.nickname || p.fullName.split(" ")[0];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Gestão de Jogadores</CardTitle>
          {!readOnly && titulares.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">
                {checkedInCount}/{titulares.length} presentes
              </span>
              {!allCheckedIn && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleCheckInAll}
                  disabled={checkingInAll}
                  className="text-xs gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {checkingInAll ? "..." : "Check-in Todos"}
                </Button>
              )}
            </div>
          )}
        </div>
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
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                  insc.checkedIn ? "bg-emerald-50" : "bg-surface-alt"
                }`}
              >
                <div className="flex items-center gap-2">
                  {/* Check-in indicator */}
                  {!readOnly && (
                    <button
                      onClick={() => handleCheckIn(insc.playerId)}
                      disabled={checkingIn === insc.playerId}
                      className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                        insc.checkedIn
                          ? "bg-emerald-500 text-white"
                          : "border-2 border-border hover:border-emerald-400"
                      }`}
                      title={insc.checkedIn ? "Presente - clique para remover" : "Marcar como presente"}
                    >
                      {checkingIn === insc.playerId ? (
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : insc.checkedIn ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : null}
                    </button>
                  )}
                  {readOnly && insc.checkedIn && (
                    <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 bg-emerald-500 text-white">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <span className="font-medium">{playerName(insc.player)}</span>
                  {insc.status === "PROMOVIDO" && (
                    <Badge variant="info">Promovido</Badge>
                  )}
                </div>
                {!readOnly && (
                  confirmId === insc.playerId ? (
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
                  )
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
