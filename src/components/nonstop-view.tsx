"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface NonstopQueueEntry {
  id: string;
  playerId: string;
  playerName: string;
  joinedAt: string;
  status: string;
}

export interface NonstopActiveMatch {
  id: string;
  courtName: string;
  team1: string[];
  team2: string[];
  scores?: { set1A?: number; set1B?: number; set2A?: number; set2B?: number; set3A?: number; set3B?: number };
}

export function NonstopView({
  queue,
  activeMatches,
  availableCourts,
  currentPlayerInQueue,
  currentPlayerPlaying,
  onJoinQueue,
  onLeaveQueue,
  onRejoinQueue,
}: {
  queue: NonstopQueueEntry[];
  activeMatches: NonstopActiveMatch[];
  availableCourts: number;
  currentPlayerInQueue: boolean;
  currentPlayerPlaying: boolean;
  onJoinQueue: () => Promise<void>;
  onLeaveQueue: () => Promise<void>;
  onRejoinQueue: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: () => Promise<void>) => {
    setLoading(true);
    try { await action(); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <Card className="py-4 px-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">Fila de Espera</h3>
            <p className="text-xs text-text-muted mt-0.5">
              {queue.length} jogador(es) na fila &middot; {availableCourts} campo(s) dispon&iacute;vel(eis)
            </p>
          </div>
          {!currentPlayerInQueue && !currentPlayerPlaying && (
            <Button onClick={() => handleAction(onJoinQueue)} disabled={loading} size="sm">
              Entrar na Fila
            </Button>
          )}
          {currentPlayerInQueue && (
            <Button onClick={() => handleAction(onLeaveQueue)} disabled={loading} size="sm" variant="secondary">
              Sair da Fila
            </Button>
          )}
          {currentPlayerPlaying && (
            <Badge variant="info" pulse>A Jogar</Badge>
          )}
        </div>
      </Card>

      {/* Queue list */}
      {queue.length > 0 && (
        <Card className="py-4 px-5">
          <h4 className="text-xs font-bold text-text-muted uppercase mb-2">Na Fila</h4>
          <div className="space-y-1.5">
            {queue.map((entry, idx) => (
              <div key={entry.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted font-mono w-5">{idx + 1}.</span>
                  <span className="font-medium">{entry.playerName}</span>
                </div>
                <span className="text-xs text-text-muted">
                  {new Date(entry.joinedAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Active matches */}
      {activeMatches.length > 0 && (
        <Card className="py-4 px-5">
          <h4 className="text-xs font-bold text-text-muted uppercase mb-2">Jogos em Curso</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {activeMatches.map((match) => (
              <div key={match.id} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <div className="text-[10px] font-bold text-text-muted uppercase mb-1">{match.courtName}</div>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    {match.team1.map((n, i) => <div key={i} className="font-medium">{n}</div>)}
                  </div>
                  <span className="text-text-muted font-bold">VS</span>
                  <div className="text-right">
                    {match.team2.map((n, i) => <div key={i} className="font-medium">{n}</div>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
