export const dynamic = "force-dynamic";

import { getTournament, getPendingSubmissions } from "@/lib/actions";
import { getGroupStandings } from "@/lib/actions/group-knockout-actions";
import { isLeagueManager, isAdmin } from "@/lib/auth-guards";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { TournamentDetailContent } from "./tournament-detail-content";

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  const [tournament, session] = await Promise.all([
    getTournament(tournamentId),
    auth(),
  ]);

  if (!tournament) notFound();

  const canManage = await isLeagueManager(tournament.leagueId);
  const adminUser = await isAdmin();

  const currentUserId = (session?.user as any)?.id ?? null;
  const currentPlayerId = (session?.user as any)?.playerId ?? null;

  const allMatches = tournament.rounds.flatMap((r) => r.matches);
  const scheduledMatchIds = allMatches
    .filter((m) => m.status === "SCHEDULED")
    .map((m) => m.id);

  const pendingSubmissionsMap: Record<string, any> = {};
  if (scheduledMatchIds.length > 0 && currentPlayerId) {
    const submissions = await Promise.all(
      scheduledMatchIds.map((id) => getPendingSubmissions(id).then((s) => [id, s] as const))
    );
    for (const [id, sub] of submissions) {
      if (sub) pendingSubmissionsMap[id] = sub;
    }
  }

  const totalMatches = tournament.rounds.reduce(
    (acc, r) => acc + r.matches.length,
    0
  );
  const finishedMatches = tournament.rounds.reduce(
    (acc, r) =>
      acc + r.matches.filter((m) => m.status === "FINISHED").length,
    0
  );

  // Fetch group standings if GROUP_KNOCKOUT format
  let groupStandings: any[] = [];
  if (tournament.format === "GROUP_KNOCKOUT") {
    try {
      groupStandings = await getGroupStandings(tournamentId);
    } catch {
      // ignore
    }
  }

  return (
    <TournamentDetailContent
      tournament={tournament as any}
      canManage={canManage}
      adminUser={adminUser}
      currentUserId={currentUserId}
      currentPlayerId={currentPlayerId}
      pendingSubmissionsMap={pendingSubmissionsMap}
      totalMatches={totalMatches}
      finishedMatches={finishedMatches}
      groupStandings={groupStandings}
    />
  );
}
