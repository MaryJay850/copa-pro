export const dynamic = "force-dynamic";

import { getLeagues } from "@/lib/actions";
import { isAdmin } from "@/lib/auth-guards";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateLeagueForm } from "./create-league-form";
import Link from "next/link";

export default async function LigasPage() {
  const [leagues, adminUser] = await Promise.all([getLeagues(), isAdmin()]);

  const totalMembers = leagues.reduce((sum, l) => sum + l._count.memberships, 0);
  const totalTournaments = leagues.reduce((sum, l) => sum + l._count.tournaments, 0);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ─── Top Header Card ─── */}
      <div className="rounded-lg shadow-card bg-surface border border-border overflow-hidden">
        <div className="h-28" style={{ background: "linear-gradient(to right, #5766da, #7c6fe0, #a78bfa)" }} />

        <div className="px-6 pb-6 relative">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border-4 border-surface absolute -top-10 left-6" style={{ background: "linear-gradient(to bottom right, #5766da, #8b9cf7)" }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>

          <div className="pt-14 flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Title */}
            <div className="flex-1">
              <h1 className="text-xl font-extrabold tracking-tight">As Minhas Ligas</h1>
              <p className="text-sm text-text-muted mt-0.5 font-medium">Gerir as suas ligas de padel</p>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-extrabold text-primary">{leagues.length}</p>
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Ligas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold text-text">{totalMembers}</p>
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Membros</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold text-text">{totalTournaments}</p>
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Torneios</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Body: Sidebar + Content ─── */}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Left Sidebar */}
        <div className="space-y-5">
          {/* Create League */}
          {adminUser && (
            <Card className="py-5 px-5">
              <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-4">Ações</h3>
              <CreateLeagueForm />
            </Card>
          )}

          {/* Info Card */}
          <Card className="py-5 px-5">
            <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-4">Resumo</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-text-muted">Total de Ligas</p>
                  <p className="text-sm font-medium text-text">{leagues.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-text-muted">Ligas Ativas</p>
                  <p className="text-sm font-medium text-text">
                    {leagues.filter((l) => (l as any).seasons?.length > 0).length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-text-muted">Total Torneios</p>
                  <p className="text-sm font-medium text-text">{totalTournaments}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Content Area */}
        <div className="space-y-6">
          <Card className="py-5 px-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Ligas ({leagues.length})
              </h2>
            </div>

            {leagues.length === 0 ? (
              <EmptyState
                title="Sem ligas"
                description="Crie a sua primeira liga para começar a organizar torneios."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Liga</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Época Ativa</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Torneios</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Membros</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Estado</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leagues.map((league) => {
                      const activeSeason = (league as any).seasons?.[0];
                      const canManage = (league as any).canManage;
                      return (
                        <tr
                          key={league.id}
                          className="border-b border-border/50 hover:bg-surface-hover transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(to bottom right, #5766da, #8b9cf7)" }}>
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-text truncate">{league.name}</p>
                                {league.location && (
                                  <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {league.location}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {activeSeason ? (
                              <span className="text-sm font-medium text-text">{activeSeason.name}</span>
                            ) : (
                              <span className="text-xs text-text-muted">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center text-text-muted">{league._count.tournaments}</td>
                          <td className="py-3 px-4 text-center text-text-muted">{league._count.memberships}</td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={activeSeason ? "success" : "default"} pulse={!!activeSeason}>
                              {activeSeason ? "Ativa" : "Inativa"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link href={`/ligas/${league.id}`}>
                                <Button size="sm" variant="ghost" className="text-xs">Ver</Button>
                              </Link>
                              {canManage && (
                                <Link href={`/ligas/${league.id}?modo=editar`}>
                                  <Button size="sm" variant="ghost" className="text-xs">Editar</Button>
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
