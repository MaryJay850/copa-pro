"use client";

import { useState, useEffect } from "react";
import { getPlayerMatchHistory } from "@/lib/actions";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type MatchEntry = {
  id: string;
  date: string;
  tournament: string;
  season: string;
  court: string | null;
  partner: string | null;
  opponents: string[];
  scores: string[];
  result: "WIN" | "LOSS" | "DRAW";
};

type HistoryData = {
  matches: MatchEntry[];
  total: number;
  page: number;
  totalPages: number;
};

export function MatchHistorySection({ playerId }: { playerId: string }) {
  const [data, setData] = useState<HistoryData | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPlayerMatchHistory(playerId, page)
      .then((d) => setData(d as HistoryData))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [playerId, page]);

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historico de Partidas</CardTitle>
        </CardHeader>
        <div className="flex items-center justify-center h-32 text-text-muted text-sm">
          A carregar...
        </div>
      </Card>
    );
  }

  if (!data || data.matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historico de Partidas</CardTitle>
        </CardHeader>
        <div className="flex items-center justify-center h-32 text-text-muted text-sm">
          Sem partidas registadas.
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Historico de Partidas</CardTitle>
          <span className="text-xs text-text-muted">{data.total} jogos</span>
        </div>
      </CardHeader>
      <div className="space-y-2">
        {data.matches.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 px-3 py-2 bg-surface-alt rounded-lg"
          >
            {/* Result badge */}
            <Badge
              variant={
                m.result === "WIN" ? "success" : m.result === "LOSS" ? "default" : "warning"
              }
              className="w-10 text-center text-[10px]"
            >
              {m.result === "WIN" ? "V" : m.result === "LOSS" ? "D" : "E"}
            </Badge>

            {/* Match info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {m.partner && (
                  <span className="text-xs text-text-muted">
                    c/ {m.partner}
                  </span>
                )}
                <span className="text-xs font-medium">
                  vs {m.opponents.join(" & ")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-text-muted">
                <span>{m.tournament}</span>
                {m.court && <span>&middot; {m.court}</span>}
              </div>
            </div>

            {/* Scores */}
            <div className="flex gap-1.5 text-xs font-mono">
              {m.scores.map((s, i) => (
                <span key={i} className="bg-surface px-1.5 py-0.5 rounded border border-border">
                  {s}
                </span>
              ))}
            </div>

            {/* Date */}
            <span className="text-[11px] text-text-muted whitespace-nowrap">
              {m.date ? new Date(m.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" }) : ""}
            </span>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between px-3 pt-3 border-t border-border mt-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            &larr; Anterior
          </Button>
          <span className="text-xs text-text-muted">
            {page} / {data.totalPages}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages || loading}
          >
            Seguinte &rarr;
          </Button>
        </div>
      )}
    </Card>
  );
}
