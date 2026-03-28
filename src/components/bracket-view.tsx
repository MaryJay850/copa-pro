"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type BracketMatch = {
  id: string;
  bracketPhase: string;
  bracketIndex: number;
  status: string;
  teamA: { id: string; name: string } | null;
  teamB: { id: string; name: string } | null;
  winnerTeamId: string | null;
  set1A: number | null; set1B: number | null;
  set2A: number | null; set2B: number | null;
  set3A: number | null; set3B: number | null;
  court?: { name: string } | null;
};

const phaseLabels: Record<string, string> = {
  QF: "Quartos de Final",
  SF: "Semi-Finais",
  FINAL: "Final",
  THIRD_PLACE: "3o/4o Lugar",
};

const phaseOrder = ["QF", "SF", "FINAL", "THIRD_PLACE"];

function MatchBox({ match }: { match: BracketMatch }) {
  const isFinished = match.status === "FINISHED";
  const isPending = match.status === "PENDING_TEAMS";
  const teamAName = match.teamA?.name || "A definir";
  const teamBName = match.teamB?.name || "A definir";
  const isWinnerA = match.winnerTeamId === match.teamA?.id;
  const isWinnerB = match.winnerTeamId === match.teamB?.id;

  const getScore = () => {
    if (!isFinished) return null;
    const sets: string[] = [];
    for (let s = 1; s <= 3; s++) {
      const a = (match as any)[`set${s}A`];
      const b = (match as any)[`set${s}B`];
      if (a !== null && b !== null) sets.push(`${a}-${b}`);
    }
    return sets.join(" / ");
  };

  return (
    <div className={`rounded-xl border p-3 min-w-[200px] ${
      isFinished ? "border-border bg-surface" : isPending ? "border-dashed border-border/50 bg-surface-alt/30" : "border-border bg-white"
    }`}>
      <div className="space-y-1.5">
        <div className={`flex items-center gap-2 text-sm ${isWinnerA ? "font-bold text-green-700" : isPending ? "text-text-muted" : ""}`}>
          {isWinnerA && <span className="text-green-500 text-xs">&#9654;</span>}
          <span className="flex-1 truncate">{teamAName}</span>
        </div>
        <div className={`flex items-center gap-2 text-sm ${isWinnerB ? "font-bold text-green-700" : isPending ? "text-text-muted" : ""}`}>
          {isWinnerB && <span className="text-green-500 text-xs">&#9654;</span>}
          <span className="flex-1 truncate">{teamBName}</span>
        </div>
      </div>
      {isFinished && (
        <div className="text-xs text-text-muted mt-1.5 pt-1.5 border-t border-border/50 tabular-nums">
          {getScore()}
        </div>
      )}
      {match.court && (
        <div className="text-[10px] text-text-muted mt-1">{match.court.name}</div>
      )}
    </div>
  );
}

export function BracketView({ matches }: { matches: BracketMatch[] }) {
  // Group matches by phase
  const phases = phaseOrder.filter((phase) =>
    matches.some((m) => m.bracketPhase === phase)
  );

  if (phases.length === 0) {
    return (
      <div className="text-sm text-text-muted text-center py-8">
        O bracket sera gerado apos a fase de grupos terminar.
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          Eliminatorias
        </CardTitle>
      </CardHeader>
      <div className="flex gap-8 overflow-x-auto pb-4 px-4">
        {phases.map((phase) => {
          const phaseMatches = matches
            .filter((m) => m.bracketPhase === phase)
            .sort((a, b) => (a.bracketIndex || 0) - (b.bracketIndex || 0));

          return (
            <div key={phase} className="flex-shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant={phase === "FINAL" ? "success" : phase === "THIRD_PLACE" ? "warning" : "default"}>
                  {phaseLabels[phase] || phase}
                </Badge>
              </div>
              <div className="space-y-3 flex flex-col justify-center">
                {phaseMatches.map((match) => (
                  <MatchBox key={match.id} match={match} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
