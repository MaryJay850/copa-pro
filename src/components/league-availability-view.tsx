"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";

// Deprecated: availability is now per-tournament (C3). This component is kept as a stub
// to avoid breaking any remaining imports.
export function LeagueAvailabilityView({ leagueId }: { leagueId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Disponibilidade</CardTitle>
      </CardHeader>
      <p className="text-sm text-text-muted px-5 pb-4">
        A disponibilidade agora funciona por torneio. Consulte a secao de disponibilidade dentro de cada torneio.
      </p>
    </Card>
  );
}
