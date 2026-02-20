export const dynamic = "force-dynamic";

import { getDashboardFilters, getDashboardData } from "@/lib/actions";
import { DashboardContent } from "./dashboard-content";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ liga?: string; epoca?: string; torneio?: string }>;
}) {
  const params = await searchParams;

  const [filters, data] = await Promise.all([
    getDashboardFilters(),
    getDashboardData({
      leagueId: params.liga,
      seasonId: params.epoca,
      tournamentId: params.torneio,
    }),
  ]);

  return (
    <DashboardContent
      filters={filters}
      data={data}
      selectedLeagueId={params.liga}
      selectedSeasonId={params.epoca}
      selectedTournamentId={params.torneio}
    />
  );
}
