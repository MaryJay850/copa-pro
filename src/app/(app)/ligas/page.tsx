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

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">As Minhas Ligas</h1>
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
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-hover border-b border-border text-left text-xs text-text-muted uppercase tracking-wider font-semibold">
                  <th className="px-5 py-3">Liga</th>
                  <th className="px-5 py-3 text-center">Época Ativa</th>
                  <th className="px-5 py-3 text-center">Épocas</th>
                  <th className="px-5 py-3 text-center">Torneios</th>
                  <th className="px-5 py-3 text-center">Membros</th>
                  <th className="px-5 py-3 text-center">Estado</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leagues.map((league) => {
                  const activeSeason = (league as any).seasons?.[0];
                  const canManage = (league as any).canManage;
                  return (
                    <tr
                      key={league.id}
                      className="hover:bg-surface-hover transition-colors group"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                            <svg className="w-4.5 h-4.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      <td className="px-5 py-4 text-center">
                        {activeSeason ? (
                          <span className="text-sm font-medium text-text">{activeSeason.name}</span>
                        ) : (
                          <span className="text-xs text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-sm font-semibold text-text tabular-nums">{league._count.seasons}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-sm font-semibold text-text tabular-nums">{league._count.tournaments}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-sm font-semibold text-text tabular-nums">{league._count.memberships}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {activeSeason ? (
                          <Badge variant="success">Ativa</Badge>
                        ) : (
                          <Badge variant="default">Inativa</Badge>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/ligas/${league.id}`}>
                            <Button size="sm" variant="secondary" className="gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Ver
                            </Button>
                          </Link>
                          {canManage && (
                            <Link href={`/ligas/${league.id}/editar`}>
                              <Button size="sm" variant="ghost" className="gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Editar
                              </Button>
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
        </Card>
      )}
    </div>
  );
}
