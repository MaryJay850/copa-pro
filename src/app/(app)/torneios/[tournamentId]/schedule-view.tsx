"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { MatchCard } from "@/components/match-card";
import { MatchCalendar } from "@/components/match-calendar";

type ScheduleRound = {
  id: string;
  index: number;
  matches: any[];
};

export function ScheduleView({
  rounds,
  numberOfSets,
  canManage,
  startDate,
  currentPlayerId,
  currentUserId,
  pendingSubmissionsMap,
  tournamentName,
  seasonName,
  tournamentId,
  teams,
  teamMode,
  numberOfRounds,
}: {
  rounds: ScheduleRound[];
  numberOfSets: number;
  canManage: boolean;
  startDate: string | null;
  currentPlayerId?: string;
  currentUserId?: string;
  pendingSubmissionsMap?: Record<string, any>;
  tournamentName?: string;
  seasonName?: string;
  tournamentId?: string;
  teams?: any[];
  teamMode?: string;
  numberOfRounds?: number;
}) {
  const [view, setView] = useState<"generated" | "list" | "calendar" | "print">("generated");
  const printRef = useRef<HTMLDivElement>(null);

  // Get unique courts from all rounds
  const allCourts = (() => {
    const courtMap = new Map<string, string>();
    for (const round of rounds) {
      for (const match of round.matches) {
        const courtId = match.court?.id || match.courtId || "";
        const courtName = match.court?.name || `Campo ${courtId}`;
        if (courtId && !courtMap.has(courtId)) {
          courtMap.set(courtId, courtName);
        }
      }
    }
    return Array.from(courtMap.entries()).map(([id, name]) => ({ id, name }));
  })();

  const printStyles = `
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000; margin: 0; padding: 0; }
    .print-header { text-align: center; margin-bottom: 12px; }
    .print-header h1 { font-size: 16px; margin: 0 0 2px 0; }
    .print-header p { font-size: 11px; margin: 0; color: #444; }
    .court-badge { display: inline-block; background: #333; color: #fff; padding: 2px 10px; border-radius: 4px; font-size: 13px; font-weight: bold; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
    th { background-color: #e8e8e8; font-weight: bold; font-size: 10px; text-transform: uppercase; }
    .vs-cell { text-align: center; font-weight: bold; color: #666; width: 30px; }
    .set-cell { width: 90px; text-align: center; min-height: 28px; font-size: 16px; }
    .set-dash { font-size: 18px; font-weight: bold; color: #000; letter-spacing: 0; }
    .team-cell { font-weight: 500; }
    .match-code { font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #000; font-weight: bold; text-align: center; }
    .print-footer { margin-top: 12px; padding-top: 6px; border-top: 1px solid #ccc; display: flex; justify-content: space-between; font-size: 9px; color: #888; }
    .page-break { page-break-before: always; margin-top: 20px; }
  `;

  const handlePrint = () => {
    if (!printRef.current) return;

    const printContent = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${tournamentName || "Torneio"} - Folha de Resultados</title>
        <style>${printStyles}</style>
      </head>
      <body>
        ${printContent}
        <script>window.onload = function() { window.print(); window.close(); }<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Build set column headers based on numberOfSets
  const setHeaders: string[] = [];
  if (numberOfSets >= 1) setHeaders.push("Set 1");
  if (numberOfSets >= 2) setHeaders.push("Set 2");
  if (numberOfSets >= 3) setHeaders.push("Set 3");

  // Helper to get team display name
  const getTeamName = (team: any): string => {
    if (!team) return "\u2014";
    const p1 = team.player1?.nickname || team.player1?.fullName?.split(" ")[0] || "";
    const p2 = team.player2
      ? team.player2.nickname || team.player2.fullName?.split(" ")[0] || ""
      : null;
    return p2 ? `${p1} & ${p2}` : p1;
  };

  // Helper to format existing result
  const getSetScore = (match: any, setNum: number): string => {
    if (match.status !== "FINISHED") return "";
    const a = match[`set${setNum}A`];
    const b = match[`set${setNum}B`];
    if (a === null || b === null) return "";
    return `${a} - ${b}`;
  };

  return (
    <div className="space-y-4" id="schedule">
      {/* View toggle */}
      <div className="flex items-center gap-1.5 bg-surface rounded-xl border border-border p-1 w-fit">
        <button
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${view === "generated" ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text hover:bg-surface-hover"}`}
          onClick={() => setView("generated")}
        >
          Gerado
        </button>
        <button
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${view === "list" ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text hover:bg-surface-hover"}`}
          onClick={() => setView("list")}
        >
          Lista
        </button>
        <button
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${view === "calendar" ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text hover:bg-surface-hover"}`}
          onClick={() => setView("calendar")}
        >
          Calendário
        </button>
        <button
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center gap-1.5 ${view === "print" ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text hover:bg-surface-hover"}`}
          onClick={() => setView("print")}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Folha de Resultados
        </button>
      </div>

      {view === "generated" ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {teamMode === "LADDER"
                ? "Escada - Desafios"
                : teamMode === "NONSTOP"
                ? "Nonstop - Jogos"
                : teamMode === "AMERICANO"
                ? "Americano - Equipas por Ronda"
                : teamMode === "SOBE_DESCE"
                ? "Sobe e Desce - Equipas por Ronda"
                : teamMode === "RANDOM_PER_ROUND" || teamMode === "RANKED_SPLIT"
                ? "Equipas Aleatórias por Ronda"
                : "Equipas"}
            </CardTitle>
          </CardHeader>
          <div className="px-1 pb-1">
            {teamMode === "RANDOM_PER_ROUND" || teamMode === "RANKED_SPLIT" || teamMode === "AMERICANO" || teamMode === "SOBE_DESCE" || teamMode === "NONSTOP" || teamMode === "LADDER" ? (
              <>
                <p className="text-sm text-text-muted mb-3 font-medium">
                  Cada ronda tem equipas diferentes geradas aleatoriamente.
                  {numberOfRounds && ` ${numberOfRounds} rondas configuradas.`}
                </p>
                {rounds.length > 0 ? (
                  <div className="space-y-3">
                    {rounds.map((round) => {
                      const roundTeams = (teams || []).filter((t: any) => t.roundId === round.id);
                      if (roundTeams.length === 0) return null;
                      return (
                        <div key={round.id} className="border border-border rounded-xl p-3">
                          <p className="text-sm font-bold mb-2">Ronda {round.index}</p>
                          <div className="grid gap-1.5 sm:grid-cols-2">
                            {roundTeams.map((team: any) => (
                              <div key={team.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-surface-alt rounded-lg text-xs font-medium">
                                <span>{team.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">Equipas serão geradas ao publicar o calendário.</p>
                )}
              </>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(teams || []).map((team: any) => (
                  <div
                    key={team.id}
                    className="flex items-center gap-3 px-3 py-2.5 bg-surface-alt rounded-xl text-sm"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">
                        {team.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-sm">{team.name}</span>
                      <span className="text-text-muted text-xs ml-1.5">
                        {team.player1?.nickname || team.player1?.fullName?.split(" ")[0]}
                        {team.player2 && (
                          <>
                            {" & "}
                            {team.player2.nickname || team.player2.fullName?.split(" ")[0]}
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      ) : view === "calendar" ? (
        <MatchCalendar rounds={rounds} startDate={startDate} />
      ) : view === "print" ? (
        <div className="space-y-4">
          {/* Print button */}
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={handlePrint}>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir
              </span>
            </Button>
            <span className="text-xs text-text-muted">
              Imprime a folha de resultados para colocar nos campos
            </span>
          </div>

          {/* Printable tables - one page per court */}
          <Card>
            <div className="overflow-x-auto">
              <div ref={printRef}>
                {(() => {
                  // Build global match code map (sequential across all rounds)
                  const matchCodeMap = new Map<string, string>();
                  let matchSeq = 0;
                  for (const round of rounds) {
                    for (const match of round.matches) {
                      matchSeq++;
                      matchCodeMap.set(match.id, `M${String(matchSeq).padStart(2, "0")}`);
                    }
                  }

                  return allCourts.map((court, courtIdx) => {
                    // Filter matches for this court
                    const courtMatches: { match: any; roundIndex: number; matchCode: string }[] = [];
                    for (const round of rounds) {
                      for (const match of round.matches) {
                        const matchCourtId = match.court?.id || match.courtId || "";
                        if (matchCourtId === court.id) {
                          courtMatches.push({
                            match,
                            roundIndex: round.index,
                            matchCode: matchCodeMap.get(match.id) || "",
                          });
                        }
                      }
                    }

                    return (
                      <div key={court.id} className={courtIdx > 0 ? "page-break mt-8" : ""}>
                        <div className="print-header text-center py-3 border-b border-border">
                          <h1 className="text-lg font-bold">
                            {seasonName && tournamentName
                              ? `${seasonName} \u2014 ${tournamentName}`
                              : tournamentName || "Torneio"}
                          </h1>
                          {startDate && (
                            <p className="text-xs text-text-muted mt-0.5">
                              {new Date(startDate).toLocaleDateString("pt-PT", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              })}
                            </p>
                          )}
                          <div className="court-badge inline-block mt-1 px-3 py-0.5 bg-gray-800 text-white rounded text-sm font-bold">
                            {court.name}
                          </div>
                        </div>

                        <table className="w-full text-sm border-collapse mt-2">
                          <thead>
                            <tr className="bg-surface-alt border-b-2 border-border">
                              <th className="px-1 py-2 text-center text-xs font-bold uppercase tracking-wide border border-border w-12">
                                Cod
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide border border-border w-24">
                                Ronda
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide border border-border">
                                Equipa A
                              </th>
                              <th className="px-1 py-2 text-center text-xs font-bold uppercase tracking-wide border border-border w-10">
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide border border-border">
                                Equipa B
                              </th>
                              {setHeaders.map((h) => (
                                <th
                                  key={h}
                                  className="px-2 py-2 text-center text-xs font-bold uppercase tracking-wide border border-border w-28"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {courtMatches.map((cm, idx) => {
                              const score1 = getSetScore(cm.match, 1);
                              const score2 = getSetScore(cm.match, 2);
                              const score3 = getSetScore(cm.match, 3);
                              return (
                                <tr key={cm.match.id} className="border border-border hover:bg-surface-alt/50">
                                  <td className="px-1 py-3 text-center border border-border font-mono text-xs text-black font-bold match-code">
                                    {cm.matchCode}
                                  </td>
                                  <td className="px-3 py-3 font-bold text-center border border-border bg-surface-alt/30">
                                    R{cm.roundIndex}
                                  </td>
                                  <td className="px-3 py-3 border border-border font-medium">
                                    {getTeamName(cm.match.teamA)}
                                  </td>
                                  <td className="px-1 py-3 text-center border border-border text-text-muted font-bold text-xs">
                                    vs
                                  </td>
                                  <td className="px-3 py-3 border border-border font-medium">
                                    {getTeamName(cm.match.teamB)}
                                  </td>
                                  {setHeaders.map((_, setIdx) => {
                                    const score = [score1, score2, score3][setIdx];
                                    return (
                                      <td key={setIdx} className="px-2 py-4 text-center border border-border set-cell">
                                        {score || <span className="set-dash">—</span>}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        {tournamentId && (
                          <div className="print-footer flex justify-between text-[9px] text-text-muted mt-3 pt-2 border-t border-border">
                            <span>Torneio: {tournamentId.slice(0, 8)} | {court.name}</span>
                            <span>CopaPro</span>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </Card>
        </div>
      ) : (
        rounds.map((round, rIdx) => {
          const finished = round.matches.filter((m: any) => m.status === "FINISHED").length;
          const total = round.matches.length;
          return (
            <Card key={round.id} className={`animate-fade-in-up stagger-${Math.min(rIdx + 1, 8)}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-extrabold text-primary">R{round.index}</span>
                    </div>
                    <CardTitle>Ronda {round.index}</CardTitle>
                  </div>
                  <span className="text-xs font-semibold text-text-muted tabular-nums">
                    {finished}/{total} jogos
                  </span>
                </div>
              </CardHeader>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {round.matches.map((match: any) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    numberOfSets={numberOfSets}
                    canEdit={canManage}
                    currentPlayerId={currentPlayerId}
                    currentUserId={currentUserId}
                    pendingSubmission={
                      pendingSubmissionsMap?.[match.id] ?? null
                    }
                  />
                ))}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
