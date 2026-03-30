"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface LadderPlayer {
  playerId: string;
  playerName: string;
  position: number;
  hasActiveChallenge: boolean;
}

export interface LadderChallengeInfo {
  id: string;
  challengerName: string;
  defenderName: string;
  status: string;
  matchId?: string;
  createdAt: string;
}

export function LadderView({
  positions,
  challenges,
  currentPlayerId,
  canManage,
  onChallenge,
  onAccept,
  onDecline,
}: {
  positions: LadderPlayer[];
  challenges: LadderChallengeInfo[];
  currentPlayerId: string | null;
  canManage: boolean;
  onChallenge: (defenderId: string) => Promise<void>;
  onAccept: (challengeId: string) => Promise<void>;
  onDecline: (challengeId: string) => Promise<void>;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  const currentPosition = positions.find(p => p.playerId === currentPlayerId);
  const hasActiveChallenge = currentPosition?.hasActiveChallenge || false;

  const pendingForMe = challenges.filter(
    c =>
      c.status === "PENDING" &&
      positions.find(p => p.playerName === c.defenderName)?.playerId ===
        currentPlayerId
  );

  const canChallengePlayer = (target: LadderPlayer) => {
    if (!currentPlayerId || !currentPosition) return false;
    if (hasActiveChallenge) return false;
    if (target.hasActiveChallenge) return false;
    if (target.playerId === currentPlayerId) return false;
    const diff = currentPosition.position - target.position;
    return diff > 0 && diff <= 2;
  };

  return (
    <div className="space-y-4">
      {/* Pending challenges for current user */}
      {pendingForMe.length > 0 && (
        <Card className="py-4 px-5 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
          <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase mb-2">
            Desafios Pendentes
          </h4>
          {pendingForMe.map(c => (
            <div key={c.id} className="flex items-center justify-between py-2">
              <span className="text-sm font-medium">
                {c.challengerName} desafia-te!
              </span>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  onClick={async () => {
                    setLoading(c.id);
                    await onAccept(c.id);
                    setLoading(null);
                  }}
                  disabled={loading === c.id}
                >
                  Aceitar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    setLoading(c.id);
                    await onDecline(c.id);
                    setLoading(null);
                  }}
                  disabled={loading === c.id}
                >
                  Recusar
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Ladder positions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <svg
              className="w-4 h-4 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            Escada
          </CardTitle>
        </CardHeader>
        <div className="px-4 pb-4 space-y-1">
          {positions.map((p, idx) => {
            const isMe = p.playerId === currentPlayerId;
            const canChallenge = canChallengePlayer(p);
            return (
              <div
                key={p.playerId}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 border ${
                  isMe
                    ? "border-primary bg-primary/5"
                    : "border-border"
                } ${idx === 0 ? "bg-amber-50 border-amber-300 dark:bg-amber-950/20 dark:border-amber-700" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-bold w-6 text-center ${
                      idx === 0
                        ? "text-amber-600"
                        : idx === 1
                          ? "text-gray-500"
                          : idx === 2
                            ? "text-orange-600"
                            : "text-text-muted"
                    }`}
                  >
                    {p.position}
                  </span>
                  <span
                    className={`text-sm font-medium ${isMe ? "text-primary" : ""}`}
                  >
                    {p.playerName}
                    {isMe && (
                      <span className="text-[10px] ml-1 text-primary">
                        (tu)
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {p.hasActiveChallenge && (
                    <Badge variant="warning">Desafio ativo</Badge>
                  )}
                  {canChallenge && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        setLoading(p.playerId);
                        await onChallenge(p.playerId);
                        setLoading(null);
                      }}
                      disabled={loading === p.playerId}
                    >
                      Desafiar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Active challenges */}
      {challenges.filter(c => c.status === "PENDING" || c.status === "ACCEPTED")
        .length > 0 && (
        <Card className="py-4 px-5">
          <h4 className="text-xs font-bold text-text-muted uppercase mb-2">
            Desafios Ativos
          </h4>
          {challenges
            .filter(c => c.status === "PENDING" || c.status === "ACCEPTED")
            .map(c => (
              <div
                key={c.id}
                className="flex items-center justify-between py-1.5 text-sm border-b border-border/50 last:border-0"
              >
                <span>
                  {c.challengerName} &rarr; {c.defenderName}
                </span>
                <Badge variant={c.status === "ACCEPTED" ? "info" : "default"}>
                  {c.status === "PENDING" ? "Pendente" : "Aceite"}
                </Badge>
              </div>
            ))}
        </Card>
      )}

      {/* Recent history */}
      {challenges.filter(c => c.status === "COMPLETED").length > 0 && (
        <Card className="py-4 px-5">
          <h4 className="text-xs font-bold text-text-muted uppercase mb-2">
            Historico
          </h4>
          {challenges
            .filter(c => c.status === "COMPLETED")
            .slice(0, 10)
            .map(c => (
              <div
                key={c.id}
                className="flex items-center justify-between py-1.5 text-sm text-text-muted border-b border-border/50 last:border-0"
              >
                <span>
                  {c.challengerName} vs {c.defenderName}
                </span>
                <span className="text-xs">
                  {new Date(c.createdAt).toLocaleDateString("pt-PT")}
                </span>
              </div>
            ))}
        </Card>
      )}
    </div>
  );
}
