export const dynamic = "force-dynamic";

import { getLeague, getLeagueInvites } from "@/lib/actions";
import { requireLeagueManager, isAdmin } from "@/lib/auth-guards";
import { Card } from "@/components/ui/card";
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

  try {
    await requireLeagueManager(leagueId);
  } catch {
    redirect(`/ligas/${leagueId}`);
  }

  const league = await getLeague(leagueId);
  if (!league) notFound();

  const adminUser = await isAdmin();
  const invites = await getLeagueInvites(leagueId);

  const activeSeason = league.seasons.find((s: any) => s.isActive);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ─── Top Header Card ─── */}
      <div className="rounded-lg shadow-card bg-surface border border-border overflow-hidden">
        <div className="h-28" style={{ background: "linear-gradient(to right, #5766da, #7c6fe0, #a78bfa)" }} />

        <div className="px-6 pb-6 relative">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border-4 border-surface absolute -top-10 left-6" style={{ background: "linear-gradient(to bottom right, #5766da, #8b9cf7)" }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>

          <div className="pt-14 flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Title */}
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-text-muted mb-1 font-medium">
                <Link href="/ligas" className="hover:text-primary transition-colors">Ligas</Link>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                <Link href={`/ligas/${leagueId}`} className="hover:text-primary transition-colors">{league.name}</Link>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                <span className="text-text">Editar</span>
              </div>
              <h1 className="text-xl font-extrabold tracking-tight">Editar Liga</h1>
              <p className="text-sm text-text-muted mt-0.5">Configurar todos os detalhes da liga</p>
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
          </div>
        </div>
      </div>

      {/* ─── Body: Sidebar + Content ─── */}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Left Sidebar */}
        <div className="space-y-5">
          {/* Navigation */}
          <Card className="py-5 px-5">
            <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-3">Secções</h3>
            <div className="space-y-1">
              <a href="#info-gerais" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-primary bg-primary/8 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Informações Gerais
              </a>
              <a href="#membros" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-text hover:bg-surface-hover transition-colors">
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Membros
              </a>
              <a href="#clubes" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-text hover:bg-surface-hover transition-colors">
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                Clubes & Campos
              </a>
              <a href="#convites" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-text hover:bg-surface-hover transition-colors">
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                Convidar Jogadores
              </a>
              <a href="#epocas" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-text hover:bg-surface-hover transition-colors">
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Épocas
              </a>
              {adminUser && (
                <>
                  <a href="#whatsapp" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-text hover:bg-surface-hover transition-colors">
                    <svg className="w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
                    WhatsApp
                  </a>
                  <a href="#zona-perigosa" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-danger hover:bg-danger/5 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                    Zona Perigosa
                  </a>
                </>
              )}
            </div>
          </Card>

          {/* Info Card */}
          <Card className="py-5 px-5">
            <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-4">Estado</h3>
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
            </div>
          </Card>
        </div>

        {/* Right Content Area */}
        <div className="space-y-6">
          {/* ─── General Info ─── */}
          <Card className="py-5 px-6" id="info-gerais">
            <h2 className="text-base font-bold mb-5 flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Informações Gerais
            </h2>
            <EditLeagueForm leagueId={leagueId} currentName={league.name} currentLocation={league.location} />
          </Card>

          {/* ─── Members ─── */}
          <Card className="py-5 px-6" id="membros">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Membros
              </h2>
              <Link href={`/ligas/${leagueId}/membros`}>
                <Button size="sm" variant="secondary">Gerir Membros</Button>
              </Link>
            </div>
            <p className="text-sm text-text-muted">Gerir jogadores, aprovar pedidos de adesão e atribuir funções.</p>
          </Card>

          {/* ─── Clubs & Courts ─── */}
          <Card className="py-5 px-6" id="clubes">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Clubes & Campos
              </h2>
              <Link href={`/ligas/${leagueId}/clubes`}>
                <Button size="sm" variant="secondary">Gerir Clubes</Button>
              </Link>
            </div>
            <p className="text-sm text-text-muted">Gerir clubes de padel, campos e qualidade dos campos.</p>
          </Card>

          {/* ─── Invite Players ─── */}
          <Card className="py-5 px-6" id="convites">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Convidar Jogadores
            </h2>
            <InviteLinkCard leagueId={leagueId} invites={invites} />
          </Card>

          {/* ─── Seasons ─── */}
          <Card className="py-5 px-6" id="epocas">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Épocas
            </h2>
            {adminUser && <div className="mb-4"><CreateSeasonForm leagueId={league.id} /></div>}
            {league.seasons.length === 0 ? (
              <p className="text-sm text-text-muted">Sem épocas criadas.</p>
            ) : (
              <div className="space-y-2">
                {league.seasons.map((season: any) => (
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
            <Card className="py-5 px-6" id="whatsapp">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-success" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                </svg>
                WhatsApp
              </h2>
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-muted">
                  {league.whatsappGroupId ? "Grupo WhatsApp configurado." : "Sem grupo WhatsApp associado."}
                </p>
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
            <Card className="py-5 px-6 border-danger/30" id="zona-perigosa">
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
