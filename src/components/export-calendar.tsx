"use client";

import { Button } from "@/components/ui/button";

interface CalendarMatch {
  team1Name: string;
  team2Name: string;
  courtName?: string;
  roundIndex: number;
}

interface ExportCalendarProps {
  tournamentName: string;
  startDate: string | null;
  matches: CalendarMatch[];
}

export function ExportCalendar({ tournamentName, startDate, matches }: ExportCalendarProps) {
  const handleExport = () => {
    const base = startDate ? new Date(startDate) : new Date();
    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//CopaPro//Padel League//PT",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${tournamentName}`,
    ];

    const groupedByRound = new Map<number, CalendarMatch[]>();
    for (const m of matches) {
      const arr = groupedByRound.get(m.roundIndex) || [];
      arr.push(m);
      groupedByRound.set(m.roundIndex, arr);
    }

    for (const [roundIdx, roundMatches] of groupedByRound) {
      const roundDate = new Date(base);
      roundDate.setDate(roundDate.getDate() + (roundIdx - 1) * 7);

      for (let i = 0; i < roundMatches.length; i++) {
        const m = roundMatches[i];
        const eventStart = new Date(roundDate);
        eventStart.setHours(19 + Math.floor(i / 2), (i % 2) * 30, 0);
        const eventEnd = new Date(eventStart);
        eventEnd.setMinutes(eventEnd.getMinutes() + 60);

        const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

        lines.push("BEGIN:VEVENT");
        lines.push(`DTSTART:${fmt(eventStart)}`);
        lines.push(`DTEND:${fmt(eventEnd)}`);
        lines.push(`SUMMARY:${m.team1Name} vs ${m.team2Name}`);
        lines.push(`DESCRIPTION:${tournamentName} - Ronda ${roundIdx}${m.courtName ? ` - ${m.courtName}` : ""}`);
        if (m.courtName) lines.push(`LOCATION:${m.courtName}`);
        lines.push(`UID:copapro-${roundIdx}-${i}-${Date.now()}@copapro.pt`);
        lines.push("END:VEVENT");
      }
    }

    lines.push("END:VCALENDAR");

    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tournamentName.replace(/\s+/g, "_")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (matches.length === 0) return null;

  return (
    <Button onClick={handleExport} size="sm" variant="ghost">
      <span className="flex items-center gap-1.5">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Exportar Calendário
      </span>
    </Button>
  );
}
