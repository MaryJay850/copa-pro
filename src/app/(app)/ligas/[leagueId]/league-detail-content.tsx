"use client";

import React, { useState, useTransition } from "react";
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
import { updateLeague, searchUsers, addPlayerToLeague, removePlayerFromLeague } from "@/lib/actions";
import { addClubToLeague, removeClubFromLeague } from "@/lib/actions/club-actions";
import { sanitizeError } from "@/lib/error-utils";
import Link from "next/link";

type CourtData = {
  id: string;
  name: string;
  quality: string;
  isAvailable: boolean;
  orderIndex: number;
};

type ClubData = {
  id: string;
  name: string;
  location: string | null;
  courts: CourtData[];
  _count: { courts: number };
};

type MembershipData = {
  id: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    player: { id: string; fullName: string; nickname: string | null; eloRating: number } | null;
  };
};

type LeagueData = {
  id: string;
  name: string;
  location: string | null;
  whatsappGroupId: string | null;
  seasons: any[];
  memberships: MembershipData[];
  _count: { memberships: number; seasons: number; tournaments: number };
};

type SearchResult = {
  id: string;
  email: string;
  phone: string;
  player: { fullName: string; nickname: string | null } | null;
};

type Props = {
  league: LeagueData;
  canManage: boolean;
  adminUser: boolean;
  invites: any[];
  leagueClubs: ClubData[];
  availableClubs: ClubData[];
  initialMode: "view" | "edit";
  currentUserId: string;
};

export function LeagueDetailContent({ league, canManage, adminUser, invites, leagueClubs, availableClubs, initialMode, currentUserId }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit">(initialMode);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [name, setName] = useState(league.name);
  const [location, setLocation] = useState(league.location || "");
  const [saving, setSaving] = useState(false);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showAddClubModal, setShowAddClubModal] = useState(false);
  const [expandedClubs, setExpandedClubs] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<string>("epocas");

  // Members sorting
  const [memberSort, setMemberSort] = useState<{ col: string; dir: "asc" | "desc" }>({ col: "name", dir: "asc" });

  // Add member search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const isEditing = mode === "edit" && canManage;
  const activeSeason = league.seasons.find((s: any) => s.isActive);
  const hasChanges = name !== league.name || location !== (league.location || "");
  const memberUserIds = new Set((league.memberships ?? []).map((m) => m.user.id));

  // Sort members
  const sortedMembers = [...(league.memberships ?? [])].sort((a, b) => {
    const dir = memberSort.dir === "asc" ? 1 : -1;
    switch (memberSort.col) {
      case "name":
        return dir * (a.user.player?.fullName ?? "").localeCompare(b.user.player?.fullName ?? "");
      case "nickname":
        return dir * (a.user.player?.nickname ?? "").localeCompare(b.user.player?.nickname ?? "");
      case "elo":
        return dir * ((a.user.player?.eloRating ?? 0) - (b.user.player?.eloRating ?? 0));
      case "role":
        return dir * (a.role ?? "").localeCompare(b.role ?? "");
      default:
        return 0;
    }
  });

  const toggleSort = (col: string) => {
    setMemberSort((prev) => prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" });
  };

  const sortIcon = (col: string) => {
    if (memberSort.col !== col) return <span className="text-text-muted/40 ml-1">&uarr;&darr;</span>;
    return <span className="text-primary ml-1">{memberSort.dir === "asc" ? "\u2191" : "\u2193"}</span>;
  };

  const handleSearchMembers = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    setIsSearching(true);
    try {
      const results = await searchUsers(searchQuery.trim());
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
    setIsSearching(false);
  };

  const handleAddMember = (userId: string) => {
    startTransition(async () => {
      try {
        await addPlayerToLeague(userId, league.id);
        setSearchResults((prev) => prev.filter((u) => u.id !== userId));
        toast.success("Membro adicionado com sucesso.");
        router.refresh();
      } catch (err) {
        toast.error(sanitizeError(err, "Erro ao adicionar membro."));
      }
    });
  };

  const handleRemoveMember = (userId: string, memberName: string) => {
    if (!confirm(`Remover ${memberName} da liga?`)) return;
    startTransition(async () => {
      try {
        await removePlayerFromLeague(userId, league.id);
        toast.success("Membro removido.");
        router.refresh();
      } catch (err) {
        toast.error(sanitizeError(err, "Erro ao remover membro."));
      }
    });
  };

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
                {[
                  { key: "epocas", label: "Épocas", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
                  { key: "membros", label: "Membros", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
                  { key: "clubes", label: "Clubes Associados", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
                  { key: "reservas", label: "Reservas de Campos", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11v4m0 0l-2-2m2 2l2-2" /></svg> },
                  { key: "invite", label: "Convidar Jogadores", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg> },
                  { key: "atividade", label: "Atividade Recente", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
                  { key: "financeiro", label: "Gestão Financeira", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      if (item.key === "reservas") {
                        router.push(`/ligas/${league.id}/reservas`);
                        return;
                      }
                      if (item.key === "financeiro") {
                        router.push(`/ligas/${league.id}/financeiro`);
                        return;
                      }
                      if (item.key === "invite") {
                        setShowInvitePanel(true);
                      } else {
                        setActiveSection(item.key);
                      }
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeSection === item.key && item.key !== "invite"
                        ? "bg-primary/10 text-primary"
                        : "text-text hover:bg-surface-hover"
                    }`}
                  >
                    <span className={activeSection === item.key && item.key !== "invite" ? "text-primary" : "text-text-muted"}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </Card>
          )}

        </div>

        {/* Right Content Area */}
        <div className="space-y-6">
          {/* ─── General Info (always visible) ─── */}
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
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
                  ) : (
                    <div className={disabledClass}>{league.name}</div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Localização</label>
                  {isEditing ? (
                    <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Lisboa, Porto..." className={inputClass} />
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

          {/* ─── Épocas Table ─── */}
          {activeSection === "epocas" && (
            <Card className="py-5 px-6" id="epocas">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Épocas
                </h2>
                {adminUser && isEditing && <CreateSeasonForm leagueId={league.id} />}
              </div>
              {league.seasons.length === 0 ? (
                <EmptyState title="Sem épocas" description="Crie uma época para começar a organizar torneios." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Época</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Torneios</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Empates</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Estado</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {league.seasons.map((season: any) => (
                        <tr key={season.id} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
                          <td className="py-3 px-4 font-semibold">{season.name}</td>
                          <td className="py-3 px-4 text-center text-text-muted">{season._count?.tournaments ?? 0}</td>
                          <td className="py-3 px-4 text-center">
                            {season.allowDraws ? (
                              <Badge variant="warning">Sim</Badge>
                            ) : (
                              <span className="text-text-muted">Não</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={season.isActive ? "success" : "default"} pulse={season.isActive}>
                              {season.isActive ? "Ativa" : "Encerrada"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link href={`/ligas/${league.id}/epocas/${season.id}`}>
                              <Button size="sm" variant="ghost" className="text-xs">
                                Ver
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* ─── Membros Table ─── */}
          {activeSection === "membros" && (
            <Card className="py-5 px-6" id="membros">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Membros ({league.memberships?.length ?? 0})
                </h2>
                {canManage && (
                  <Button size="sm" onClick={() => { setShowAddMemberModal(true); setSearchQuery(""); setSearchResults([]); }}>
                    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                    Adicionar Membro
                  </Button>
                )}
              </div>
              {(!league.memberships || league.memberships.length === 0) ? (
                <EmptyState title="Sem membros" description="Convide jogadores para se juntarem à liga." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider cursor-pointer select-none hover:text-text" onClick={() => toggleSort("name")}>
                          Nome{sortIcon("name")}
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider cursor-pointer select-none hover:text-text" onClick={() => toggleSort("nickname")}>
                          Alcunha{sortIcon("nickname")}
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider cursor-pointer select-none hover:text-text" onClick={() => toggleSort("elo")}>
                          Elo{sortIcon("elo")}
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider cursor-pointer select-none hover:text-text" onClick={() => toggleSort("role")}>
                          Função{sortIcon("role")}
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedMembers.map((m: MembershipData) => {
                        const isCurrentUser = m.user.id === currentUserId;
                        return (
                          <tr key={m.id} className={`border-b border-border/50 transition-colors ${isCurrentUser ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-surface-hover"}`}>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{m.user.player?.fullName ?? "—"}</span>
                                {isCurrentUser && <Badge variant="info" className="text-[10px] py-0 px-1.5">Tu</Badge>}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-text-muted">{m.user.player?.nickname ?? "—"}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="font-mono font-medium text-primary">{m.user.player?.eloRating ?? "—"}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge variant={m.role === "MANAGER" ? "warning" : "default"}>
                                {m.role === "MANAGER" ? "Gestor" : "Membro"}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {m.user.player?.id && (
                                  <Link href={`/jogadores/${m.user.player.id}`}>
                                    <Button size="sm" variant="ghost" className="text-xs">Ver</Button>
                                  </Link>
                                )}
                                {canManage && !isCurrentUser && (
                                  <button
                                    onClick={() => handleRemoveMember(m.user.id, m.user.player?.fullName ?? m.user.email)}
                                    disabled={isPending}
                                    className="text-xs text-danger hover:text-danger/80 font-medium px-2 py-1"
                                  >
                                    Remover
                                  </button>
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
          )}

          {/* ─── Clubes Associados Table ─── */}
          {activeSection === "clubes" && (
            <Card className="py-5 px-6" id="clubes">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Clubes Associados ({leagueClubs.length})
                </h2>
                {canManage && availableClubs.length > 0 && (
                  <Button size="sm" onClick={() => setShowAddClubModal(true)}>
                    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Associar Clube
                  </Button>
                )}
              </div>
              {leagueClubs.length === 0 ? (
                <EmptyState title="Sem clubes" description="Nenhum clube associado a esta liga." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Clube</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Localização</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Campos</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leagueClubs.map((club) => {
                        const isExpanded = expandedClubs.has(club.id);
                        return (
                          <React.Fragment key={club.id}>
                            <tr
                              className="border-b border-border/50 hover:bg-surface-hover transition-colors cursor-pointer"
                              onClick={() => setExpandedClubs((prev) => {
                                const next = new Set(prev);
                                if (next.has(club.id)) next.delete(club.id); else next.add(club.id);
                                return next;
                              })}
                            >
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <svg className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(to bottom right, #5766da, #8b9cf7)" }}>
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                  </div>
                                  <span className="font-semibold">{club.name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-text-muted">{club.location || "—"}</td>
                              <td className="py-3 px-4 text-center">
                                <Badge variant="default">{club._count.courts} campos</Badge>
                              </td>
                              <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                {canManage && (
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Remover ${club.name} da liga?`)) return;
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
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={4} className="px-4 py-3 bg-surface-alt/50">
                                  <div className="pl-11">
                                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Campos do Clube</p>
                                    {(!club.courts || club.courts.length === 0) ? (
                                      <p className="text-sm text-text-muted">Nenhum campo configurado.</p>
                                    ) : (
                                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                        {club.courts.map((court) => {
                                          const qualityConfig: Record<string, { label: string; variant: "success" | "warning" | "danger" }> = {
                                            GOOD: { label: "Bom", variant: "success" },
                                            MEDIUM: { label: "Médio", variant: "warning" },
                                            BAD: { label: "Mau", variant: "danger" },
                                          };
                                          const q = qualityConfig[court.quality] || qualityConfig.GOOD;
                                          return (
                                            <div key={court.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${court.isAvailable ? "border-border bg-surface" : "border-border/50 bg-surface-alt opacity-60"}`}>
                                              <div className="flex items-center gap-2">
                                                <svg className="w-3.5 h-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                                </svg>
                                                <span className="text-sm font-medium">{court.name}</span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Badge variant={q.variant} className="text-[10px] py-0">{q.label}</Badge>
                                                {!court.isAvailable && (
                                                  <span className="text-[10px] text-text-muted font-medium">Indisponível</span>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* ─── Atividade Recente Table ─── */}
          {activeSection === "atividade" && canManage && (
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

      {/* ─── Modals (rendered at root level for proper fixed positioning) ─── */}

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

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddMemberModal(false)} />
          <div className="relative bg-surface rounded-xl shadow-xl border border-border w-full max-w-lg mx-4 p-6 animate-fade-in-up max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                Adicionar Membro
              </h2>
              <button onClick={() => setShowAddMemberModal(false)} className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors text-text-muted">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchMembers()}
                placeholder="Pesquisar por nome ou email..."
                className={inputClass}
              />
              <Button size="sm" onClick={handleSearchMembers} disabled={isSearching || searchQuery.trim().length < 2}>
                {isSearching ? "..." : "Pesquisar"}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((user) => {
                  const isMember = memberUserIds.has(user.id);
                  return (
                    <div key={user.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{user.player?.fullName ?? user.email}</p>
                        <p className="text-xs text-text-muted">{user.email}</p>
                        {user.phone && <p className="text-xs text-text-muted">{user.phone}</p>}
                      </div>
                      {isMember ? (
                        <Badge variant="success">Já é membro</Badge>
                      ) : (
                        <Button size="sm" onClick={() => handleAddMember(user.id)} disabled={isPending}>
                          {isPending ? "..." : "Adicionar"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {searchResults.length === 0 && searchQuery.trim().length >= 2 && !isSearching && (
              <p className="text-xs text-text-muted mt-2">
                Sem resultados. O utilizador precisa de estar registado na plataforma.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Add Club Modal */}
      {showAddClubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddClubModal(false)} />
          <div className="relative bg-surface rounded-xl shadow-xl border border-border w-full max-w-lg mx-4 p-6 animate-fade-in-up max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                Associar Clube
              </h2>
              <button onClick={() => setShowAddClubModal(false)} className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors text-text-muted">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <p className="text-sm text-text-muted mb-4">Selecione um clube para associar a esta liga. Os clubes são criados e geridos pelos administradores.</p>

            {availableClubs.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">Todos os clubes já estão associados a esta liga.</p>
            ) : (
              <div className="space-y-2">
                {availableClubs.map((club) => (
                  <div key={club.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 hover:bg-surface-hover transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(to bottom right, #5766da, #8b9cf7)" }}>
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{club.name}</p>
                        <p className="text-xs text-text-muted">
                          {club.location || "Sem localização"} — {club._count.courts} campos
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          await addClubToLeague(club.id, league.id);
                          toast.success(`${club.name} associado à liga!`);
                          setShowAddClubModal(false);
                          router.refresh();
                        } catch (err) {
                          toast.error(sanitizeError(err, "Erro ao associar clube."));
                        }
                      }}
                      disabled={isPending}
                    >
                      {isPending ? "..." : "Associar"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
