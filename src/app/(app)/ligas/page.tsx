export const dynamic = "force-dynamic";

import { getLeagues } from "@/lib/actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateLeagueForm } from "./create-league-form";
import Link from "next/link";

export default async function LigasPage() {
  const leagues = await getLeagues();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ligas</h1>
          <p className="text-sm text-text-muted mt-1">Gerir as suas ligas de padel</p>
        </div>
      </div>

      <CreateLeagueForm />

      {leagues.length === 0 ? (
        <EmptyState
          title="Sem ligas"
          description="Crie a sua primeira liga para começar a organizar torneios."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {leagues.map((league) => (
            <Link key={league.id} href={`/ligas/${league.id}`}>
              <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                <h3 className="font-semibold text-base">{league.name}</h3>
                {league.location && (
                  <p className="text-sm text-text-muted mt-1">{league.location}</p>
                )}
                <p className="text-xs text-text-muted mt-2">
                  {league._count.seasons} {league._count.seasons === 1 ? "época" : "épocas"}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
