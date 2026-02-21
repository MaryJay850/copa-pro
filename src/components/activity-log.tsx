"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getLeagueActivityLog } from "@/lib/actions/audit-actions";

type LogEntry = {
  id: string;
  userName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  SAVE_MATCH: "Resultado registado",
  RESET_MATCH: "Jogo reposto",
  PLAYER_SUBMIT_MATCH: "Resultado submetido (jogador)",
  CREATE_TOURNAMENT: "Torneio criado",
  FINISH_TOURNAMENT: "Torneio encerrado",
  REOPEN_TOURNAMENT: "Torneio reaberto",
  DELETE_TOURNAMENT: "Torneio eliminado",
  UPDATE_SEASON: "Época atualizada",
  CLONE_SEASON: "Época duplicada",
  SEND_WHATSAPP: "Mensagem WhatsApp",
  UPDATE_COURT_SLOTS: "Horários campo",
  ADD_PLAYER_TO_LEAGUE: "Jogador adicionado",
  REMOVE_PLAYER_FROM_LEAGUE: "Jogador removido",
  ASSIGN_LEAGUE_MANAGER: "Gestor atribuído",
};

export function ActivityLog({ leagueId }: { leagueId: string }) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    getLeagueActivityLog(leagueId, page, 15)
      .then((data) => {
        setEntries(data.logs as LogEntry[]);
        setTotal(data.total);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [leagueId, page]);

  const totalPages = Math.ceil(total / 15);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Atividade Recente</CardTitle>
      </CardHeader>

      {loading && entries.length === 0 ? (
        <div className="flex items-center justify-center h-24 text-text-muted text-sm">
          A carregar...
        </div>
      ) : entries.length === 0 ? (
        <div className="flex items-center justify-center h-24 text-text-muted text-sm">
          Sem atividade registada.
        </div>
      ) : (
        <div className="space-y-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between px-3 py-2 bg-surface-alt rounded-lg text-xs"
            >
              <div className="flex-1 min-w-0">
                <span className="font-medium">
                  {ACTION_LABELS[entry.action] || entry.action}
                </span>
                {entry.userName && (
                  <span className="text-text-muted ml-1">
                    por {entry.userName}
                  </span>
                )}
              </div>
              <span className="text-text-muted whitespace-nowrap ml-2">
                {new Date(entry.createdAt).toLocaleDateString("pt-PT", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
              >
                ← Anterior
              </Button>
              <span className="text-xs text-text-muted">
                {page} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
              >
                Seguinte →
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
