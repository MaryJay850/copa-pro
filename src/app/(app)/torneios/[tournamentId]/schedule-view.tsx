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
}) {
  const [view, setView] = useState<"list" | "calendar" | "print">("list");
  const printRef = useRef<HTMLDivElement>(null);

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
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            color: #000;
            margin: 0;
            padding: 0;
          }
          .print-header {
            text-align: center;
            margin-bottom: 12px;
          }
          .print-header h1 {
            font-size: 16px;
            margin: 0 0 2px 0;
          }
          .print-header p {
            font-size: 11px;
            margin: 0;
            color: #444;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid #333;
            padding: 5px 8px;
            text-align: left;
          }
          th {
            background-color: #e8e8e8;
            font-weight: bold;
            font-size: 10px;
            text-transform: uppercase;
          }
          .round-cell {
            font-weight: bold;
            vertical-align: middle;
            text-align: center;
            background-color: #f5f5f5;
          }
          .round-date {
            font-size: 9px;
            font-weight: normal;
            color: #666;
          }
          .vs-cell {
            text-align: center;
            font-weight: bold;
            color: #666;
            width: 30px;
          }
          .set-cell {
            width: 55px;
            text-align: center;
            min-height: 20px;
          }
          .team-cell {
            font-weight: 500;
          }
          .tracking-widest {
            letter-spacing: 0.1em;
            color: #999;
          }
        </style>
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
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={view === "list" ? "primary" : "ghost"}
          onClick={() => setView("list")}
        >
          Lista
        </Button>
        <Button
          size="sm"
          variant={view === "calendar" ? "primary" : "ghost"}
          onClick={() => setView("calendar")}
        >
          Calendario
        </Button>
        <Button
          size="sm"
          variant={view === "print" ? "primary" : "ghost"}
          onClick={() => setView("print")}
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Folha de Resultados
          </span>
        </Button>
      </div>

      {view === "calendar" ? (
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

          {/* Printable table preview */}
          <Card>
            <div className="overflow-x-auto">
              <div ref={printRef}>
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
                </div>

                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-surface-alt border-b-2 border-border">
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide border border-border w-24">
                        Ronda
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide border border-border w-24">
                        Campo
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
                          className="px-2 py-2 text-center text-xs font-bold uppercase tracking-wide border border-border w-16"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rounds.map((round) => {
                      const matchCount = round.matches.length;
                      return round.matches.map((match: any, idx: number) => (
                        <tr
                          key={match.id}
                          className={`border border-border ${
                            idx === matchCount - 1 ? "border-b-2 border-b-border" : ""
                          } hover:bg-surface-alt/50 transition-colors`}
                        >
                          {/* Round cell - spans all matches in round */}
                          {idx === 0 && (
                            <td
                              rowSpan={matchCount}
                              className="px-3 py-2 font-bold text-center align-middle border border-border bg-surface-alt/30"
                            >
                              Ronda {round.index}
                            </td>
                          )}
                          {/* Court */}
                          <td className="px-3 py-2 border border-border text-text-muted">
                            {match.court?.name || `Campo ${idx + 1}`}
                          </td>
                          {/* Team A */}
                          <td className="px-3 py-2 border border-border font-medium">
                            {getTeamName(match.teamA)}
                          </td>
                          {/* VS */}
                          <td className="px-1 py-2 text-center border border-border text-text-muted font-bold text-xs">
                            vs
                          </td>
                          {/* Team B */}
                          <td className="px-3 py-2 border border-border font-medium">
                            {getTeamName(match.teamB)}
                          </td>
                          {/* Set score columns */}
                          {setHeaders.map((_, setIdx) => {
                            const score = getSetScore(match, setIdx + 1);
                            return (
                            <td
                              key={setIdx}
                              className="px-2 py-2 text-center border border-border text-text-muted"
                            >
                              {score || <span className="tracking-widest">___ - ___</span>}
                            </td>
                          );
                          })}
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        rounds.map((round) => (
          <Card key={round.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Ronda {round.index}</CardTitle>
                <span className="text-xs text-text-muted">
                  {
                    round.matches.filter((m: any) => m.status === "FINISHED")
                      .length
                  }
                  /{round.matches.length} jogos
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
        ))
      )}
    </div>
  );
}
