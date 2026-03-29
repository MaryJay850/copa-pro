export const dynamic = "force-dynamic";

import { getSeason } from "@/lib/actions";
import { sortRankings } from "@/lib/ranking";
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

  // Sort rankings by the season's ranking mode
  const sortedRankings = sortRankings(
    season.rankings.map((r: any) => ({
      playerId: r.player.id,
      pointsTotal: r.pointsTotal,
      matchesPlayed: r.matchesPlayed,
      wins: r.wins,
      draws: r.draws,
      losses: r.losses,
      setsWon: r.setsWon,
      setsLost: r.setsLost,
      setsDiff: r.setsDiff,
    })),
    season.rankingMode || "SUM"
  );

  // Build a lookup map for extra fields (player name, adjustment)
  const rankingLookup = new Map(season.rankings.map((r: any) => [r.player.id, r]));

  const rankingRows = sortedRankings.map((r: any, i: number) => {
    const original = rankingLookup.get(r.playerId) as any;
    return {
      position: i + 1,
      playerId: r.playerId,
      playerName: original?.player?.nickname || original?.player?.fullName || "?",
      pointsTotal: r.pointsTotal,
      matchesPlayed: r.matchesPlayed,
      wins: r.wins,
      draws: r.draws,
      losses: r.losses,
      setsWon: r.setsWon,
      setsLost: r.setsLost,
      setsDiff: r.setsDiff,
      manualAdjustment: original?.manualAdjustment || 0,
      adjustmentNote: original?.adjustmentNote || null,
    };
  });

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
