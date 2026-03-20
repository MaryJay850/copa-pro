export const dynamic = "force-dynamic";

import { getLeagues } from "@/lib/actions";
import { isAdmin } from "@/lib/auth-guards";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateLeagueForm } from "./create-league-form";
import Link from "next/link";

export default async function LigasPage() {
  const [leagues, adminUser] = await Promise.all([getLeagues(), isAdmin()]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Ligas</h1>
          <p className="text-sm text-text-muted mt-1 font-medium">Gerir as suas ligas de padel</p>
        </div>
      </div>

      {adminUser && <CreateLeagueForm />}

      {leagues.length === 0 ? (
        <EmptyState
          title="Sem ligas"
          description="Crie a sua primeira liga para começar a organizar torneios."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {leagues.map((league, i) => (
            <Link key={league.id} href={`/ligas/${league.id}`}>
              <Card className={`card-hover cursor-pointer h-full animate-fade-in-up stagger-${i + 1}`}>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mb-3">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-bold text-base tracking-tight">{league.name}</h3>
                {league.location && (
                  <p className="text-sm text-text-muted mt-1 flex items-center gap-1.5 font-medium">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {league.location}
                  </p>
                )}
                <p className="text-xs text-text-muted mt-3 font-semibold">
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
