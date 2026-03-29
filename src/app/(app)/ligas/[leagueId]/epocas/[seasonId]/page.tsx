export const dynamic = "force-dynamic";

import { getSeason } from "@/lib/actions";
import { isLeagueManager, isAdmin } from "@/lib/auth-guards";
import { getUserPlanLimits } from "@/lib/plan-guards";
import { notFound } from "next/navigation";
import { SeasonDetailContent } from "./season-detail-content";

export default async function SeasonPage({ params }: { params: Promise<{ leagueId: string; seasonId: string }> }) {
  const { leagueId, seasonId } = await params;
  const season = await getSeason(seasonId);

  if (!season) notFound();

  const canManage = await isLeagueManager(leagueId);
  const adminUser = await isAdmin();

  let canCreateTournament = true;
  let tournamentLimitMessage = "";
  if (canManage) {
    try {
      const { limits } = await getUserPlanLimits();
      if (limits.maxTournamentsPerSeason !== null && season.tournaments.length >= limits.maxTournamentsPerSeason) {
        canCreateTournament = false;
        tournamentLimitMessage = `Limite de ${limits.maxTournamentsPerSeason} torneios por época atingido.`;
      }
    } catch {
      // If plan check fails, allow creation
    }
  }

  const rankingRows = season.rankings.map((r: any, i: number) => ({
    position: i + 1,
    playerId: r.player.id,
    playerName: r.player.nickname || r.player.fullName,
    pointsTotal: r.pointsTotal,
    matchesPlayed: r.matchesPlayed,
    wins: r.wins,
    draws: r.draws,
    losses: r.losses,
    setsWon: r.setsWon,
    setsLost: r.setsLost,
    setsDiff: r.setsDiff,
  }));

  return (
    <SeasonDetailContent
      season={season as any}
      leagueId={leagueId}
      seasonId={seasonId}
      canManage={canManage}
      adminUser={adminUser}
      canCreateTournament={canCreateTournament}
      tournamentLimitMessage={tournamentLimitMessage}
      rankingRows={rankingRows}
    />
  );
}
