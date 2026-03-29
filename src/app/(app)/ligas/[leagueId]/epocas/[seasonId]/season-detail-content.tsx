"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RankingTable } from "@/components/ranking-table";
import { ExportPDF } from "@/components/export-pdf";
import { updateSeasonSettings, cloneSeason, adjustPlayerRanking } from "@/lib/actions";
import Link from "next/link";

const statusLabels: Record<string, { label: string; variant: "default" | "success" | "warning" | "info" }> = {
  DRAFT: { label: "Rascunho", variant: "default" },
  PUBLISHED: { label: "Publicado", variant: "info" },
  RUNNING: { label: "A decorrer", variant: "warning" },
  FINISHED: { label: "Terminado", variant: "success" },
};

type Props = {
  season: any;
  leagueId: string;
  seasonId: string;
  canManage: boolean;
  adminUser: boolean;
  canCreateTournament: boolean;
  tournamentLimitMessage: string;
  rankingRows: any[];
};

export function SeasonDetailContent({
  season, leagueId, seasonId, canManage, adminUser,
  canCreateTournament, tournamentLimitMessage, rankingRows,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [activeSection, setActiveSection] = useState<string>("ranking");

  // Edit form state
  const [name, setName] = useState(season.name);
  const [allowDraws, setAllowDraws] = useState(season.allowDraws);
  const [startDate, setStartDate] = useState(season.startDate || "");
  const [endDate, setEndDate] = useState(season.endDate || "");
  const [saving, setSaving] = useState(false);

  // Ranking config state
  const [rankingMode, setRankingMode] = useState(season.rankingMode || "SUM");
  const [pointsWin, setPointsWin] = useState(season.pointsWin ?? 3);
  const [pointsDraw, setPointsDraw] = useState(season.pointsDraw ?? 1);
  const [pointsLoss, setPointsLoss] = useState(season.pointsLoss ?? 0);
  const [pointsSetWon, setPointsSetWon] = useState(season.pointsSetWon ?? 2);

  // Manual adjustment modal
  const [adjustModal, setAdjustModal] = useState<{
    playerId: string;
    playerName: string;
    currentAdjustment: number;
    currentNote: string | null;
  } | null>(null);
  const [adjValue, setAdjValue] = useState(0);
  const [adjNote, setAdjNote] = useState("");
  const [savingAdj, setSavingAdj] = useState(false);

  const isEditing = mode === "edit" && canManage;
  const hasChanges = name !== season.name || allowDraws !== season.allowDraws || startDate !== (season.startDate || "") || endDate !== (season.endDate || "");
  const hasRankingChanges = rankingMode !== (season.rankingMode || "SUM") ||
    pointsWin !== (season.pointsWin ?? 3) ||
    pointsDraw !== (season.pointsDraw ?? 1) ||
    pointsLoss !== (season.pointsLoss ?? 0) ||
    pointsSetWon !== (season.pointsSetWon ?? 2);

  const inputClass = "w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors";
  const disabledClass = "w-full rounded-lg border border-border bg-surface-alt px-4 py-2.5 text-sm text-text opacity-80 cursor-default";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSeasonSettings(seasonId, {
        name,
        allowDraws,
        startDate: startDate || null,
        endDate: endDate || null,
        rankingMode,
        pointsWin,
        pointsDraw,
        pointsLoss,
        pointsSetWon,
      });
      toast.success("Época atualizada com sucesso!");
      router.refresh();
      setMode("view");
    } catch (err: any) {
      toast.error(err.message || "Erro ao guardar época.");
    }
    setSaving(false);
  };

  const handleCancelEdit = () => {
    setName(season.name);
    setAllowDraws(season.allowDraws);
    setStartDate(season.startDate || "");
    setEndDate(season.endDate || "");
    setRankingMode(season.rankingMode || "SUM");
    setPointsWin(season.pointsWin ?? 3);
    setPointsDraw(season.pointsDraw ?? 1);
    setPointsLoss(season.pointsLoss ?? 0);
    setPointsSetWon(season.pointsSetWon ?? 2);
    setMode("view");
  };

  const handleOpenAdjust = (playerId: string, playerName: string, currentAdjustment: number, currentNote: string | null) => {
    setAdjustModal({ playerId, playerName, currentAdjustment, currentNote });
    setAdjValue(currentAdjustment);
    setAdjNote(currentNote || "");
  };

  const handleSaveAdjust = async () => {
    if (!adjustModal) return;
    setSavingAdj(true);
    try {
      await adjustPlayerRanking(seasonId, adjustModal.playerId, adjValue, adjNote || null);
      toast.success(`Ajuste de ${adjValue > 0 ? "+" : ""}${adjValue} pts aplicado a ${adjustModal.playerName}`);
      router.refresh();
      setAdjustModal(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao ajustar ranking.");
    }
    setSavingAdj(false);
  };

  const handleClone = async () => {
    setSaving(true);
    try {
      const newSeason = await cloneSeason(seasonId);
      toast.success("Época duplicada com sucesso!");
      router.push(`/ligas/${leagueId}/epocas/${newSeason.id}`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao duplicar época.");
    }
    setSaving(false);
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>

          <div className="pt-14 flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Name & breadcrumb */}
            <div className="flex-1">
              <div className="flex items-center gap-2 text-xs text-text-muted mb-1 font-medium">
                <Link href="/ligas" className="hover:text-primary transition-colors">Ligas</Link>
                <span>&rsaquo;</span>
                <Link href={`/ligas/${leagueId}`} className="hover:text-primary transition-colors">{season.league.name}</Link>
                <span>&rsaquo;</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-extrabold tracking-tight">{season.name}</h1>
                <Badge variant={season.isActive ? "success" : "default"} pulse={season.isActive}>
                  {season.isActive ? "Ativa" : "Encerrada"}
                </Badge>
                {season.allowDraws && (
                  <Badge variant="warning">Empates</Badge>
                )}
                {isEditing && (
                  <Badge variant="warning">Modo Edição</Badge>
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-extrabold text-primary">{rankingRows.length}</p>
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Jogadores</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold text-text">{season.tournaments.length}</p>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-text-muted">Liga</p>
                  <Link href={`/ligas/${leagueId}`} className="text-sm font-medium text-text hover:text-primary transition-colors">{season.league.name}</Link>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-text-muted">Estado</p>
                  <p className="text-sm font-medium text-text">{season.isActive ? "Ativa" : "Encerrada"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-text-muted">Empates</p>
                  <p className="text-sm font-medium text-text">{season.allowDraws ? "Permitidos" : "Não permitidos"}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Sistema de Pontos */}
          <Card className="py-5 px-5">
            <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-4">Sistema de Pontos</h3>
            <div className="text-xs text-text-muted space-y-1.5 font-medium">
              <p><span className="text-text font-semibold">Set ganho:</span> +{season.pointsSetWon ?? 2} pts</p>
              <p><span className="text-text font-semibold">Vitória:</span> +{season.pointsWin ?? 3} pts</p>
              {season.allowDraws && <p><span className="text-text font-semibold">Empate:</span> +{season.pointsDraw ?? 1} pt</p>}
              {(season.pointsLoss ?? 0) !== 0 && <p><span className="text-text font-semibold">Derrota:</span> {season.pointsLoss > 0 ? "+" : ""}{season.pointsLoss} pts</p>}
              <div className="pt-2 mt-2 border-t border-border">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${(season.rankingMode || "SUM") === "AVERAGE" ? "bg-violet-100 text-violet-700" : "bg-primary/10 text-primary"}`}>
                    {(season.rankingMode || "SUM") === "AVERAGE" ? "MÉDIA" : "SOMA"}
                  </span>
                </div>
                <p className="text-[10px] text-text-muted/70">Desempate: {(season.rankingMode || "SUM") === "AVERAGE" ? "Méd" : "Pts"} &gt; Vitórias &gt; Dif. Sets &gt; Sets Ganhos &gt; Empates</p>
              </div>
            </div>
          </Card>

          {/* Quick Links */}
          <Card className="py-5 px-5">
            <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-4">Navegação</h3>
            <div className="space-y-1.5">
              {[
                { key: "ranking", label: "Ranking", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
                { key: "torneios", label: "Torneios", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveSection(item.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeSection === item.key
                      ? "bg-primary/10 text-primary"
                      : "text-text hover:bg-surface-hover"
                  }`}
                >
                  <span className={activeSection === item.key ? "text-primary" : "text-text-muted"}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
              {canManage && isEditing && (
                <button
                  onClick={handleClone}
                  disabled={saving}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-text hover:bg-surface-hover transition-colors"
                >
                  <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                  {saving ? "A duplicar..." : "Duplicar Época"}
                </button>
              )}
            </div>
          </Card>
        </div>

        {/* Right Content Area */}
        <div className="space-y-6">
          {/* ─── General Info (always visible when editing) ─── */}
          {isEditing && (
            <Card className="py-5 px-6">
              <h2 className="text-base font-bold mb-5 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Definições da Época
              </h2>
              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Nome da Época</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Empates</label>
                    <div className="flex items-center gap-2 h-[42px]">
                      <input
                        type="checkbox"
                        id="allowDrawsEdit"
                        checked={allowDraws}
                        onChange={(e) => setAllowDraws(e.target.checked)}
                        className="rounded border-border"
                      />
                      <label htmlFor="allowDrawsEdit" className="text-sm">Permitir empates</label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Data Início</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Data Fim</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
                  </div>
                </div>

                {/* Ranking Configuration */}
                <div className="pt-3 border-t border-border">
                  <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Sistema de Ranking
                  </h3>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-text-muted mb-1.5">Modo de Ranking</label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setRankingMode("SUM")}
                          className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                            rankingMode === "SUM"
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-surface text-text hover:bg-surface-hover"
                          }`}
                        >
                          <div className="font-semibold">Soma</div>
                          <div className="text-xs text-text-muted mt-0.5">Total de pontos acumulados</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRankingMode("AVERAGE")}
                          className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                            rankingMode === "AVERAGE"
                              ? "border-violet-500 bg-violet-50 text-violet-700"
                              : "border-border bg-surface text-text hover:bg-surface-hover"
                          }`}
                        >
                          <div className="font-semibold">Média</div>
                          <div className="text-xs text-text-muted mt-0.5">Pontos por jogo disputado</div>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1.5">Pts por Set Ganho</label>
                      <input type="number" min={0} max={99} value={pointsSetWon} onChange={(e) => setPointsSetWon(Number(e.target.value))} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1.5">Pts por Vitória</label>
                      <input type="number" min={0} max={99} value={pointsWin} onChange={(e) => setPointsWin(Number(e.target.value))} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1.5">Pts por Empate</label>
                      <input type="number" min={0} max={99} value={pointsDraw} onChange={(e) => setPointsDraw(Number(e.target.value))} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1.5">Pts por Derrota</label>
                      <input type="number" min={-99} max={99} value={pointsLoss} onChange={(e) => setPointsLoss(Number(e.target.value))} className={inputClass} />
                    </div>
                  </div>
                  {hasRankingChanges && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      Alterar a pontuação vai recalcular todo o ranking da época.
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={saving || (!hasChanges && !hasRankingChanges)}>
                    {saving ? "A guardar..." : "Guardar Alterações"}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* ─── Ranking Table ─── */}
          {activeSection === "ranking" && (
            <Card className="py-5 px-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Ranking Individual
                </h2>
                <ExportPDF title={`Ranking - ${season.name}`} rankings={rankingRows} />
              </div>
              {rankingRows.length === 0 ? (
                <EmptyState title="Sem dados" description="O ranking será preenchido após os primeiros torneios." />
              ) : (
                <RankingTable
                  rows={rankingRows}
                  rankingMode={season.rankingMode || "SUM"}
                  canManage={canManage}
                  onAdjust={canManage ? handleOpenAdjust : undefined}
                />
              )}
            </Card>
          )}

          {/* ─── Manual Adjustment Modal ─── */}
          {adjustModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setAdjustModal(null)}>
              <div className="bg-surface rounded-xl shadow-xl border border-border p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-1">Ajustar Ranking</h3>
                <p className="text-sm text-text-muted mb-5">
                  Ajuste manual de pontos para <span className="font-semibold text-text">{adjustModal.playerName}</span>
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Ajuste de Pontos</label>
                    <input
                      type="number"
                      value={adjValue}
                      onChange={(e) => setAdjValue(Number(e.target.value))}
                      className={inputClass}
                      placeholder="Ex: 5 ou -3"
                    />
                    <p className="text-xs text-text-muted mt-1">Valor positivo adiciona pontos, negativo remove.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Motivo (opcional)</label>
                    <input
                      type="text"
                      value={adjNote}
                      onChange={(e) => setAdjNote(e.target.value)}
                      className={inputClass}
                      placeholder="Ex: Penalização por ausência"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="secondary" onClick={() => setAdjustModal(null)}>Cancelar</Button>
                  <Button onClick={handleSaveAdjust} disabled={savingAdj}>
                    {savingAdj ? "A guardar..." : "Aplicar Ajuste"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ─── Torneios Table ─── */}
          {activeSection === "torneios" && (
            <Card className="py-5 px-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Torneios ({season.tournaments.length})
                </h2>
                {canManage && (
                  canCreateTournament ? (
                    <Link href={`/ligas/${leagueId}/epocas/${seasonId}/torneios/novo`}>
                      <Button size="sm">
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Novo Torneio
                      </Button>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button size="sm" disabled>Novo Torneio</Button>
                      <Link href="/planos" className="text-xs text-primary hover:underline font-semibold">
                        {tournamentLimitMessage} Upgrade
                      </Link>
                    </div>
                  )
                )}
              </div>
              {season.tournaments.length === 0 ? (
                <EmptyState title="Sem torneios" description="Crie um torneio para começar a jogar." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Torneio</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Equipas</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Jogos</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Estado</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {season.tournaments.map((t: any) => {
                        const s = statusLabels[t.status] || statusLabels.DRAFT;
                        return (
                          <tr key={t.id} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
                            <td className="py-3 px-4 font-semibold">{t.name}</td>
                            <td className="py-3 px-4 text-center text-text-muted">{t._count?.teams ?? 0}</td>
                            <td className="py-3 px-4 text-center text-text-muted">{t._count?.matches ?? 0}</td>
                            <td className="py-3 px-4 text-center">
                              <Badge variant={s.variant} pulse={t.status === "RUNNING"}>
                                {s.label}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Link href={`/torneios/${t.id}`}>
                                <Button size="sm" variant="ghost" className="text-xs">Ver</Button>
                              </Link>
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
        </div>
      </div>
    </div>
  );
}
