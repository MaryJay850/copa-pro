"use client";

import { useState, useEffect } from "react";
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
    <div>
      {loading && entries.length === 0 ? (
        <div className="flex items-center justify-center h-24 text-text-muted text-sm">
          A carregar...
        </div>
      ) : entries.length === 0 ? (
        <div className="flex items-center justify-center h-24 text-text-muted text-sm">
          Sem atividade registada.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Ação</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Utilizador</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Data</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
                    <td className="py-3 px-4 font-medium">
                      {ACTION_LABELS[entry.action] || entry.action}
                    </td>
                    <td className="py-3 px-4 text-text-muted">
                      {entry.userName || "—"}
                    </td>
                    <td className="py-3 px-4 text-right text-text-muted text-xs whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleDateString("pt-PT", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-border">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
              >
                &larr; Anterior
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
                Seguinte &rarr;
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
