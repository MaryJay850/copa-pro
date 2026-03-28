export const dynamic = "force-dynamic";

import { getClubWithCourts } from "@/lib/actions/club-actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ClubCourtManager } from "./club-court-manager";

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ leagueId: string; clubId: string }>;
}) {
  const { leagueId, clubId } = await params;

  let club: any;
  try {
    club = await getClubWithCourts(clubId);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-text-muted mb-1">
          <Link href="/ligas" className="hover:text-text">Ligas</Link>
          <span>/</span>
          <Link href={`/ligas/${leagueId}`} className="hover:text-text">{club.league.name}</Link>
          <span>/</span>
          <Link href={`/ligas/${leagueId}/clubes`} className="hover:text-text">Clubes</Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-bold">{club.name}</h1>
        <p className="text-sm text-text-muted mt-1">
          Gerir os campos deste clube. A qualidade afeta a distribuicao nos torneios.
        </p>
      </div>

      <ClubCourtManager
        clubId={clubId}
        leagueId={leagueId}
        initialCourts={club.courts}
      />
    </div>
  );
}
