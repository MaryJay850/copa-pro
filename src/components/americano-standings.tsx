"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export interface AmericanoPlayer {
  id: string;
  name: string;
  points: number;
  matches: number;
  wins: number;
  setsWon: number;
  setsLost: number;
}

export function AmericanoStandings({ players }: { players: AmericanoPlayer[] }) {
  if (players.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Ranking Americano
        </CardTitle>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt/50">
              <th className="px-3 py-2 text-left text-xs font-bold text-text-muted w-8">#</th>
              <th className="px-3 py-2 text-left text-xs font-bold text-text-muted">Jogador</th>
              <th className="px-2 py-2 text-center text-xs font-bold text-text-muted w-12">Pts</th>
              <th className="px-2 py-2 text-center text-xs font-bold text-text-muted w-8">J</th>
              <th className="px-2 py-2 text-center text-xs font-bold text-text-muted w-8">V</th>
              <th className="px-2 py-2 text-center text-xs font-bold text-text-muted w-14">%V</th>
              <th className="px-2 py-2 text-center text-xs font-bold text-text-muted w-12">SG</th>
              <th className="px-2 py-2 text-center text-xs font-bold text-text-muted w-12">SP</th>
              <th className="px-2 py-2 text-center text-xs font-bold text-text-muted w-12">Dif</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, idx) => {
              const diff = player.setsWon - player.setsLost;
              const isTop3 = idx < 3;
              const medalBg =
                idx === 0
                  ? "bg-amber-50 border-l-4 border-l-amber-400"
                  : idx === 1
                  ? "bg-gray-50 border-l-4 border-l-gray-400"
                  : idx === 2
                  ? "bg-orange-50 border-l-4 border-l-orange-400"
                  : "";

              return (
                <tr
                  key={player.id}
                  className={`border-b border-border last:border-0 ${medalBg} ${
                    isTop3 ? "font-semibold" : ""
                  }`}
                >
                  <td className="px-3 py-2.5 text-center">
                    {idx === 0 ? (
                      <span className="text-amber-500 font-bold">1</span>
                    ) : idx === 1 ? (
                      <span className="text-gray-500 font-bold">2</span>
                    ) : idx === 2 ? (
                      <span className="text-orange-600 font-bold">3</span>
                    ) : (
                      <span className="text-text-muted">{idx + 1}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-left">
                    <span className={isTop3 ? "text-text" : "text-text"}>{player.name}</span>
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <span className="font-bold text-primary">{player.points}</span>
                  </td>
                  <td className="px-2 py-2.5 text-center text-text-muted">{player.matches}</td>
                  <td className="px-2 py-2.5 text-center text-text-muted">{player.wins}</td>
                  <td className="px-2 py-2.5 text-center">
                    <span className={`text-xs font-semibold ${
                      player.matches === 0 ? "text-text-muted" :
                      Math.round((player.wins / player.matches) * 100) >= 60 ? "text-emerald-600" :
                      Math.round((player.wins / player.matches) * 100) >= 40 ? "text-amber-600" :
                      "text-red-500"
                    }`}>
                      {player.matches > 0 ? `${Math.round((player.wins / player.matches) * 100)}%` : "—"}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-center text-text-muted">{player.setsWon}</td>
                  <td className="px-2 py-2.5 text-center text-text-muted">{player.setsLost}</td>
                  <td className="px-2 py-2.5 text-center">
                    <span
                      className={
                        diff > 0
                          ? "text-emerald-600 font-semibold"
                          : diff < 0
                          ? "text-red-500 font-semibold"
                          : "text-text-muted"
                      }
                    >
                      {diff > 0 ? `+${diff}` : diff}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
