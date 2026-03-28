export const dynamic = "force-dynamic";

import { getLeague, getLeagueInvites } from "@/lib/actions";
import { isLeagueManager, isAdmin } from "@/lib/auth-guards";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InviteLinkCard } from "@/components/invite-link-card";
import { CreateSeasonForm } from "./create-season-form";
import { ActivityLog } from "@/components/activity-log";
import { DeleteLeagueButton } from "./delete-league-button";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function LeaguePage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params;
  const league = await getLeague(leagueId);

  if (!league) notFound();

  const canManage = await isLeagueManager(leagueId);
  const adminUser = await isAdmin();
  const invites = canManage ? await getLeagueInvites(leagueId) : [];

  const activeSeason = league.seasons.find((s: any) => s.isActive);
  const leagueInitials = league.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

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
            {/* Name & Location */}
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-extrabold tracking-tight">{league.name}</h1>
                <Badge variant={activeSeason ? "success" : "default"} pulse={!!activeSeason}>
                  {activeSeason ? "Ativa" : "Inativa"}
                </Badge>
              </div>
              {league.location && (
                <p className="text-sm text-text-muted mt-1 flex items-center gap-1.5 font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {league.location}
                </p>
              )}
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-extrabold text-primary">{(league as any)._count?.memberships ?? 0}</p>
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Membros</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold text-text">{(league as any)._count?.seasons ?? 0}</p>
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Épocas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold text-text">{(league as any)._count?.tournaments ?? 0}</p>
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Torneios</p>
              </div>
            </div>

            {/* Actions */}
            {canManage && (
              <div className="flex items-center gap-2">
                <Link href={`/ligas/${leagueId}/editar`}>
                  <Button size="sm" variant="secondary" className="gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Editar
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Body: Sidebar + Content ─── */}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Left Sidebar */}
        <div className="space-y-5">
          {/* Info Card */}
          <Card className="py-5 px-5">
            <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-4">Informação</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-text-muted">Época Ativa</p>
                  <p className="text-sm font-medium text-text">{activeSeason ? (activeSeason as any).name : "Nenhuma"}</p>
                </div>
              </div>
              {league.location && (
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-text-muted">Localização</p>
                    <p className="text-sm font-medium text-text">{league.location}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-text-muted">Total de Membros</p>
                  <p className="text-sm font-medium text-text">{(league as any)._count?.memberships ?? 0} jogadores</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Links */}
          {canManage && (
            <Card className="py-5 px-5">
              <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-4">Gestão Rápida</h3>
              <div className="space-y-1.5">
                <Link href={`/ligas/${leagueId}/membros`} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-text hover:bg-surface-hover transition-colors">
                  <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Membros
                </Link>
                <Link href={`/ligas/${leagueId}/clubes`} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-text hover:bg-surface-hover transition-colors">
                  <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  Clubes & Campos
                </Link>
                <Link href={`/ligas/${leagueId}/editar`} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-text hover:bg-surface-hover transition-colors">
                  <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Definições
                </Link>
              </div>
            </Card>
          )}
        </div>

        {/* Right Content Area */}
        <div className="space-y-6">
          {/* Invite players */}
          {canManage && (
            <Card className="py-5 px-6">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                Convidar Jogadores
              </h2>
              <InviteLinkCard leagueId={leagueId} invites={invites} />
            </Card>
          )}

          {/* Seasons */}
          <Card className="py-5 px-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Épocas
              </h2>
            </div>
            {adminUser && <div className="mb-4"><CreateSeasonForm leagueId={league.id} /></div>}

            {league.seasons.length === 0 ? (
              <EmptyState
                title="Sem épocas"
                description="Crie uma época para começar a organizar torneios."
              />
            ) : (
              <div className="space-y-2">
                {league.seasons.map((season: any) => (
                  <Link key={season.id} href={`/ligas/${league.id}/epocas/${season.id}`}>
                    <div className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-surface-hover transition-colors border border-border">
                      <span className="font-semibold text-sm">{season.name}</span>
                      <div className="flex items-center gap-2">
                        {season.allowDraws && (
                          <span className="text-xs text-warning font-medium flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                            Empates
                          </span>
                        )}
                        <Badge variant={season.isActive ? "success" : "default"} pulse={season.isActive}>
                          {season.isActive ? "Ativa" : "Encerrada"}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Activity Log */}
          {canManage && (
            <Card className="py-5 px-6">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Atividade Recente
              </h2>
              <ActivityLog leagueId={leagueId} />
            </Card>
          )}

          {/* Danger Zone */}
          {adminUser && (
            <Card className="py-5 px-6 border-danger/30">
              <h2 className="text-base font-bold mb-3 text-danger flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Zona Perigosa
              </h2>
              <p className="text-sm text-text-muted mb-4">Ações irreversíveis. Tenha cuidado.</p>
              <DeleteLeagueButton leagueId={leagueId} leagueName={league.name} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
