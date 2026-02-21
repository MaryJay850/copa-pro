"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { setPlayerAvailability } from "@/lib/actions";

export function AvailabilityCalendar() {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [selected, setSelected] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = new Date(year, month).toLocaleDateString("pt-PT", { month: "long", year: "numeric" });

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
    setSelected(new Map());
    setSaved(false);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
    setSelected(new Map());
    setSaved(false);
  };

  const toggleDay = (day: number) => {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const current = selected.get(key);
    const next = new Map(selected);
    if (current === undefined) next.set(key, true);
    else if (current === true) next.set(key, false);
    else next.delete(key);
    setSelected(next);
    setSaved(false);
  };

  const handleSave = async () => {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      const dates = Array.from(selected.entries()).map(([date, available]) => ({
        date,
        available,
      }));
      await setPlayerAvailability(dates);
      setSaved(true);
    } catch {
      alert("Erro ao guardar disponibilidade.");
    }
    setLoading(false);
  };

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Disponibilidade</CardTitle>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-1 hover:bg-surface-alt rounded text-text-muted">&larr;</button>
            <span className="text-sm font-medium capitalize min-w-[140px] text-center">{monthName}</span>
            <button onClick={nextMonth} className="p-1 hover:bg-surface-alt rounded text-text-muted">&rarr;</button>
          </div>
        </div>
      </CardHeader>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {dayNames.map((d) => (
          <div key={d} className="py-1 font-medium text-text-muted">{d}</div>
        ))}
        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const state = selected.get(key);
          const today = new Date();
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const isPast = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

          return (
            <button
              key={day}
              onClick={() => !isPast && toggleDay(day)}
              disabled={isPast}
              className={`py-2 rounded text-sm transition-colors ${
                isPast
                  ? "text-text-muted/40 cursor-not-allowed"
                  : state === true
                  ? "bg-emerald-500 text-white font-bold"
                  : state === false
                  ? "bg-red-400 text-white font-bold"
                  : "hover:bg-surface-alt"
              } ${isToday ? "ring-2 ring-primary ring-offset-1" : ""}`}
            >
              {day}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-4 text-xs text-text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-emerald-500" /> Disponível
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-red-400" /> Indisponível
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-surface-alt border border-border" /> Sem indicação
        </span>
      </div>
      {selected.size > 0 && (
        <div className="mt-3">
          <Button onClick={handleSave} disabled={loading} size="sm">
            {loading ? "A guardar..." : saved ? "Guardado!" : "Guardar Disponibilidade"}
          </Button>
        </div>
      )}
    </Card>
  );
}
