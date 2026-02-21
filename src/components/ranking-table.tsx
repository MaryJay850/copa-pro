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
}

export function RankingTable({ rows }: { rows: RankingRow[] }) {
  const [search, setSearch] = useState("");

  if (rows.length === 0) {
    return <p className="text-sm text-text-muted py-4 text-center">Sem dados de ranking ainda.</p>;
  }

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
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-muted uppercase tracking-wide">
              <th className="pb-2 pr-3 w-8">#</th>
              <th className="pb-2 pr-3">Jogador</th>
              <th className="pb-2 pr-3 text-center">Pts</th>
              <th className="pb-2 pr-3 text-center">J</th>
              <th className="pb-2 pr-3 text-center">V</th>
              <th className="pb-2 pr-3 text-center">E</th>
              <th className="pb-2 pr-3 text-center">D</th>
              <th className="pb-2 pr-3 text-center">SG</th>
              <th className="pb-2 pr-3 text-center">SP</th>
              <th className="pb-2 text-center">Dif</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
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
                <td className="py-2.5 pr-3 text-center text-text-muted">{r.matchesPlayed}</td>
                <td className="py-2.5 pr-3 text-center text-emerald-600">{r.wins}</td>
                <td className="py-2.5 pr-3 text-center text-amber-600">{r.draws}</td>
                <td className="py-2.5 pr-3 text-center text-red-500">{r.losses}</td>
                <td className="py-2.5 pr-3 text-center">{r.setsWon}</td>
                <td className="py-2.5 pr-3 text-center">{r.setsLost}</td>
                <td className="py-2.5 text-center font-medium">{r.setsDiff > 0 ? `+${r.setsDiff}` : r.setsDiff}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="py-4 text-center text-text-muted text-sm">
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
