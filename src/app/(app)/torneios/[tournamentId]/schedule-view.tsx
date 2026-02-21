"use client";

import { useState } from "react";
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
}: {
  rounds: ScheduleRound[];
  numberOfSets: number;
  canManage: boolean;
  startDate: string | null;
  currentPlayerId?: string;
  currentUserId?: string;
  pendingSubmissionsMap?: Record<string, any>;
}) {
  const [view, setView] = useState<"list" | "calendar">("list");

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
      </div>

      {view === "calendar" ? (
        <MatchCalendar rounds={rounds} startDate={startDate} />
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
