export const dynamic = "force-dynamic";

import { getLeague, getLeagueInvites } from "@/lib/actions";
import { requireLeagueManager, isAdmin } from "@/lib/auth-guards";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InviteLinkCard } from "@/components/invite-link-card";
import { CreateSeasonForm } from "../create-season-form";
import { EditLeagueForm } from "../edit-league-form";
import { WhatsAppManagementModal } from "../whatsapp-management-modal";
import { DeleteLeagueButton } from "../delete-league-button";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export default async function EditLeaguePage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params;

  // Require manager or admin access
  try {
    await requireLeagueManager(leagueId);
  } catch {
    redirect(`/ligas/${leagueId}`);
  }

  const league = await getLeague(leagueId);
  if (!league) notFound();

  const adminUser = await isAdmin();
  const invites = await getLeagueInvites(leagueId);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-text-muted mb-2 font-medium">
          <Link href="/ligas" className="hover:text-primary transition-colors">Ligas</Link>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          <Link href={`/ligas/${leagueId}`} className="hover:text-primary transition-colors">{league.name}</Link>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          <span className="text-text">Editar</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">Editar Liga</h1>
        <p className="text-sm text-text-muted mt-1">Configurar todos os detalhes da liga</p>
      </div>

      {/* ─── General Info ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Informações Gerais
          </CardTitle>
        </CardHeader>
        <EditLeagueForm leagueId={leagueId} currentName={league.name} currentLocation={league.location} />
      </Card>

      {/* ─── Members ─── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Membros
            </CardTitle>
            <Link href={`/ligas/${leagueId}/membros`}>
              <Button size="sm" variant="secondary">
                Gerir Membros
              </Button>
            </Link>
          </div>
        </CardHeader>
        <p className="text-sm text-text-muted">Gerir jogadores, aprovar pedidos de adesão e atribuir funções.</p>
      </Card>

      {/* ─── Clubs & Courts ─── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Clubes & Campos
            </CardTitle>
            <Link href={`/ligas/${leagueId}/clubes`}>
              <Button size="sm" variant="secondary">
                Gerir Clubes
              </Button>
            </Link>
          </div>
        </CardHeader>
        <p className="text-sm text-text-muted">Gerir clubes de padel, campos e qualidade dos campos.</p>
      </Card>

      {/* ─── Invite Players ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Convidar Jogadores
          </CardTitle>
        </CardHeader>
        <InviteLinkCard leagueId={leagueId} invites={invites} />
      </Card>

      {/* ─── Seasons ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Épocas
          </CardTitle>
        </CardHeader>
        {adminUser && <div className="mb-4"><CreateSeasonForm leagueId={league.id} /></div>}
        {league.seasons.length === 0 ? (
          <p className="text-sm text-text-muted">Sem épocas criadas.</p>
        ) : (
          <div className="space-y-2">
            {league.seasons.map((season) => (
              <Link key={season.id} href={`/ligas/${league.id}/epocas/${season.id}`}>
                <div className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-surface-hover transition-colors border border-border">
                  <span className="font-semibold text-sm">{season.name}</span>
                  <Badge variant={season.isActive ? "success" : "default"} pulse={season.isActive}>
                    {season.isActive ? "Ativa" : "Encerrada"}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* ─── WhatsApp ─── */}
      {adminUser && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="w-4 h-4 text-success" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              </svg>
              WhatsApp
            </CardTitle>
          </CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">
                {league.whatsappGroupId ? "Grupo WhatsApp configurado." : "Sem grupo WhatsApp associado."}
              </p>
            </div>
            <WhatsAppManagementModal
              leagueId={leagueId}
              hasGroup={!!league.whatsappGroupId}
              whatsappGroupId={league.whatsappGroupId}
            />
          </div>
        </Card>
      )}

      {/* ─── Danger Zone ─── */}
      {adminUser && (
        <Card className="border-danger/30">
          <CardHeader>
            <CardTitle className="text-danger flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Zona Perigosa
            </CardTitle>
          </CardHeader>
          <p className="text-sm text-text-muted mb-4">Ações irreversíveis. Tenha cuidado.</p>
          <DeleteLeagueButton leagueId={leagueId} leagueName={league.name} />
        </Card>
      )}
    </div>
  );
}
