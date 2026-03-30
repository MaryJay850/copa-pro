"use client";

import { useState } from "react";

interface DragMatch {
  id: string;
  slotIndex: number;
  courtId: string | null;
  courtName: string;
  teamAName: string;
  teamBName: string;
  status: string;
  score?: string;
}

interface DragCourt {
  id: string;
  name: string;
  matches: DragMatch[];
}

export function DraggableSchedule({
  courts,
  roundId,
  canManage,
  onReorder,
}: {
  courts: DragCourt[];
  roundId: string;
  canManage: boolean;
  onReorder: (updates: { matchId: string; courtId: string | null; slotIndex: number }[]) => Promise<void>;
}) {
  const [draggedMatch, setDraggedMatch] = useState<DragMatch | null>(null);
  const [dragOverCourt, setDragOverCourt] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [localCourts, setLocalCourts] = useState(courts);

  const handleDragStart = (match: DragMatch) => (e: React.DragEvent) => {
    if (!canManage || match.status === "FINISHED") return;
    setDraggedMatch(match);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", match.id);
  };

  const handleDragOver = (courtId: string, index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCourt(courtId);
    setDragOverIndex(index);
  };

  const handleDrop = async (targetCourtId: string, targetIndex: number) => {
    if (!draggedMatch) return;

    // Build new court state
    const newCourts = localCourts.map((c) => ({ ...c, matches: [...c.matches] }));

    // Remove from source
    const sourceCourt = newCourts.find((c) =>
      c.matches.some((m) => m.id === draggedMatch.id)
    );
    if (sourceCourt) {
      sourceCourt.matches = sourceCourt.matches.filter(
        (m) => m.id !== draggedMatch.id
      );
    }

    // Add to target
    const targetCourt = newCourts.find((c) => c.id === targetCourtId);
    if (targetCourt) {
      const updatedMatch = {
        ...draggedMatch,
        courtId: targetCourtId,
        courtName: targetCourt.name,
      };
      targetCourt.matches.splice(targetIndex, 0, updatedMatch);
    }

    // Update slot indices
    const updates: {
      matchId: string;
      courtId: string | null;
      slotIndex: number;
    }[] = [];
    for (const court of newCourts) {
      court.matches.forEach((m, idx) => {
        updates.push({ matchId: m.id, courtId: court.id, slotIndex: idx });
      });
    }

    setLocalCourts(newCourts);
    setDraggedMatch(null);
    setDragOverCourt(null);
    setDragOverIndex(null);

    setSaving(true);
    try {
      await onReorder(updates);
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = () => {
    setDraggedMatch(null);
    setDragOverCourt(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-4">
      {saving && (
        <div className="text-xs text-emerald-600 font-medium animate-pulse">
          A guardar alterações...
        </div>
      )}
      {localCourts.map((court) => (
        <div key={court.id} className="space-y-1">
          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">
            {court.name}
          </h4>
          <div
            className={`min-h-[60px] rounded-lg transition-colors ${
              dragOverCourt === court.id
                ? "bg-emerald-50 border-2 border-dashed border-emerald-300"
                : ""
            }`}
            onDragOver={(e) =>
              handleDragOver(court.id, court.matches.length)(e)
            }
            onDrop={() => handleDrop(court.id, court.matches.length)}
            onDragLeave={() => {
              setDragOverCourt(null);
              setDragOverIndex(null);
            }}
          >
            {court.matches.map((match, idx) => (
              <div
                key={match.id}
                draggable={canManage && match.status !== "FINISHED"}
                onDragStart={handleDragStart(match)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(court.id, idx)(e)}
                onDrop={(e) => {
                  e.stopPropagation();
                  handleDrop(court.id, idx);
                }}
                className={`flex items-center justify-between rounded-lg border p-3 mb-1 transition-all ${
                  draggedMatch?.id === match.id ? "opacity-30" : ""
                } ${
                  dragOverCourt === court.id && dragOverIndex === idx
                    ? "border-emerald-400 border-t-2"
                    : "border-border"
                } ${
                  canManage && match.status !== "FINISHED"
                    ? "cursor-grab active:cursor-grabbing"
                    : ""
                } bg-surface`}
              >
                {canManage && match.status !== "FINISHED" && (
                  <div className="mr-2 text-text-muted">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 8h16M4 16h16"
                      />
                    </svg>
                  </div>
                )}
                <div className="flex-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{match.teamAName}</span>
                  <span className="text-xs text-text-muted mx-2">
                    {match.score || "vs"}
                  </span>
                  <span className="font-medium text-right">
                    {match.teamBName}
                  </span>
                </div>
                {match.status === "FINISHED" && (
                  <span className="ml-2 text-[10px] text-emerald-600 font-bold">
                    &#10003;
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
