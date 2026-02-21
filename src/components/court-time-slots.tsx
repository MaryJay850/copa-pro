"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getCourtTimeSlots, upsertCourtTimeSlots } from "@/lib/actions";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type TimeSlot = {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export function CourtTimeSlots({
  courtId,
  courtName,
  leagueId,
}: {
  courtId: string;
  courtName: string;
  leagueId: string;
}) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    getCourtTimeSlots(courtId)
      .then((data) => setSlots(data as TimeSlot[]))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [courtId]);

  const addSlot = () => {
    setSlots([...slots, { dayOfWeek: 1, startTime: "19:00", endTime: "21:00" }]);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: keyof TimeSlot, value: string | number) => {
    const updated = [...slots];
    (updated[index] as Record<string, unknown>)[field] = value;
    setSlots(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertCourtTimeSlots(
        courtId,
        leagueId,
        slots.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        }))
      );
      toast.success("Horários atualizados!");
    } catch (e: unknown) {
      toast.error((e as Error).message || "Erro ao guardar horários.");
    }
    setSaving(false);
  };

  if (loading) return null;

  return (
    <div className="border border-border rounded-lg p-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-sm font-medium">{courtName}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">
            {slots.length} horário{slots.length !== 1 ? "s" : ""}
          </span>
          <span className="text-text-muted">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {slots.map((slot, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={slot.dayOfWeek}
                onChange={(e) => updateSlot(i, "dayOfWeek", parseInt(e.target.value))}
                className="rounded border border-border bg-surface px-2 py-1 text-xs"
              >
                {DAYS.map((d, di) => (
                  <option key={di} value={di}>{d}</option>
                ))}
              </select>
              <input
                type="time"
                value={slot.startTime}
                onChange={(e) => updateSlot(i, "startTime", e.target.value)}
                className="rounded border border-border bg-surface px-2 py-1 text-xs"
              />
              <span className="text-xs text-text-muted">-</span>
              <input
                type="time"
                value={slot.endTime}
                onChange={(e) => updateSlot(i, "endTime", e.target.value)}
                className="rounded border border-border bg-surface px-2 py-1 text-xs"
              />
              <button
                onClick={() => removeSlot(i)}
                className="text-red-500 hover:text-red-700 text-xs px-1"
              >
                ✕
              </button>
            </div>
          ))}

          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="ghost" onClick={addSlot}>
              + Adicionar Horário
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "A guardar..." : "Guardar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
