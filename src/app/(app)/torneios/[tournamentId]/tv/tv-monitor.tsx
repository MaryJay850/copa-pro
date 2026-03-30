"use client";

import { useState, useEffect } from "react";

interface TVMonitorProps {
  tournament: any;
}

export function TVMonitor({ tournament: initialTournament }: TVMonitorProps) {
  const [tournament, setTournament] = useState(initialTournament);
  const [standings, setStandings] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeView, setActiveView] = useState<"matches" | "standings">("matches");

  // Clock update every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-refresh data every 15 seconds
  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await fetch(`/api/tournament/${tournament.id}/tv-data`);
        if (res.ok) {
          const data = await res.json();
          setTournament(data.tournament);
          if (data.standings) setStandings(data.standings);
        }
      } catch {
        // Silently ignore refresh errors
      }
    };
    // Load initial standings too
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, [tournament.id]);

  // Auto-cycle views every 20 seconds if there are standings
  useEffect(() => {
    if (standings.length === 0) return;
    const timer = setInterval(() => {
      setActiveView((v) => (v === "matches" ? "standings" : "matches"));
    }, 20000);
    return () => clearInterval(timer);
  }, [standings.length]);

  const rounds = tournament.rounds || [];
  const currentRound = rounds[rounds.length - 1];
  const inProgressMatches =
    currentRound?.matches?.filter((m: any) => m.status === "IN_PROGRESS") || [];
  const scheduledMatches =
    currentRound?.matches?.filter((m: any) => m.status === "SCHEDULED") || [];
  const finishedMatches =
    currentRound?.matches?.filter((m: any) => m.status === "FINISHED") || [];

  const getTeamName = (team: any) => {
    if (!team) return "?";
    const p1 = team.player1?.nickname || team.player1?.fullName || "";
    const p2 = team.player2?.nickname || team.player2?.fullName || "";
    return p2 ? `${p1} & ${p2}` : p1 || team.name || "?";
  };

  const getScore = (match: any) => {
    const sets: string[] = [];
    if (match.set1A !== null && match.set1B !== null)
      sets.push(`${match.set1A}-${match.set1B}`);
    if (match.set2A !== null && match.set2B !== null)
      sets.push(`${match.set2A}-${match.set2B}`);
    if (match.set3A !== null && match.set3B !== null)
      sets.push(`${match.set3A}-${match.set3B}`);
    return sets.join("  ");
  };

  const teamModeLabel =
    tournament.teamMode === "AMERICANO"
      ? "Americano"
      : tournament.teamMode === "SOBE_DESCE"
        ? "Sobe e Desce"
        : tournament.teamMode === "NONSTOP"
          ? "Nonstop"
          : tournament.teamMode === "LADDER"
            ? "Escada"
            : "";

  return (
    <div className="fixed inset-0 z-[100] bg-gray-950 text-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 bg-gray-900 border-b border-gray-800">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{tournament.name}</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {tournament.league?.name && `${tournament.league.name} · `}
            {teamModeLabel}
            {currentRound && ` · Ronda ${currentRound.index}`}
          </p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-mono font-bold text-emerald-400">
            {currentTime.toLocaleTimeString("pt-PT", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <div className="text-gray-500 text-xs mt-0.5">
            {currentTime.toLocaleDateString("pt-PT", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 px-8 py-6 overflow-hidden">
        {activeView === "matches" ? (
          <div className="h-full flex flex-col">
            {/* In Progress */}
            {inProgressMatches.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-3">
                  Em Jogo
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {inProgressMatches.map((match: any) => (
                    <div
                      key={match.id}
                      className="bg-emerald-900/30 border border-emerald-700 rounded-xl p-5"
                    >
                      <div className="text-[11px] text-emerald-400 font-bold uppercase mb-2">
                        {match.court?.name || `Campo ${match.slotIndex + 1}`}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-bold">
                          {getTeamName(match.teamA)}
                        </div>
                        <div className="text-2xl font-mono font-bold text-emerald-400 px-4">
                          {getScore(match) || "0-0"}
                        </div>
                        <div className="text-lg font-bold text-right">
                          {getTeamName(match.teamB)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Finished this round */}
            {finishedMatches.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">
                  Terminados
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {finishedMatches.map((match: any) => (
                    <div
                      key={match.id}
                      className="bg-gray-900/50 border border-gray-800 rounded-xl p-4"
                    >
                      <div className="text-[10px] text-gray-600 font-bold uppercase mb-1.5">
                        {match.court?.name || `Campo ${match.slotIndex + 1}`}
                      </div>
                      <div className="flex items-center justify-between">
                        <div
                          className={`text-base font-semibold ${match.winnerTeamId === match.teamAId ? "text-emerald-400" : "text-gray-400"}`}
                        >
                          {getTeamName(match.teamA)}
                        </div>
                        <div className="text-lg font-mono font-bold text-gray-300 px-3">
                          {getScore(match)}
                        </div>
                        <div
                          className={`text-base font-semibold text-right ${match.winnerTeamId === match.teamBId ? "text-emerald-400" : "text-gray-400"}`}
                        >
                          {getTeamName(match.teamB)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scheduled */}
            {scheduledMatches.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">
                  Proximos Jogos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {scheduledMatches.map((match: any) => (
                    <div
                      key={match.id}
                      className="bg-gray-900/30 border border-gray-800 rounded-xl p-4"
                    >
                      <div className="text-[10px] text-gray-600 font-bold uppercase mb-1.5">
                        {match.court?.name || `Campo ${match.slotIndex + 1}`}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-base font-medium text-gray-300">
                          {getTeamName(match.teamA)}
                        </div>
                        <div className="text-sm text-gray-600 px-3">vs</div>
                        <div className="text-base font-medium text-gray-300 text-right">
                          {getTeamName(match.teamB)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state when no matches at all */}
            {inProgressMatches.length === 0 &&
              finishedMatches.length === 0 &&
              scheduledMatches.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-2xl text-gray-600 font-medium">
                    Sem jogos nesta ronda
                  </p>
                </div>
              )}
          </div>
        ) : (
          /* Standings view */
          <div className="h-full">
            <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-4">
              Ranking
            </h2>
            <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
                    <th className="py-3 px-4 text-left w-12">#</th>
                    <th className="py-3 px-4 text-left">Jogador</th>
                    <th className="py-3 px-4 text-center">Pts</th>
                    <th className="py-3 px-4 text-center">J</th>
                    <th className="py-3 px-4 text-center">V</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.slice(0, 16).map((player: any, idx: number) => (
                    <tr
                      key={player.id}
                      className={`border-b border-gray-800/50 ${idx < 3 ? "text-lg" : "text-base"}`}
                    >
                      <td
                        className={`py-3 px-4 font-bold ${idx === 0 ? "text-amber-400" : idx === 1 ? "text-gray-300" : idx === 2 ? "text-orange-400" : "text-gray-500"}`}
                      >
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-semibold">{player.name}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-400">
                        {player.points}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-400">
                        {player.matches}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-400">
                        {player.wins}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-8 py-3 bg-gray-900 border-t border-gray-800 flex items-center justify-between text-xs text-gray-600">
        <span>CopaPro</span>
        {standings.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView("matches")}
              className={`px-2 py-1 rounded transition-colors ${activeView === "matches" ? "text-emerald-400 bg-gray-800" : "hover:text-gray-400"}`}
            >
              Jogos
            </button>
            <button
              onClick={() => setActiveView("standings")}
              className={`px-2 py-1 rounded transition-colors ${activeView === "standings" ? "text-emerald-400 bg-gray-800" : "hover:text-gray-400"}`}
            >
              Ranking
            </button>
          </div>
        )}
        <span>Atualizacao automatica a cada 15s</span>
      </div>
    </div>
  );
}
