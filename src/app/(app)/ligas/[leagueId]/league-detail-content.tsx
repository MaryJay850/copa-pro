"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InviteLinkCard } from "@/components/invite-link-card";
import { CreateSeasonForm } from "./create-season-form";
import { WhatsAppManagementModal } from "./whatsapp-management-modal";
import { DeleteLeagueButton } from "./delete-league-button";
import { ActivityLog } from "@/components/activity-log";
import { updateLeague } from "@/lib/actions";
import { addClubToLeague, removeClubFromLeague } from "@/lib/actions/club-actions";
import { sanitizeError } from "@/lib/error-utils";
import Link from "next/link";

type ClubData = {
  id: string;
  name: string;
  location: string | null;
  _count: { courts: number };
};

type LeagueData = {
  id: string;
  name: string;
  location: string | null;
  whatsappGroupId: string | null;
  seasons: any[];
  _count: { memberships: number; seasons: number; tournaments: number };
};

type Props = {
  league: LeagueData;
  canManage: boolean;
  adminUser: boolean;
  invites: any[];
  leagueClubs: ClubData[];
  availableClubs: ClubData[];
  initialMode: "view" | "edit";
};

export function LeagueDetailContent({ league, canManage, adminUser, invites, leagueClubs, availableClubs, initialMode }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit">(initialMode);

  // Form state
  const [name, setName] = useState(league.name);
  const [location, setLocation] = useState(league.location || "");
  const [saving, setSaving] = useState(false);
  const [showInvitePanel, setShowInvitePanel] = useState(false);

  const isEditing = mode === "edit" && canManage;
  const activeSeason = league.seasons.find((s: any) => s.isActive);
  const hasChanges = name !== league.name || location !== (league.location || "");

  const inputClass = "w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors";
  const disabledClass = "w-full rounded-lg border border-border bg-surface-alt px-4 py-2.5 text-sm text-text opacity-80 cursor-default";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateLeague(league.id, { name, location: location || undefined });
      toast.success("Liga atualizada com sucesso!");
      router.refresh();
      setMode("view");
    } catch (err) {
      toast.error(sanitizeError(err, "Erro ao guardar liga."));
    }
    setSaving(false);
  };

  const handleCancelEdit = () => {
    setName(league.name);
    setLocation(league.location || "");
    setMode("view");
  };

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
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-extrabold tracking-tight">{league.name}</h1>
                <Badge variant={activeSeason ? "success" : "default"} pulse={!!activeSeason}>
                  {activeSeason ? "Ativa" : "Inativa"}
                </Badge>
                {isEditing && (
                  <Badge variant="warning">Modo Edição</Badge>
                )}
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
                <p className="text-2xl font-extrabold text-primary">{league._count?.memberships ?? 0}</p>
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Membros</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold text-text">{league._count?.seasons ?? 0}</p>
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Épocas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold text-text">{league._count?.tournaments ?? 0}</p>
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Torneios</p>
              </div>
            </div>

            {/* Edit/View toggle */}
            {canManage && !isEditing && (
              <Button size="sm" onClick={() => setMode("edit")} className="gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar
              </Button>
            )}
            {isEditing && (
              <Button size="sm" variant="secondary" onClick={handleCancelEdit} className="gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Ver
              </Button>
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
                  <p className="text-sm font-medium text-text">{activeSeason ? activeSeason.name : "Nenhuma"}</p>
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
                  <p className="text-sm font-medium text-text">{league._count?.memberships ?? 0} jogadores</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Links */}
          {canManage && (
            <Card className="py-5 px-5">
              <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-4">Gestão Rápida</h3>
              <div className="space-y-1.5">
                <a href="#epocas" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-text hover:bg-surface-hover transition-colors">
                  <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Épocas
                </a>
                <Link href={`/ligas/${league.id}/membros`} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-text hover:bg-surface-hover transition-colors">
                  <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Membros
                </Link>
                <a href="#clubes" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-text hover:bg-surface-hover transition-colors">
                  <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  Clubes Associados
                </a>
                <button
                  onClick={() => setShowInvitePanel(!showInvitePanel)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-text hover:bg-surface-hover transition-colors"
                >
                  <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                  Convidar Jogadores
                </button>
                <a href="#atividade" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-text hover:bg-surface-hover transition-colors">
                  <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  Atividade Recente
                </a>
              </div>
            </Card>
          )}

          {/* Invite Modal */}
          {showInvitePanel && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowInvitePanel(false)} />
              <div className="relative bg-surface rounded-xl shadow-xl border border-border w-full max-w-md mx-4 p-6 animate-fade-in-up">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                    Convidar Jogadores
                  </h2>
                  <button onClick={() => setShowInvitePanel(false)} className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors text-text-muted">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <InviteLinkCard leagueId={league.id} invites={invites} />
              </div>
            </div>
          )}
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
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Nome da Liga</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className={inputClass}
                    />
                  ) : (
                    <div className={disabledClass}>{league.name}</div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Localização</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Ex: Lisboa, Porto..."
                      className={inputClass}
                    />
                  ) : (
                    <div className={disabledClass}>{league.location || "—"}</div>
                  )}
                </div>
              </div>
              {isEditing && (
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={saving || !hasChanges}>
                    {saving ? "A guardar..." : "Guardar Alterações"}
                  </Button>
                </div>
              )}
            </form>
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
              {canManage && (
                <Link href={`/ligas/${league.id}/membros`}>
                  <Button size="sm" variant="secondary">Gerir Membros</Button>
                </Link>
              )}
            </div>
            <p className="text-sm text-text-muted">
              {canManage
                ? "Gerir jogadores, aprovar pedidos de adesão e atribuir funções."
                : `${league._count?.memberships ?? 0} jogadores inscritos nesta liga.`}
            </p>
          </Card>

          {/* ─── Clubs ─── */}
          <Card className="py-5 px-6" id="clubes">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Clubes Associados
              </h2>
            </div>
            {leagueClubs.length === 0 ? (
              <p className="text-sm text-text-muted">Nenhum clube associado a esta liga.</p>
            ) : (
              <div className="space-y-2">
                {leagueClubs.map((club) => (
                  <div key={club.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(to bottom right, #5766da, #8b9cf7)" }}>
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-sm font-semibold">{club.name}</span>
                        {club.location && (
                          <p className="text-xs text-text-muted">{club.location}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="default">{club._count.courts} campos</Badge>
                      {isEditing && (
                        <button
                          onClick={async () => {
                            try {
                              await removeClubFromLeague(club.id, league.id);
                              toast.success(`${club.name} removido da liga.`);
                              router.refresh();
                            } catch (err) {
                              toast.error(sanitizeError(err, "Erro ao remover clube."));
                            }
                          }}
                          className="text-xs text-danger hover:text-danger/80 font-medium"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Add club (edit mode) */}
            {isEditing && availableClubs.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <label className="block text-xs font-semibold text-text-muted mb-1.5">Associar Clube</label>
                <div className="flex gap-2">
                  <select
                    id="add-club-select"
                    className={inputClass}
                    defaultValue=""
                  >
                    <option value="" disabled>Selecionar clube...</option>
                    {availableClubs.map((club) => (
                      <option key={club.id} value={club.id}>
                        {club.name} {club.location ? `(${club.location})` : ""} — {club._count.courts} campos
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      const select = document.getElementById("add-club-select") as HTMLSelectElement;
                      if (!select.value) return;
                      try {
                        await addClubToLeague(select.value, league.id);
                        toast.success("Clube associado à liga!");
                        router.refresh();
                      } catch (err) {
                        toast.error(sanitizeError(err, "Erro ao associar clube."));
                      }
                    }}
                  >
                    Associar
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* ─── Seasons ─── */}
          <Card className="py-5 px-6" id="epocas">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Épocas
            </h2>
            {adminUser && isEditing && <div className="mb-4"><CreateSeasonForm leagueId={league.id} /></div>}

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

          {/* ─── WhatsApp ─── */}
          {adminUser && isEditing && (
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
                  leagueId={league.id}
                  hasGroup={!!league.whatsappGroupId}
                  whatsappGroupId={league.whatsappGroupId}
                />
              </div>
            </Card>
          )}

          {/* ─── Activity Log ─── */}
          {canManage && (
            <Card className="py-5 px-6" id="atividade">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Atividade Recente
              </h2>
              <ActivityLog leagueId={league.id} />
            </Card>
          )}

          {/* ─── Danger Zone ─── */}
          {adminUser && isEditing && (
            <Card className="py-5 px-6 border-danger/30" id="zona-perigosa">
              <h2 className="text-base font-bold mb-3 text-danger flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Zona Perigosa
              </h2>
              <p className="text-sm text-text-muted mb-4">Ações irreversíveis. Tenha cuidado.</p>
              <DeleteLeagueButton leagueId={league.id} leagueName={league.name} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
