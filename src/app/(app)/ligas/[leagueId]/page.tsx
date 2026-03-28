export const dynamic = "force-dynamic";

import { getLeague, getLeagueInvites } from "@/lib/actions";
import { isLeagueManager, isAdmin } from "@/lib/auth-guards";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InviteLinkCard } from "@/components/invite-link-card";
import { CreateSeasonForm } from "./create-season-form";
import { EditLeagueForm } from "./edit-league-form";
import { WhatsAppManagementModal } from "./whatsapp-management-modal";
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

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-text-muted mb-2 font-medium">
          <Link href="/ligas" className="hover:text-primary transition-colors">Ligas</Link>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-extrabold tracking-tight">{league.name}</h1>
          {canManage && (
            <div className="flex items-center gap-2">
              <EditLeagueForm leagueId={leagueId} currentName={league.name} currentLocation={league.location} />
              <Link href={`/ligas/${leagueId}/membros`}>
                <Button size="sm" variant="secondary">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Membros
                  </span>
                </Button>
              </Link>
              <Link href={`/ligas/${leagueId}/clubes`}>
                <Button size="sm" variant="secondary">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    Clubes
                  </span>
                </Button>
              </Link>
              {adminUser && (
                <WhatsAppManagementModal
                  leagueId={leagueId}
                  hasGroup={!!league.whatsappGroupId}
                  whatsappGroupId={league.whatsappGroupId}
                />
              )}
            </div>
          )}
        </div>
        {league.location && (
          <p className="text-sm text-text-muted mt-1.5 flex items-center gap-1.5 font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {league.location}
          </p>
        )}
      </div>

      {/* Invite players */}
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
              Convidar Jogadores
            </CardTitle>
          </CardHeader>
          <InviteLinkCard leagueId={leagueId} invites={invites} />
        </Card>
      )}

      {/* Seasons */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold tracking-tight">Épocas</h2>
        </div>
        {adminUser && <div className="mb-4"><CreateSeasonForm leagueId={league.id} /></div>}

        {league.seasons.length === 0 ? (
          <EmptyState
            title="Sem épocas"
            description="Crie uma época para começar a organizar torneios."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {league.seasons.map((season, i) => (
              <Link key={season.id} href={`/ligas/${league.id}/epocas/${season.id}`}>
                <Card className={`card-hover cursor-pointer h-full animate-fade-in-up stagger-${i + 1}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold tracking-tight">{season.name}</h3>
                    <Badge variant={season.isActive ? "success" : "default"} pulse={season.isActive}>
                      {season.isActive ? "Ativa" : "Encerrada"}
                    </Badge>
                  </div>
                  {season.allowDraws && (
                    <p className="text-xs text-amber-600 mt-2 font-medium flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                      Empates permitidos
                    </p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {canManage && (
        <ActivityLog leagueId={leagueId} />
      )}

      {adminUser && (
        <div className="pt-6 border-t border-border">
          <DeleteLeagueButton leagueId={leagueId} leagueName={league.name} />
        </div>
      )}
    </div>
  );
}
