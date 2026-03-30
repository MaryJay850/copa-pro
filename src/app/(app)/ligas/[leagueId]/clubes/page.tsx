export const dynamic = "force-dynamic";

import { getClubsForLeague } from "@/lib/actions/club-actions";
import { getLeague } from "@/lib/actions";
import { requireLeagueManager } from "@/lib/auth-guards";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CreateClubForm } from "./create-club-form";

export default async function ClubsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  await requireLeagueManager(leagueId);

  const league = await getLeague(leagueId);
  if (!league) notFound();

  const clubs = await getClubsForLeague(leagueId);

  const qualityColors: Record<string, string> = {
    GOOD: "success",
    MEDIUM: "warning",
    BAD: "danger",
  };

  const qualityLabels: Record<string, string> = {
    GOOD: "Bom",
    MEDIUM: "Medio",
    BAD: "Mau",
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold">Clubes</h1>
        <p className="text-sm text-text-muted mt-1">
          Gerir clubes de padel e os seus campos. Os campos dos clubes ficam disponiveis ao criar torneios.
        </p>
      </div>

      <CreateClubForm leagueId={leagueId} />

      {clubs.length === 0 ? (
        <EmptyState
          title="Sem clubes"
          description="Crie um clube para configurar os campos disponiveis para torneios."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club: any, i: number) => (
            <Link key={club.id} href={`/ligas/${leagueId}/clubes/${club.id}`}>
              <Card className={`card-hover cursor-pointer h-full animate-fade-in-up stagger-${i + 1}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold tracking-tight">{club.name}</h3>
                    <p className="text-xs text-text-muted">
                      {club.courts.length} {club.courts.length === 1 ? "campo" : "campos"}
                      {club._count.tournaments > 0 && (
                        <> &middot; {club._count.tournaments} {club._count.tournaments === 1 ? "torneio" : "torneios"}</>
                      )}
                    </p>
                  </div>
                </div>
                {club.courts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {club.courts.map((court: any) => (
                      <Badge
                        key={court.id}
                        variant={qualityColors[court.quality] as any || "default"}
                      >
                        {court.name}
                        {!court.isAvailable && " (Indisponivel)"}
                      </Badge>
                    ))}
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
