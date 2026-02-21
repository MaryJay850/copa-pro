"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getLeagueAvailability } from "@/lib/actions";

type MemberAvailability = {
  playerId: string;
  playerName: string;
  available: boolean | null;
  note: string | null;
};

export function LeagueAvailabilityView({ leagueId }: { leagueId: string }) {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dayData, setDayData] = useState<MemberAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [dayCache, setDayCache] = useState<Map<string, MemberAvailability[]>>(new Map());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = new Date(year, month).toLocaleDateString("pt-PT", { month: "long", year: "numeric" });

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
    setSelectedDay(null);
    setDayData([]);
    setDayCache(new Map());
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
    setSelectedDay(null);
    setDayData([]);
    setDayCache(new Map());
  };

  const handleDayClick = async (day: number) => {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    if (selectedDay === day) {
      setSelectedDay(null);
      setDayData([]);
      return;
    }

    setSelectedDay(day);

    // Check cache
    const cached = dayCache.get(key);
    if (cached) {
      setDayData(cached);
      return;
    }

    setLoading(true);
    try {
      const data = await getLeagueAvailability(leagueId, key);
      setDayData(data as MemberAvailability[]);
      setDayCache((prev) => new Map(prev).set(key, data as MemberAvailability[]));
    } catch {
      setDayData([]);
    }
    setLoading(false);
  };

  // Compute availability summary per day from cache
  const getDaySummary = (day: number) => {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const cached = dayCache.get(key);
    if (!cached) return null;
    const available = cached.filter((m) => m.available === true).length;
    const total = cached.length;
    return { available, total };
  };

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

  const today = new Date();
  const isPast = (day: number) =>
    new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const availableCount = dayData.filter((m) => m.available === true).length;
  const unavailableCount = dayData.filter((m) => m.available === false).length;
  const noDataCount = dayData.filter((m) => m.available === null).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Disponibilidade da Liga</CardTitle>
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
          const isSelected = selectedDay === day;
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const past = isPast(day);
          const summary = getDaySummary(day);

          // Color based on cached data
          let bgClass = "hover:bg-surface-alt";
          if (summary) {
            const ratio = summary.total > 0 ? summary.available / summary.total : 0;
            if (ratio >= 0.6) bgClass = "bg-emerald-100 hover:bg-emerald-200 text-emerald-800";
            else if (ratio >= 0.3) bgClass = "bg-amber-100 hover:bg-amber-200 text-amber-800";
            else if (summary.available > 0) bgClass = "bg-amber-50 hover:bg-amber-100 text-amber-700";
            else bgClass = "bg-gray-100 hover:bg-gray-200 text-text-muted";
          }

          return (
            <button
              key={day}
              onClick={() => !past && handleDayClick(day)}
              disabled={past}
              className={`py-2 rounded text-sm transition-colors relative ${
                past ? "text-text-muted/40 cursor-not-allowed" : bgClass
              } ${isSelected ? "ring-2 ring-primary ring-offset-1" : ""} ${
                isToday && !isSelected ? "ring-2 ring-primary/40 ring-offset-1" : ""
              }`}
            >
              {day}
              {summary && summary.available > 0 && !past && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-emerald-600">
                  {summary.available}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-emerald-100 border border-emerald-300" /> Muitos
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-amber-100 border border-amber-300" /> Poucos
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-gray-100 border border-border" /> Sem dados
        </span>
        <span className="text-text-muted">Clica num dia para ver detalhes</span>
      </div>

      {/* Day detail panel */}
      {selectedDay !== null && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">
              {selectedDay} de {new Date(year, month).toLocaleDateString("pt-PT", { month: "long" })}
            </h4>
            <button
              onClick={() => { setSelectedDay(null); setDayData([]); }}
              className="text-xs text-text-muted hover:text-text"
            >
              Fechar
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-text-muted">A carregar...</p>
          ) : dayData.length === 0 ? (
            <p className="text-sm text-text-muted">Sem dados de disponibilidade para este dia.</p>
          ) : (
            <>
              <div className="flex gap-3 mb-3 text-xs">
                <span className="text-emerald-600 font-medium">{availableCount} disponiveis</span>
                <span className="text-red-500 font-medium">{unavailableCount} indisponiveis</span>
                <span className="text-text-muted">{noDataCount} sem indicacao</span>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {dayData
                  .sort((a, b) => {
                    if (a.available === true && b.available !== true) return -1;
                    if (a.available !== true && b.available === true) return 1;
                    if (a.available === false && b.available === null) return -1;
                    if (a.available === null && b.available === false) return 1;
                    return a.playerName.localeCompare(b.playerName);
                  })
                  .map((m) => (
                    <div
                      key={m.playerId}
                      className={`flex items-center justify-between px-2 py-1.5 rounded text-sm ${
                        m.available === true
                          ? "bg-emerald-50"
                          : m.available === false
                          ? "bg-red-50"
                          : "bg-gray-50"
                      }`}
                    >
                      <span className="font-medium">{m.playerName}</span>
                      <div className="flex items-center gap-2">
                        {m.note && (
                          <span className="text-xs text-text-muted italic max-w-[120px] truncate" title={m.note}>
                            {m.note}
                          </span>
                        )}
                        <span
                          className={`text-xs font-bold ${
                            m.available === true
                              ? "text-emerald-600"
                              : m.available === false
                              ? "text-red-500"
                              : "text-text-muted"
                          }`}
                        >
                          {m.available === true ? "Disponivel" : m.available === false ? "Indisponivel" : "\u2014"}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
