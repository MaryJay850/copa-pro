export const dynamic = "force-dynamic";

import { getLeague, getLeagueInvites } from "@/lib/actions";
import { getClubsForLeague, getClubsNotInLeague } from "@/lib/actions/club-actions";
import { isLeagueManager, isAdmin } from "@/lib/auth-guards";
import { notFound } from "next/navigation";
import { LeagueDetailContent } from "./league-detail-content";

export default async function LeaguePage({
  params,
  searchParams,
}: {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { leagueId } = await params;
  const { modo } = await searchParams;

  const league = await getLeague(leagueId);
  if (!league) notFound();

  const canManage = await isLeagueManager(leagueId);
  const adminUser = await isAdmin();
  const invites = canManage ? await getLeagueInvites(leagueId) : [];

  // Clubs associated with this league
  const leagueClubs = await getClubsForLeague(leagueId).catch(() => []);
  const availableClubs = canManage ? await getClubsNotInLeague(leagueId).catch(() => []) : [];

  const initialMode = modo === "editar" && canManage ? "edit" : "view";

  return (
    <LeagueDetailContent
      league={league as any}
      canManage={canManage}
      adminUser={adminUser}
      invites={invites}
      leagueClubs={leagueClubs}
      availableClubs={availableClubs}
      initialMode={initialMode}
    />
  );
}
