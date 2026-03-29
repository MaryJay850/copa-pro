"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export interface SobeDesceCourtInfo {
  courtName: string;
  courtIndex: number;
  players: { id: string; name: string }[];
  isTopCourt: boolean;
  isBottomCourt: boolean;
}

export function SobeDesceCourtMap({ courts }: { courts: SobeDesceCourtInfo[] }) {
  if (courts.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          Mapa de Campos — Sobe e Desce
        </CardTitle>
      </CardHeader>
      <div className="px-4 pb-4 space-y-2">
        {courts.sort((a, b) => a.courtIndex - b.courtIndex).map((court, idx) => (
          <div
            key={court.courtIndex}
            className={`rounded-lg border p-3 ${
              idx === 0
                ? "border-amber-300 bg-amber-50"
                : idx === courts.length - 1
                ? "border-red-300 bg-red-50"
                : "border-border bg-surface-alt/50"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold uppercase text-text-muted">
                {court.courtName}
                {idx === 0 && " \u2B50"}
              </span>
              <span className="text-[10px] font-bold text-text-muted">
                {idx === 0 ? "C\u00C9U" : idx === courts.length - 1 ? "INFERNO" : `N\u00EDvel ${idx + 1}`}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {court.players.map((p) => (
                <span
                  key={p.id}
                  className="text-xs bg-surface rounded-md px-2 py-1 font-medium border border-border"
                >
                  {p.name}
                </span>
              ))}
            </div>
            {idx < courts.length - 1 && (
              <div className="flex justify-center mt-2 text-text-muted">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l5 5 5-5M7 8l5-5 5 5" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
