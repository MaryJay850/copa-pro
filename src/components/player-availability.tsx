"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AvailabilityEntry {
  playerId: string;
  playerName: string;
  status: string;
  note: string | null;
}

export function PlayerAvailabilityView({
  entries,
  myStatus,
  canRespond,
  isManager,
  onSetStatus,
}: {
  entries: AvailabilityEntry[];
  myStatus: string | null;
  canRespond: boolean;
  isManager: boolean;
  onSetStatus: (status: string, note?: string) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");

  const available = entries.filter(e => e.status === "AVAILABLE");
  const maybe = entries.filter(e => e.status === "MAYBE");
  const unavailable = entries.filter(e => e.status === "UNAVAILABLE");

  const handleStatus = async (status: string) => {
    setLoading(true);
    try { await onSetStatus(status, note || undefined); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      {/* My response */}
      {canRespond && (
        <Card className="py-4 px-5">
          <h4 className="text-xs font-bold text-text-muted uppercase mb-3">A tua disponibilidade</h4>
          <div className="flex gap-2 mb-2">
            <Button
              size="sm"
              onClick={() => handleStatus("AVAILABLE")}
              disabled={loading}
              className={myStatus === "AVAILABLE" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
              variant={myStatus === "AVAILABLE" ? "default" : "ghost"}
            >
              ✓ Disponível
            </Button>
            <Button
              size="sm"
              onClick={() => handleStatus("MAYBE")}
              disabled={loading}
              className={myStatus === "MAYBE" ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
              variant={myStatus === "MAYBE" ? "default" : "ghost"}
            >
              ? Talvez
            </Button>
            <Button
              size="sm"
              onClick={() => handleStatus("UNAVAILABLE")}
              disabled={loading}
              className={myStatus === "UNAVAILABLE" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
              variant={myStatus === "UNAVAILABLE" ? "default" : "ghost"}
            >
              ✗ Indisponível
            </Button>
          </div>
          <input
            type="text"
            placeholder="Nota (opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full text-sm rounded-md border border-border bg-surface px-3 py-1.5 placeholder:text-text-muted"
          />
        </Card>
      )}

      {/* Summary counts */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="py-3 px-4 text-center border-emerald-200 bg-emerald-50">
          <div className="text-2xl font-bold text-emerald-700">{available.length}</div>
          <div className="text-[10px] font-bold text-emerald-600 uppercase">Disponível</div>
        </Card>
        <Card className="py-3 px-4 text-center border-amber-200 bg-amber-50">
          <div className="text-2xl font-bold text-amber-700">{maybe.length}</div>
          <div className="text-[10px] font-bold text-amber-600 uppercase">Talvez</div>
        </Card>
        <Card className="py-3 px-4 text-center border-red-200 bg-red-50">
          <div className="text-2xl font-bold text-red-700">{unavailable.length}</div>
          <div className="text-[10px] font-bold text-red-600 uppercase">Indisponível</div>
        </Card>
      </div>

      {/* Player lists */}
      {isManager && entries.length > 0 && (
        <Card className="py-4 px-5">
          {available.length > 0 && (
            <div className="mb-3">
              <h5 className="text-xs font-bold text-emerald-700 uppercase mb-1">Disponíveis</h5>
              {available.map(e => (
                <div key={e.playerId} className="flex justify-between text-sm py-0.5">
                  <span className="font-medium">{e.playerName}</span>
                  {e.note && <span className="text-xs text-text-muted">{e.note}</span>}
                </div>
              ))}
            </div>
          )}
          {maybe.length > 0 && (
            <div className="mb-3">
              <h5 className="text-xs font-bold text-amber-700 uppercase mb-1">Talvez</h5>
              {maybe.map(e => (
                <div key={e.playerId} className="flex justify-between text-sm py-0.5">
                  <span className="font-medium">{e.playerName}</span>
                  {e.note && <span className="text-xs text-text-muted">{e.note}</span>}
                </div>
              ))}
            </div>
          )}
          {unavailable.length > 0 && (
            <div>
              <h5 className="text-xs font-bold text-red-700 uppercase mb-1">Indisponíveis</h5>
              {unavailable.map(e => (
                <div key={e.playerId} className="flex justify-between text-sm py-0.5">
                  <span className="font-medium">{e.playerName}</span>
                  {e.note && <span className="text-xs text-text-muted">{e.note}</span>}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {entries.length === 0 && (
        <Card className="py-5 px-5 text-center">
          <p className="text-sm text-text-muted">Ninguém respondeu ainda.</p>
        </Card>
      )}
    </div>
  );
}
