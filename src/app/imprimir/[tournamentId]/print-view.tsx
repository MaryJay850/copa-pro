"use client";

export function PrintView({ tournament, standings }: { tournament: any; standings: any[] }) {
  const getTeamName = (team: any) => {
    if (!team) return "?";
    const p1 = team.player1?.nickname || team.player1?.fullName || "";
    const p2 = team.player2?.nickname || team.player2?.fullName || "";
    return p2 ? `${p1} & ${p2}` : p1 || team.name;
  };

  const getScore = (m: any) => {
    const s = [];
    if (m.set1A !== null) s.push(`${m.set1A}-${m.set1B}`);
    if (m.set2A !== null) s.push(`${m.set2A}-${m.set2B}`);
    if (m.set3A !== null) s.push(`${m.set3A}-${m.set3B}`);
    return s.join(" / ");
  };

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white text-black print:p-4">
      {/* Print button (hidden on print) */}
      <div className="print:hidden mb-6 flex gap-3">
        <button
          onClick={() => window.print()}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          Imprimir / Exportar PDF
        </button>
        <button
          onClick={() => window.history.back()}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300"
        >
          Voltar
        </button>
      </div>

      {/* Header */}
      <div className="text-center mb-6 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-bold">{tournament.name}</h1>
        <p className="text-sm text-gray-600 mt-1">
          {tournament.league?.name && `${tournament.league.name}`}
          {tournament.season?.name && ` \u00b7 ${tournament.season.name}`}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {tournament.teamMode === "AMERICANO" ? "Formato Americano" :
           tournament.teamMode === "SOBE_DESCE" ? "Sobe e Desce" :
           tournament.teamMode === "NONSTOP" ? "Nonstop" :
           tournament.teamMode === "RANDOM_PER_ROUND" ? "Aleat\u00f3rias por Ronda" :
           tournament.teamMode === "RANKED_SPLIT" ? "Aleat\u00f3rias por N\u00edvel" :
           tournament.teamMode === "LADDER" ? "Escada" : "Fixas"}
          {" \u00b7 "}{tournament.inscriptions?.length || 0} jogadores
        </p>
      </div>

      {/* Standings */}
      {standings.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-2 border-b border-gray-300 pb-1">Classifica\u00e7\u00e3o</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left">
                <th className="py-1 w-8">#</th>
                <th className="py-1">Jogador</th>
                <th className="py-1 text-center w-12">Pts</th>
                <th className="py-1 text-center w-12">J</th>
                <th className="py-1 text-center w-12">V</th>
                <th className="py-1 text-center w-12">SG</th>
                <th className="py-1 text-center w-12">SP</th>
                <th className="py-1 text-center w-12">Dif</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.id} className="border-b border-gray-200">
                  <td className="py-1 font-bold">{i + 1}</td>
                  <td className="py-1 font-medium">{s.name}</td>
                  <td className="py-1 text-center font-bold">{s.points}</td>
                  <td className="py-1 text-center">{s.matches}</td>
                  <td className="py-1 text-center">{s.wins}</td>
                  <td className="py-1 text-center">{s.setsWon}</td>
                  <td className="py-1 text-center">{s.setsLost}</td>
                  <td className="py-1 text-center">{s.setsWon - s.setsLost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Match Results by Round */}
      <div>
        <h2 className="text-lg font-bold mb-2 border-b border-gray-300 pb-1">Resultados</h2>
        {tournament.rounds.map((round: any, rIdx: number) => (
          <div key={round.id} className="mb-4">
            <h3 className="text-sm font-bold text-gray-600 mb-1">Ronda {rIdx + 1}</h3>
            <table className="w-full text-sm">
              <tbody>
                {round.matches.map((match: any) => (
                  <tr key={match.id} className="border-b border-gray-200">
                    <td className="py-1 text-xs text-gray-400 w-20">{match.court?.name || ""}</td>
                    <td className={`py-1 text-right pr-2 ${match.winnerTeamId === match.teamAId ? "font-bold" : ""}`}>
                      {getTeamName(match.teamA)}
                    </td>
                    <td className="py-1 text-center font-mono text-xs w-24">
                      {match.status === "FINISHED" ? getScore(match) : "vs"}
                    </td>
                    <td className={`py-1 pl-2 ${match.winnerTeamId === match.teamBId ? "font-bold" : ""}`}>
                      {getTeamName(match.teamB)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-400">
        CopaPro &middot; Gerado em {new Date().toLocaleDateString("pt-PT")}
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          @page { margin: 1.5cm; size: A4; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
