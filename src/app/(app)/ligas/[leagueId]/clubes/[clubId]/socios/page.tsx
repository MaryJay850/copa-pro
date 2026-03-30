import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { MembershipManager } from "./membership-manager";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SociosPage({ params }: { params: Promise<{ leagueId: string; clubId: string }> }) {
  const { leagueId, clubId } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: {
      leagueClubs: { include: { league: true } },
      clubMemberships: {
        include: { player: true },
        orderBy: { startDate: "desc" }
      }
    }
  });
  if (!club) notFound();

  const league = club.leagueClubs.find(lc => lc.leagueId === leagueId)?.league;
  if (!league) notFound();

  const isManager = await prisma.leagueManager.findFirst({
    where: { leagueId, userId: session.user.id }
  }) !== null || (session.user as any).role === "ADMINISTRADOR";

  // Get league players for adding new members
  const leaguePlayers = await prisma.leagueMembership.findMany({
    where: { leagueId, status: "APPROVED" },
    include: { user: { include: { player: true } } }
  });
  const players = leaguePlayers
    .filter(m => m.user.player)
    .map(m => ({ id: m.user.player!.id, name: m.user.player!.fullName, nickname: m.user.player!.nickname }));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-text-muted mb-1">
          <Link href="/ligas" className="hover:text-text">Ligas</Link>
          <span>/</span>
          <Link href={`/ligas/${leagueId}`} className="hover:text-text">{league.name}</Link>
          <span>/</span>
          <Link href={`/ligas/${leagueId}/clubes`} className="hover:text-text">Clubes</Link>
          <span>/</span>
          <Link href={`/ligas/${leagueId}/clubes/${clubId}`} className="hover:text-text">{club.name}</Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-bold">Socios — {club.name}</h1>
        <p className="text-sm text-text-muted mt-1">Gerir socios e quotas do clube</p>
      </div>
      <MembershipManager
        clubId={clubId}
        leagueId={leagueId}
        memberships={JSON.parse(JSON.stringify(club.clubMemberships))}
        players={players}
        canManage={isManager}
      />
    </div>
  );
}
