interface RankingRow {
  position: number;
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
  if (rows.length === 0) {
    return <p className="text-sm text-text-muted py-4 text-center">Sem dados de ranking ainda.</p>;
  }
  return (
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
          {rows.map((r) => (
            <tr key={r.playerName} className="border-b border-border/50 hover:bg-surface-alt transition-colors">
              <td className="py-2.5 pr-3 font-medium text-text-muted">{r.position}</td>
              <td className="py-2.5 pr-3 font-medium">{r.playerName}</td>
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
        </tbody>
      </table>
    </div>
  );
}