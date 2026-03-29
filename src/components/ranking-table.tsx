"use client";

import { useState } from "react";
import Link from "next/link";

interface RankingRow {
  position: number;
  playerId?: string;
  playerName: string;
  pointsTotal: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  setsDiff: number;
  manualAdjustment?: number;
  adjustmentNote?: string | null;
}

interface RankingTableProps {
  rows: RankingRow[];
  rankingMode?: string; // "SUM" | "AVERAGE"
  canManage?: boolean;
  onAdjust?: (playerId: string, playerName: string, currentAdjustment: number, currentNote: string | null) => void;
}

export function RankingTable({ rows, rankingMode = "SUM", canManage = false, onAdjust }: RankingTableProps) {
  const [search, setSearch] = useState("");

  if (rows.length === 0) {
    return <p className="text-sm text-text-muted py-4 text-center">Sem dados de ranking ainda.</p>;
  }

  const hasAdjustments = rows.some((r) => (r.manualAdjustment ?? 0) !== 0);
  const isAverage = rankingMode === "AVERAGE";

  const filtered = search
    ? rows.filter((r) => r.playerName.toLowerCase().includes(search.toLowerCase()))
    : rows;

  return (
    <div>
      {rows.length > 5 && (
        <div className="px-1 pb-3">
          <input
            type="text"
            placeholder="Pesquisar jogador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 rounded-lg border border-border px-3 py-2 text-sm placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
      )}
      {isAverage && (
        <div className="px-1 pb-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-text-muted bg-primary/5 rounded-md px-2 py-1">
            <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Ranking por média (pontos/jogo). Ordenado por média de pontos por jogo.
          </span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-muted uppercase tracking-wide">
              <th className="pb-2 pr-3 w-8" title="Posição no ranking">#</th>
              <th className="pb-2 pr-3" title="Nome do jogador">Jogador</th>
              <th className="pb-2 pr-3 text-center cursor-help" title={isAverage ? "Pontos Totais (ordenação por média)" : "Pontos Totais\nCálculo: pts por set + pts por resultado"}>Pts</th>
              {isAverage && (
                <th className="pb-2 pr-3 text-center cursor-help" title="Média de pontos por jogo disputado">Méd</th>
              )}
              <th className="pb-2 pr-3 text-center cursor-help" title="Jogos disputados\nTotal de jogos em que o jogador participou">J</th>
              <th className="pb-2 pr-3 text-center cursor-help" title="Vitórias\nJogos em que o jogador ganhou mais sets que o adversário">V</th>
              <th className="pb-2 pr-3 text-center cursor-help" title="Empates\nJogos em que ambos ganharam o mesmo número de sets">E</th>
              <th className="pb-2 pr-3 text-center cursor-help" title="Derrotas\nJogos em que o jogador perdeu mais sets que o adversário">D</th>
              <th className="pb-2 pr-3 text-center cursor-help" title="Sets Ganhos\nNúmero total de sets ganhos em todos os jogos">SG</th>
              <th className="pb-2 pr-3 text-center cursor-help" title="Sets Perdidos\nNúmero total de sets perdidos em todos os jogos">SP</th>
              <th className="pb-2 text-center cursor-help" title="Diferença de Sets\nCálculo: Sets Ganhos - Sets Perdidos">Dif</th>
              {hasAdjustments && (
                <th className="pb-2 pr-3 text-center cursor-help" title="Ajuste manual de pontos aplicado pelo gestor">Ajuste</th>
              )}
              {canManage && onAdjust && (
                <th className="pb-2 text-center w-8"></th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const avg = r.matchesPlayed > 0 ? (r.pointsTotal / r.matchesPlayed).toFixed(1) : "0.0";
              const adj = r.manualAdjustment ?? 0;
              return (
                <tr key={r.playerName} className="border-b border-border/50 hover:bg-surface-alt transition-colors">
                  <td className="py-2.5 pr-3 font-medium text-text-muted">{r.position}</td>
                  <td className="py-2.5 pr-3 font-medium">
                    {r.playerId ? (
                      <Link href={`/jogadores/${r.playerId}`} className="hover:text-primary transition-colors">
                        {r.playerName}
                      </Link>
                    ) : (
                      r.playerName
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-center font-bold text-primary">{r.pointsTotal}</td>
                  {isAverage && (
                    <td className="py-2.5 pr-3 text-center font-semibold text-violet-600">{avg}</td>
                  )}
                  <td className="py-2.5 pr-3 text-center text-text-muted">{r.matchesPlayed}</td>
                  <td className="py-2.5 pr-3 text-center text-emerald-600">{r.wins}</td>
                  <td className="py-2.5 pr-3 text-center text-amber-600">{r.draws}</td>
                  <td className="py-2.5 pr-3 text-center text-red-500">{r.losses}</td>
                  <td className="py-2.5 pr-3 text-center">{r.setsWon}</td>
                  <td className="py-2.5 pr-3 text-center">{r.setsLost}</td>
                  <td className="py-2.5 text-center font-medium">{r.setsDiff > 0 ? `+${r.setsDiff}` : r.setsDiff}</td>
                  {hasAdjustments && (
                    <td className="py-2.5 pr-3 text-center">
                      {adj !== 0 && (
                        <span
                          className={`text-xs font-semibold ${adj > 0 ? "text-emerald-600" : "text-red-500"}`}
                          title={r.adjustmentNote || undefined}
                        >
                          {adj > 0 ? `+${adj}` : adj}
                        </span>
                      )}
                    </td>
                  )}
                  {canManage && onAdjust && (
                    <td className="py-2.5 text-center">
                      <button
                        onClick={() => onAdjust(r.playerId || "", r.playerName, adj, r.adjustmentNote ?? null)}
                        className="text-text-muted hover:text-primary transition-colors p-1"
                        title="Ajustar pontuação"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="py-4 text-center text-text-muted text-sm">
                  Nenhum jogador encontrado para &quot;{search}&quot;
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
