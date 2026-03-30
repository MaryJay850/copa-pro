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
    <div className="space-y-6 animate-fade-in-up">
      <div>
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

      <div className="mt-4">
        <Link href={`/ligas/${leagueId}/clubes/${clubId}/socios`} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Gerir Sócios
        </Link>
      </div>
    </div>
  );
}
