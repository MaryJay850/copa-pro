export const dynamic = "force-dynamic";

import { getLeague } from "@/lib/actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateSeasonForm } from "./create-season-form";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function LeaguePage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params;
  const league = await getLeague(leagueId);

  if (!league) notFound();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-text-muted mb-1">
          <Link href="/ligas" className="hover:text-text">Ligas</Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-bold">{league.name}</h1>
        {league.location && <p className="text-sm text-text-muted mt-1">{league.location}</p>}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Épocas</h2>
        <CreateSeasonForm leagueId={league.id} />
      </div>

      {league.seasons.length === 0 ? (
        <EmptyState
          title="Sem épocas"
          description="Crie uma época para começar a organizar torneios."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {league.seasons.map((season) => (
            <Link key={season.id} href={`/ligas/${league.id}/epocas/${season.id}`}>
              <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{season.name}</h3>
                  <Badge variant={season.isActive ? "success" : "default"}>
                    {season.isActive ? "Ativa" : "Encerrada"}
                  </Badge>
                </div>
                {season.allowDraws && (
                  <p className="text-xs text-amber-600 mt-1">Empates permitidos</p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
