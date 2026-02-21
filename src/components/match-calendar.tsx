"use client";

type CalendarMatch = {
  id: string;
  slotIndex: number;
  status: string;
  resultType: string;
  court: { name: string } | null;
  teamA: { name: string };
  teamB: { name: string };
  set1A: number | null;
  set1B: number | null;
  set2A: number | null;
  set2B: number | null;
  set3A: number | null;
  set3B: number | null;
};

type CalendarRound = {
  id: string;
  index: number;
  matches: CalendarMatch[];
};

export function MatchCalendar({
  rounds,
  startDate,
}: {
  rounds: CalendarRound[];
  startDate: string | null;
}) {
  // Build a week-grid view -- each round = 1 row
  // If startDate is set, we show actual dates, otherwise just "Ronda X"
  const base = startDate ? new Date(startDate) : null;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Header */}
        <div className="grid grid-cols-[120px_1fr] gap-2 mb-2">
          <div className="text-xs font-semibold text-text-muted px-2">
            Ronda
          </div>
          <div className="text-xs font-semibold text-text-muted px-2">
            Jogos
          </div>
        </div>

        {/* Rounds */}
        <div className="space-y-2">
          {rounds.map((round, ri) => {
            const roundDate = base
              ? new Date(base.getTime() + ri * 7 * 24 * 60 * 60 * 1000)
              : null;
            const allFinished = round.matches.every(
              (m) => m.status === "FINISHED"
            );
            const someFinished = round.matches.some(
              (m) => m.status === "FINISHED"
            );

            return (
              <div
                key={round.id}
                className={`grid grid-cols-[120px_1fr] gap-2 rounded-lg border p-2 ${
                  allFinished
                    ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
                    : someFinished
                    ? "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20"
                    : "border-border bg-surface"
                }`}
              >
                {/* Round label */}
                <div className="flex flex-col justify-center">
                  <span className="text-sm font-semibold">
                    Ronda {round.index}
                  </span>
                  {roundDate && (
                    <span className="text-[11px] text-text-muted">
                      {roundDate.toLocaleDateString("pt-PT", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  )}
                  <span className="text-[10px] text-text-muted mt-0.5">
                    {
                      round.matches.filter((m) => m.status === "FINISHED")
                        .length
                    }
                    /{round.matches.length} jogos
                  </span>
                </div>

                {/* Matches grid */}
                <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                  {round.matches.map((m) => {
                    const isFinished = m.status === "FINISHED";
                    const scores = isFinished
                      ? [
                          m.set1A !== null
                            ? `${m.set1A}-${m.set1B}`
                            : null,
                          m.set2A !== null
                            ? `${m.set2A}-${m.set2B}`
                            : null,
                          m.set3A !== null
                            ? `${m.set3A}-${m.set3B}`
                            : null,
                        ].filter(Boolean)
                      : [];

                    return (
                      <div
                        key={m.id}
                        className={`px-2 py-1.5 rounded text-xs border ${
                          isFinished
                            ? "border-emerald-200 dark:border-emerald-800"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-medium truncate">
                            {m.teamA.name}
                          </span>
                          <span className="text-text-muted">vs</span>
                          <span className="font-medium truncate text-right">
                            {m.teamB.name}
                          </span>
                        </div>
                        {isFinished && scores.length > 0 && (
                          <div className="flex gap-1 mt-0.5 justify-center">
                            {scores.map((s, i) => (
                              <span
                                key={i}
                                className="font-mono text-[10px] bg-surface px-1 rounded"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                        {m.court && (
                          <p className="text-[10px] text-text-muted text-center mt-0.5">
                            {m.court.name}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
