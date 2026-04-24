"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ScheduleView } from "./schedule-view";
import { TournamentActions } from "./actions-client";
import { PlayerManagement } from "@/components/player-management";
import { ExportCalendar } from "@/components/export-calendar";
import { PlayerSwap } from "./player-swap";
import { OcrResultsUpload } from "@/components/ocr-results-upload";
import { GroupStandings } from "@/components/group-standings";
import { BracketView } from "@/components/bracket-view";
import { AdvanceToKnockoutButton } from "./advance-knockout-button";
import { AmericanoStandings, type AmericanoPlayer } from "@/components/americano-standings";
import { SobeDesceCourtMap, type SobeDesceCourtInfo } from "@/components/sobe-desce-view";
import { NonstopView, type NonstopQueueEntry, type NonstopActiveMatch } from "@/components/nonstop-view";
import { LadderView, type LadderPlayer, type LadderChallengeInfo } from "@/components/ladder-view";
import { PhotoGallery } from "@/components/photo-gallery";
import { PlayerAvailabilityView } from "@/components/player-availability";
import { TournamentChat } from "@/components/tournament-chat";
import { getAmericanoStandings, generateNextAmericanoRoundAction, getSobeDesceStandings, generateNextSobeDesceRoundAction, getNonstopQueueStatus, joinNonstopQueue, leaveNonstopQueue, rejoinNonstopQueue, getLadderStatus, createLadderChallenge, acceptLadderChallenge, declineLadderChallenge, getTournamentPhotos, uploadTournamentPhoto, deleteTournamentPhoto, getTournamentPhoto, setTournamentPlayerAvailability, getTournamentPlayerAvailabilities, getMyTournamentAvailability, sendChatMessage, getChatMessages, deleteChatMessage } from "@/lib/actions";
import { getTournamentPayments, markPaymentManual, type TournamentPaymentInfo } from "@/lib/actions/payment-actions";
import { FinalResultsManager } from "@/components/final-results-manager";
import { getFinalResults } from "@/lib/actions/final-result-actions";

const statusLabels: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "info" }
> = {
  DRAFT: { label: "Rascunho", variant: "default" },
  PUBLISHED: { label: "Publicado", variant: "info" },
  RUNNING: { label: "A decorrer", variant: "warning" },
  FINISHED: { label: "Terminado", variant: "success" },
};

type Props = {
  tournament: any;
  canManage: boolean;
  adminUser: boolean;
  currentUserId: string | null;
  currentPlayerId: string | null;
  pendingSubmissionsMap: Record<string, any>;
  totalMatches: number;
  finishedMatches: number;
  groupStandings: any[];
};

export function TournamentDetailContent({
  tournament,
  canManage,
  adminUser,
  currentUserId,
  currentPlayerId,
  pendingSubmissionsMap,
  totalMatches,
  finishedMatches,
  groupStandings,
}: Props) {
  const [activeSection, setActiveSection] = useState<string>(
    tournament.status === "FINISHED" && tournament.teamMode !== "LADDER" ? "ranking" :
    tournament.teamMode === "LADDER" ? "escada" : tournament.teamMode === "NONSTOP" ? "nonstop" : tournament.teamMode === "AMERICANO" ? "americano" : tournament.teamMode === "SOBE_DESCE" ? "sobedesce" : "calendario"
  );
  const [finalStandings, setFinalStandings] = useState<AmericanoPlayer[]>([]);
  const [americanoStandings, setAmericanoStandings] = useState<AmericanoPlayer[]>([]);
  const [americanoLoading, setAmericanoLoading] = useState(false);
  const [americanoError, setAmericanoError] = useState<string | null>(null);
  const [generatingRound, setGeneratingRound] = useState(false);
  const [sobeDesceStandings, setSobeDesceStandings] = useState<AmericanoPlayer[]>([]);
  const [sobeDesceError, setSobeDesceError] = useState<string | null>(null);

  // Ladder state
  const [ladderPositions, setLadderPositions] = useState<LadderPlayer[]>([]);
  const [ladderChallenges, setLadderChallenges] = useState<LadderChallengeInfo[]>([]);

  // Nonstop state
  const [nonstopQueue, setNonstopQueue] = useState<NonstopQueueEntry[]>([]);
  const [nonstopActiveMatches, setNonstopActiveMatches] = useState<NonstopActiveMatch[]>([]);
  const [nonstopAvailableCourts, setNonstopAvailableCourts] = useState(0);
  const [nonstopStandings, setNonstopStandings] = useState<AmericanoPlayer[]>([]);

  // Photo gallery state
  const [photos, setPhotos] = useState<{ id: string; thumbnailData: string | null; caption: string | null; createdAt: string }[]>([]);

  // Player availability state
  const [availabilityEntries, setAvailabilityEntries] = useState<{ playerId: string; playerName: string; status: string; note: string | null }[]>([]);
  const [myAvailabilityStatus, setMyAvailabilityStatus] = useState<string | null>(null);

  // Final results state (Sobe e Desce position-based scoring)
  const [finalResults, setFinalResults] = useState<any[]>([]);
  const [finalResultsLoaded, setFinalResultsLoaded] = useState(false);

  // Payment state
  const [payments, setPayments] = useState<TournamentPaymentInfo[]>([]);
  const [paymentsLoaded, setPaymentsLoaded] = useState(false);
  const [markingManual, setMarkingManual] = useState<string | null>(null);

  // Load photos on mount
  React.useEffect(() => {
    getTournamentPhotos(tournament.id).then(setPhotos).catch(() => {});
  }, [tournament.id]);

  // Load availability data on mount
  React.useEffect(() => {
    if (tournament.status !== "FINISHED") {
      getTournamentPlayerAvailabilities(tournament.id).then(setAvailabilityEntries).catch(() => {});
      getMyTournamentAvailability(tournament.id).then((data) => {
        setMyAvailabilityStatus(data?.status ?? null);
      }).catch(() => {});
    }
  }, [tournament.id, tournament.status]);

  // Load final results for Sobe e Desce tournaments
  React.useEffect(() => {
    if (tournament.teamMode === "SOBE_DESCE") {
      getFinalResults(tournament.id).then((data) => {
        setFinalResults(data);
        setFinalResultsLoaded(true);
      }).catch(() => { setFinalResultsLoaded(true); });
    }
  }, [tournament.id, tournament.teamMode]);

  // Load payment data on mount
  React.useEffect(() => {
    if (tournament.requiresPayment) {
      getTournamentPayments(tournament.id).then((data) => {
        setPayments(data);
        setPaymentsLoaded(true);
      }).catch(() => { setPaymentsLoaded(true); });
    }
  }, [tournament.id, tournament.requiresPayment]);

  // Load Americano standings on mount
  React.useEffect(() => {
    if (tournament.teamMode === "AMERICANO" && tournament.rounds.length > 0) {
      getAmericanoStandings(tournament.id).then((data) => {
        setAmericanoStandings(data);
      }).catch(() => {});
    }
  }, [tournament.id, tournament.teamMode, tournament.rounds.length]);

  // Load final ranking standings when tournament is finished
  React.useEffect(() => {
    if (tournament.status === "FINISHED" && tournament.teamMode !== "LADDER" && tournament.rounds.length > 0) {
      getAmericanoStandings(tournament.id).then((data) => {
        setFinalStandings(data);
      }).catch(() => {});
    }
  }, [tournament.id, tournament.status, tournament.teamMode, tournament.rounds.length]);

  // Load Sobe e Desce standings on mount
  React.useEffect(() => {
    if (tournament.teamMode === "SOBE_DESCE" && tournament.rounds.length > 0) {
      getSobeDesceStandings(tournament.id).then((data) => {
        setSobeDesceStandings(data);
      }).catch(() => {});
    }
  }, [tournament.id, tournament.teamMode, tournament.rounds.length]);

  // Load Nonstop queue data on mount + polling
  const loadNonstopData = React.useCallback(async () => {
    if (tournament.teamMode !== "NONSTOP") return;
    try {
      const data = await getNonstopQueueStatus(tournament.id);
      setNonstopQueue(data.queue);
      setNonstopActiveMatches(data.activeMatches);
      setNonstopAvailableCourts(data.availableCourts);
      setNonstopStandings(data.standings);
    } catch {}
  }, [tournament.id, tournament.teamMode]);

  React.useEffect(() => {
    if (tournament.teamMode !== "NONSTOP") return;
    loadNonstopData();
    const interval = setInterval(loadNonstopData, 10000);
    return () => clearInterval(interval);
  }, [tournament.teamMode, loadNonstopData]);

  // Load Ladder data on mount
  React.useEffect(() => {
    if (tournament.teamMode === "LADDER") {
      getLadderStatus(tournament.id).then((status) => {
        setLadderPositions(status.positions);
        setLadderChallenges(status.challenges);
      }).catch(() => {});
    }
  }, [tournament.id, tournament.teamMode]);

  // Check if current round is all finished (for Americano "next round" button)
  const americanoCurrentRoundFinished = tournament.teamMode === "AMERICANO" && tournament.rounds.length > 0
    ? tournament.rounds[tournament.rounds.length - 1]?.matches?.every((m: any) => m.status === "FINISHED") ?? false
    : false;
  const americanoMaxRounds = tournament.numberOfRounds || 999;
  const americanoCanGenerateNext = tournament.teamMode === "AMERICANO"
    && americanoCurrentRoundFinished
    && tournament.rounds.length < americanoMaxRounds
    && tournament.status !== "FINISHED";

  // Check if current round is all finished (for Sobe e Desce "next round" button)
  const sobeDesceCurrentRoundFinished = tournament.teamMode === "SOBE_DESCE" && tournament.rounds.length > 0
    ? tournament.rounds[tournament.rounds.length - 1]?.matches?.every((m: any) => m.status === "FINISHED") ?? false
    : false;
  const sobeDesceMaxRounds = tournament.numberOfRounds || 999;
  const sobeDesceCanGenerateNext = tournament.teamMode === "SOBE_DESCE"
    && sobeDesceCurrentRoundFinished
    && tournament.rounds.length < sobeDesceMaxRounds
    && tournament.status !== "FINISHED";

  const handleGenerateNextRound = async () => {
    setGeneratingRound(true);
    setAmericanoError(null);
    try {
      await generateNextAmericanoRoundAction(tournament.id);
      window.location.reload();
    } catch (err: any) {
      setAmericanoError(err?.message || "Erro ao gerar próxima ronda.");
    } finally {
      setGeneratingRound(false);
    }
  };

  const handleGenerateNextSobeDesceRound = async () => {
    setGeneratingRound(true);
    setSobeDesceError(null);
    try {
      await generateNextSobeDesceRoundAction(tournament.id);
      window.location.reload();
    } catch (err: any) {
      setSobeDesceError(err?.message || "Erro ao gerar próxima ronda.");
    } finally {
      setGeneratingRound(false);
    }
  };

  const s = statusLabels[tournament.status] || statusLabels.DRAFT;
  const progressPct = totalMatches > 0 ? Math.round((finishedMatches / totalMatches) * 100) : 0;

  // Unique players for PlayerSwap
  const swapPlayers = (() => {
    const seen = new Set<string>();
    const result: { id: string; fullName: string; nickname: string | null }[] = [];
    for (const team of tournament.teams) {
      if (team.player1 && !seen.has(team.player1.id)) {
        seen.add(team.player1.id);
        result.push({ id: team.player1.id, fullName: team.player1.fullName, nickname: team.player1.nickname });
      }
      if (team.player2 && !seen.has(team.player2.id)) {
        seen.add(team.player2.id);
        result.push({ id: team.player2.id, fullName: team.player2.fullName, nickname: team.player2.nickname });
      }
    }
    return result.sort((a, b) => (a.nickname || a.fullName).localeCompare(b.nickname || b.fullName));
  })();

  // Inscriptions suplentes
  const suplentes = tournament.inscriptions?.filter(
    (i: any) => i.status === "SUPLENTE" || i.status === "PROMOVIDO" || i.status === "DESISTIU"
  ) || [];

  // Group knockout data
  const knockoutMatches = tournament.format === "GROUP_KNOCKOUT"
    ? tournament.rounds.flatMap((r: any) => r.matches).filter((m: any) => m.bracketPhase && m.bracketPhase !== "GROUP")
    : [];
  const groupMatches = tournament.format === "GROUP_KNOCKOUT"
    ? tournament.rounds.flatMap((r: any) => r.matches).filter((m: any) => m.bracketPhase === "GROUP" || !m.bracketPhase)
    : [];
  const allGroupsFinished = groupMatches.length > 0 && groupMatches.every((m: any) => m.status === "FINISHED");
  const isGroupPhase = tournament.currentPhase === "GROUPS";

  // Build sidebar nav items
  const navItems: { key: string; label: string; icon: React.ReactNode }[] = [
    {
      key: "calendario",
      label: "Calendário",
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    },
  ];

  if (tournament.status === "FINISHED" && tournament.teamMode !== "LADDER") {
    navItems.push({
      key: "ranking",
      label: "Ranking Final",
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
    });
  }

  if (tournament.teamMode === "NONSTOP") {
    navItems.push({
      key: "nonstop",
      label: "Nonstop",
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    });
  }

  if (tournament.teamMode === "AMERICANO") {
    navItems.push({
      key: "americano",
      label: "Ranking Americano",
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    });
  }

  if (tournament.teamMode === "SOBE_DESCE") {
    navItems.push({
      key: "sobedesce",
      label: "Sobe e Desce",
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>,
    });
    navItems.push({
      key: "classificacao-final",
      label: "Classificação Final",
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
    });
  }

  if (tournament.teamMode === "LADDER") {
    navItems.push({
      key: "escada",
      label: "Escada",
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
    });
  }

  if (tournament.format === "GROUP_KNOCKOUT") {
    navItems.push({
      key: "grupos",
      label: "Grupos & Eliminatórias",
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    });
  }

  if (suplentes.length > 0) {
    navItems.push({
      key: "inscricoes",
      label: "Inscrições",
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    });
  }

  if (canManage && tournament.inscriptions && tournament.inscriptions.length > 0) {
    navItems.push({
      key: "jogadores",
      label: "Gestão Jogadores",
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    });
  }

  if (tournament.status !== "FINISHED") {
    navItems.push({
      key: "disponibilidade",
      label: "Disponibilidade",
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    });
  }

  if (tournament.requiresPayment) {
    navItems.push({
      key: "pagamentos",
      label: "Pagamentos",
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    });
  }

  navItems.push({
    key: "chat",
    label: "Chat",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
  });

  navItems.push({
    key: "fotos",
    label: "Fotos",
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ─── Top Header Card ─── */}
      <div className="rounded-lg shadow-card bg-surface border border-border overflow-hidden">
        <div className="h-28" style={{ background: "linear-gradient(to right, #5766da, #7c6fe0, #a78bfa)" }} />

        <div className="px-6 pb-6 relative">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border-4 border-surface absolute -top-10 left-6" style={{ background: "linear-gradient(to bottom right, #5766da, #8b9cf7)" }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          <div className="pt-14 flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Name & breadcrumb */}
            <div className="flex-1">
              <div className="flex items-center gap-2 text-xs text-text-muted mb-1 font-medium">
                <Link href="/ligas" className="hover:text-primary transition-colors">Ligas</Link>
                {tournament.league && (<><span>&rsaquo;</span>
                <Link href={`/ligas/${tournament.leagueId}`} className="hover:text-primary transition-colors">{tournament.league.name}</Link></>)}
                {tournament.season && (<><span>&rsaquo;</span>
                <Link href={`/ligas/${tournament.leagueId}/epocas/${tournament.seasonId}`} className="hover:text-primary transition-colors">{tournament.season.name}</Link></>)}
                <span>&rsaquo;</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-extrabold tracking-tight">{tournament.name}</h1>
                <Badge variant={s.variant} pulse={tournament.status === "RUNNING"}>
                  {s.label}
                </Badge>
              </div>
              {tournament.startDate && (
                <p className="text-sm text-text-muted mt-1 flex items-center gap-1.5 font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {new Date(tournament.startDate).toLocaleDateString("pt-PT", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                </p>
              )}
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-extrabold text-primary">
                  {tournament.teamMode === "RANDOM_PER_ROUND" || tournament.teamMode === "AMERICANO" || tournament.teamMode === "SOBE_DESCE" || tournament.teamMode === "NONSTOP" || tournament.teamMode === "LADDER"
                    ? swapPlayers.length
                    : tournament.teams.length}
                </p>
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  {tournament.teamSize === 1 ? "Jogadores" : "Equipas"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold text-text">{totalMatches}</p>
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Jogos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold text-text">{tournament.courtsCount}</p>
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Campos</p>
              </div>
            </div>

            {/* TV Mode link */}
            {tournament.rounds?.length > 0 && (
              <Link
                href={`/tv/${tournament.id}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-primary transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Modo TV
              </Link>
            )}

            {/* Print/Export link */}
            {tournament.rounds?.length > 0 && (
              <Link
                href={`/imprimir/${tournament.id}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-primary transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir
              </Link>
            )}

            {/* Edit link */}
            {canManage && (tournament.status === "DRAFT" || (tournament.status !== "FINISHED" && finishedMatches === 0)) && (
              <Link href={`/torneios/${tournament.id}/editar`}>
                <Button size="sm" className="gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar
                </Button>
              </Link>
            )}
          </div>

          {/* Progress bar */}
          {totalMatches > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-text-muted">Progresso</span>
                <span className="text-xs font-bold text-text tabular-nums">{finishedMatches}/{totalMatches} jogos ({progressPct}%)</span>
              </div>
              <div className="w-full bg-surface-hover rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-primary to-primary-light rounded-full h-2.5 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-text-muted">Formato</p>
                  <p className="text-sm font-medium text-text">
                    {tournament.teamSize === 1 ? "1v1" : "2v2"} &middot; {tournament.teamMode === "LADDER" ? "Escada" : tournament.teamMode === "NONSTOP" ? "Nonstop" : tournament.teamMode === "AMERICANO" ? "Americano" : tournament.teamMode === "SOBE_DESCE" ? "Sobe e Desce" : tournament.teamMode === "RANDOM_PER_ROUND" ? "Aleatórias" : tournament.teamMode === "RANKED_SPLIT" ? "Ranked Split" : "Fixas"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-text-muted">Sets</p>
                  <p className="text-sm font-medium text-text">
                    {tournament.numberOfSets === 1 ? "1 Set" : tournament.numberOfSets === 2 ? "2 Sets" : "Melhor de 3"}
                  </p>
                </div>
              </div>
              {(tournament.teamMode === "RANDOM_PER_ROUND" || tournament.teamMode === "AMERICANO" || tournament.teamMode === "SOBE_DESCE") && tournament.teamMode !== "NONSTOP" && (
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-text-muted">Rondas</p>
                    <p className="text-sm font-medium text-text">
                      {tournament.numberOfRounds || tournament.rounds.length} rondas
                    </p>
                  </div>
                </div>
              )}
              {tournament.format === "GROUP_KNOCKOUT" && (
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-text-muted">Fase</p>
                    <p className="text-sm font-medium text-text">
                      {tournament.currentPhase === "GROUPS" ? "Fase de Grupos" : tournament.currentPhase === "KNOCKOUT" ? "Eliminatórias" : "Terminado"}
                    </p>
                  </div>
                </div>
              )}
              {tournament.requiresPayment && tournament.inscriptionFee && (
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-text-muted">Inscrição</p>
                    <p className="text-sm font-medium text-text">{tournament.inscriptionFee.toFixed(2)} €</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Navigation */}
          <Card className="py-5 px-5">
            <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-4">Navegação</h3>
            <div className="space-y-1.5">
              {navItems.map((item) => (
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
            </div>
          </Card>

          {/* Management Actions */}
          {canManage && (
            <Card className="py-5 px-5">
              <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-4">Ações</h3>
              <div className="space-y-2">
                <TournamentActions
                  tournamentId={tournament.id}
                  status={tournament.status}
                  leagueId={tournament.leagueId}
                  seasonId={tournament.seasonId}
                  hasResults={finishedMatches > 0}
                  finishedMatches={finishedMatches}
                  totalMatches={totalMatches}
                />
              </div>
            </Card>
          )}

          {/* Quick Links */}
          <Card className="py-5 px-5">
            <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-4">Ligações</h3>
            <div className="space-y-1.5">
              {tournament.league && (
              <Link
                href={`/ligas/${tournament.leagueId}`}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-text hover:bg-surface-hover transition-colors"
              >
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {tournament.league.name}
              </Link>
              )}
              {tournament.season && (
              <Link
                href={`/ligas/${tournament.leagueId}/epocas/${tournament.seasonId}`}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-text hover:bg-surface-hover transition-colors"
              >
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {tournament.season.name}
              </Link>
              )}
              {tournament.status !== "FINISHED" && (
                <Link
                  href={`/torneios/${tournament.id}/placar`}
                  target="_blank"
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-text hover:bg-surface-hover transition-colors"
                >
                  <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="2" y="3" width="20" height="18" rx="2" strokeWidth="2"/>
                    <path d="M12 3v18M2 12h20" strokeWidth="2"/>
                  </svg>
                  Placar de Jogo
                </Link>
              )}
            </div>
          </Card>
        </div>

        {/* Right Content Area */}
        <div className="space-y-6">
          {/* ─── Player Swap (admin only — available even on finished tournaments to fix data) ─── */}
          {adminUser && swapPlayers.length > 0 && (
            <PlayerSwap
              tournamentId={tournament.id}
              players={swapPlayers}
            />
          )}

          {/* ─── OCR Results Upload ─── */}
          {canManage && tournament.status !== "FINISHED" && tournament.rounds.length > 0 && activeSection === "calendario" && (
            <OcrResultsUpload
              tournamentId={tournament.id}
              matches={tournament.rounds.flatMap((r: any) =>
                r.matches.map((m: any) => ({
                  id: m.id,
                  roundIndex: r.index,
                  courtName: m.court?.name || "",
                  teamAName: m.teamA.name,
                  teamBName: m.teamB.name,
                  status: m.status,
                }))
              )}
              numberOfSets={tournament.numberOfSets}
              courts={tournament.courts?.map((c: any) => ({ id: c.id, name: c.name })) || []}
            />
          )}

          {/* ─── Export Calendar ─── */}
          {tournament.rounds.length > 0 && activeSection === "calendario" && (
            <ExportCalendar
              tournamentName={tournament.name}
              startDate={tournament.startDate ? tournament.startDate.toString() : null}
              matches={tournament.rounds.flatMap((r: any) =>
                r.matches.map((m: any) => ({
                  team1Name: m.teamA.name,
                  team2Name: m.teamB.name,
                  courtName: m.court?.name,
                  roundIndex: r.index,
                }))
              )}
            />
          )}

          {/* ─── Schedule Section ─── */}
          {activeSection === "calendario" && (
            <Card className="py-5 px-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Calendário
                </h2>
              </div>
              {tournament.rounds.length === 0 ? (
                <EmptyState
                  title="Sem calendário"
                  description="Gere o calendário para começar a registar resultados."
                />
              ) : (
                <ScheduleView
                  rounds={tournament.rounds}
                  numberOfSets={tournament.numberOfSets}
                  canManage={canManage && tournament.status !== "FINISHED"}
                  startDate={tournament.startDate ? tournament.startDate.toString() : null}
                  currentPlayerId={currentPlayerId ?? undefined}
                  currentUserId={currentUserId ?? undefined}
                  pendingSubmissionsMap={pendingSubmissionsMap}
                  tournamentName={tournament.name}
                  seasonName={tournament.season?.name ?? ""}
                  tournamentId={tournament.id}
                  teams={tournament.teams}
                  teamMode={tournament.teamMode}
                  numberOfRounds={tournament.numberOfRounds ?? undefined}
                />
              )}
            </Card>
          )}

          {/* ─── Americano Section ─── */}
          {activeSection === "americano" && tournament.teamMode === "AMERICANO" && (
            <div className="space-y-4">
              <AmericanoStandings players={americanoStandings} />

              {canManage && americanoCanGenerateNext && (
                <Card className="py-5 px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold">Ronda {tournament.rounds.length + 1}</h3>
                      <p className="text-xs text-text-muted mt-0.5">
                        Todos os jogos da ronda {tournament.rounds.length} estão terminados. Gere a próxima ronda com base no ranking atual.
                      </p>
                    </div>
                    <Button
                      onClick={handleGenerateNextRound}
                      disabled={generatingRound}
                      className="gap-1.5"
                    >
                      {generatingRound ? (
                        "A gerar..."
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Gerar Próxima Ronda
                        </>
                      )}
                    </Button>
                  </div>
                  {americanoError && (
                    <p className="text-xs text-red-600 mt-2">{americanoError}</p>
                  )}
                </Card>
              )}

              {americanoStandings.length === 0 && tournament.rounds.length === 0 && (
                <Card className="py-5 px-6">
                  <EmptyState
                    title="Sem dados"
                    description="Os dados aparecerão após gerar o calendário."
                  />
                </Card>
              )}
            </div>
          )}

          {/* ─── Sobe e Desce Section ─── */}
          {activeSection === "sobedesce" && tournament.teamMode === "SOBE_DESCE" && (
            <div className="space-y-4">
              {/* Court Map for latest round */}
              {tournament.rounds.length > 0 && (() => {
                const lastRound = tournament.rounds[tournament.rounds.length - 1];
                const courtInfos: SobeDesceCourtInfo[] = [];
                const courtMap = new Map<string, { name: string; index: number }>();
                const tournamentCourts = tournament.tournamentCourts?.length > 0
                  ? tournament.tournamentCourts.map((tc: any) => tc.court)
                  : tournament.courts || [];
                tournamentCourts.forEach((c: any, idx: number) => {
                  courtMap.set(c.id, { name: c.name, index: idx });
                });
                // Group players by court from last round matches
                const courtPlayers = new Map<number, { id: string; name: string }[]>();
                for (const match of lastRound.matches) {
                  const ci = match.court ? (courtMap.get(match.court.id)?.index ?? 0) : 0;
                  if (!courtPlayers.has(ci)) courtPlayers.set(ci, []);
                  const players = courtPlayers.get(ci)!;
                  if (match.teamA?.player1) players.push({ id: match.teamA.player1.id, name: match.teamA.player1.nickname || match.teamA.player1.fullName });
                  if (match.teamA?.player2) players.push({ id: match.teamA.player2.id, name: match.teamA.player2.nickname || match.teamA.player2.fullName });
                  if (match.teamB?.player1) players.push({ id: match.teamB.player1.id, name: match.teamB.player1.nickname || match.teamB.player1.fullName });
                  if (match.teamB?.player2) players.push({ id: match.teamB.player2.id, name: match.teamB.player2.nickname || match.teamB.player2.fullName });
                }
                const numCourts = courtPlayers.size;
                for (const [ci, players] of courtPlayers) {
                  const courtInfo = tournamentCourts[ci];
                  courtInfos.push({
                    courtName: courtInfo?.name || `Campo ${ci + 1}`,
                    courtIndex: ci,
                    players,
                    isTopCourt: ci === 0,
                    isBottomCourt: ci === numCourts - 1,
                  });
                }
                return <SobeDesceCourtMap courts={courtInfos} />;
              })()}

              <AmericanoStandings players={sobeDesceStandings} />

              {canManage && sobeDesceCanGenerateNext && (
                <Card className="py-5 px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold">Ronda {tournament.rounds.length + 1}</h3>
                      <p className="text-xs text-text-muted mt-0.5">
                        Todos os jogos da ronda {tournament.rounds.length} estão terminados. Gere a próxima ronda — vencedores sobem, perdedores descem.
                      </p>
                    </div>
                    <Button
                      onClick={handleGenerateNextSobeDesceRound}
                      disabled={generatingRound}
                      className="gap-1.5"
                    >
                      {generatingRound ? (
                        "A gerar..."
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Gerar Próxima Ronda
                        </>
                      )}
                    </Button>
                  </div>
                  {sobeDesceError && (
                    <p className="text-xs text-red-600 mt-2">{sobeDesceError}</p>
                  )}
                </Card>
              )}

              {sobeDesceStandings.length === 0 && tournament.rounds.length === 0 && (
                <Card className="py-5 px-6">
                  <EmptyState
                    title="Sem dados"
                    description="Os dados aparecerão após gerar o calendário."
                  />
                </Card>
              )}
            </div>
          )}

          {/* ─── Sobe e Desce - Classificação Final Section ─── */}
          {activeSection === "classificacao-final" && tournament.teamMode === "SOBE_DESCE" && (
            <Card className="py-5 px-6">
              {finalResultsLoaded ? (
                <FinalResultsManager
                  tournamentId={tournament.id}
                  inscriptions={tournament.inscriptions || []}
                  teamSize={tournament.teamSize}
                  canManage={canManage}
                  existingResults={finalResults}
                />
              ) : (
                <p className="text-sm text-text-muted">A carregar classificação final...</p>
              )}
            </Card>
          )}

          {/* ─── Nonstop Section ─── */}
          {activeSection === "nonstop" && tournament.teamMode === "NONSTOP" && (
            <div className="space-y-4">
              <NonstopView
                queue={nonstopQueue}
                activeMatches={nonstopActiveMatches}
                availableCourts={nonstopAvailableCourts}
                currentPlayerInQueue={nonstopQueue.some((e) => e.playerId === currentPlayerId)}
                currentPlayerPlaying={false}
                onJoinQueue={async () => {
                  await joinNonstopQueue(tournament.id);
                  await loadNonstopData();
                }}
                onLeaveQueue={async () => {
                  await leaveNonstopQueue(tournament.id);
                  await loadNonstopData();
                }}
                onRejoinQueue={async () => {
                  await rejoinNonstopQueue(tournament.id);
                  await loadNonstopData();
                }}
              />

              {nonstopStandings.length > 0 && (
                <AmericanoStandings players={nonstopStandings} />
              )}

              {nonstopStandings.length === 0 && nonstopQueue.length === 0 && nonstopActiveMatches.length === 0 && (
                <Card className="py-5 px-6">
                  <EmptyState
                    title="Sem dados"
                    description="Entre na fila para começar a jogar."
                  />
                </Card>
              )}
            </div>
          )}

          {/* ─── Ladder (Escada) Section ─── */}
          {activeSection === "escada" && tournament.teamMode === "LADDER" && (
            <LadderView
              positions={ladderPositions}
              challenges={ladderChallenges}
              currentPlayerId={currentPlayerId}
              canManage={canManage}
              onChallenge={async (defenderId) => {
                await createLadderChallenge(tournament.id, defenderId);
                const status = await getLadderStatus(tournament.id);
                setLadderPositions(status.positions);
                setLadderChallenges(status.challenges);
              }}
              onAccept={async (challengeId) => {
                await acceptLadderChallenge(challengeId);
                const status = await getLadderStatus(tournament.id);
                setLadderPositions(status.positions);
                setLadderChallenges(status.challenges);
              }}
              onDecline={async (challengeId) => {
                await declineLadderChallenge(challengeId);
                const status = await getLadderStatus(tournament.id);
                setLadderPositions(status.positions);
                setLadderChallenges(status.challenges);
              }}
            />
          )}

          {/* ─── Group Knockout Section ─── */}
          {activeSection === "grupos" && tournament.format === "GROUP_KNOCKOUT" && (
            <div className="space-y-6">
              {/* Group Standings */}
              {groupStandings.length > 0 && (
                <GroupStandings
                  groups={groupStandings}
                  teamsAdvancing={tournament.teamsAdvancing || 1}
                />
              )}

              {/* Advance to Knockout button */}
              {canManage && isGroupPhase && allGroupsFinished && knockoutMatches.length === 0 && (
                <AdvanceToKnockoutButton tournamentId={tournament.id} />
              )}

              {/* Bracket View */}
              {knockoutMatches.length > 0 && (
                <BracketView matches={knockoutMatches} />
              )}

              {groupStandings.length === 0 && knockoutMatches.length === 0 && (
                <Card className="py-5 px-6">
                  <EmptyState
                    title="Sem dados de grupo"
                    description="Os dados aparecerão após gerar o calendário."
                  />
                </Card>
              )}
            </div>
          )}

          {/* ─── Inscriptions Section ─── */}
          {activeSection === "inscricoes" && suplentes.length > 0 && (
            <Card className="py-5 px-6">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Inscrições ({tournament.inscriptions.length})
              </h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {tournament.inscriptions.map((insc: any, idx: number) => (
                  <div
                    key={insc.id}
                    className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm ${
                      insc.status === "DESISTIU" ? "bg-red-50 line-through text-text-muted" : "bg-surface-alt"
                    }`}
                  >
                    <span className={insc.status === "DESISTIU" ? "text-text-muted" : "font-semibold"}>
                      {insc.player.nickname || insc.player.fullName.split(" ")[0]}
                    </span>
                    <Badge
                      variant={
                        insc.status === "TITULAR" ? "success"
                          : insc.status === "PROMOVIDO" ? "success"
                          : insc.status === "SUPLENTE" ? "warning"
                          : "default"
                      }
                    >
                      {insc.status === "TITULAR" ? "Titular"
                        : insc.status === "PROMOVIDO" ? "Promovido"
                        : insc.status === "SUPLENTE" ? `Suplente #${idx - tournament.inscriptions.filter((x: any) => x.status === "TITULAR" || x.status === "PROMOVIDO").length + 1}`
                        : "Desistiu"}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ─── Player Management Section ─── */}
          {activeSection === "jogadores" && canManage && tournament.inscriptions && tournament.inscriptions.length > 0 && (
            <Card className="py-5 px-6">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Gestão de Jogadores
              </h2>
              <PlayerManagement
                tournamentId={tournament.id}
                inscriptions={tournament.inscriptions}
                readOnly={tournament.status === "FINISHED"}
              />
            </Card>
          )}

          {/* ─── Player Availability Section ─── */}
          {activeSection === "disponibilidade" && tournament.status !== "FINISHED" && (
            <Card className="py-5 px-6">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Disponibilidade
              </h2>
              <PlayerAvailabilityView
                entries={availabilityEntries}
                myStatus={myAvailabilityStatus}
                canRespond={!!currentPlayerId}
                isManager={canManage}
                onSetStatus={async (status, note) => {
                  await setTournamentPlayerAvailability(
                    tournament.id,
                    status as "AVAILABLE" | "UNAVAILABLE" | "MAYBE",
                    note
                  );
                  setMyAvailabilityStatus(status);
                  const updated = await getTournamentPlayerAvailabilities(tournament.id);
                  setAvailabilityEntries(updated);
                }}
              />
            </Card>
          )}

          {/* ─── Final Ranking Section ─── */}
          {activeSection === "ranking" && tournament.status === "FINISHED" && (
            <Card className="py-5 px-6">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Ranking Final
              </h2>
              {tournament.teamMode === "SOBE_DESCE" && finalResultsLoaded ? (
                finalResults.length > 0 ? (
                  <FinalResultsManager
                    tournamentId={tournament.id}
                    inscriptions={tournament.inscriptions || []}
                    teamSize={tournament.teamSize}
                    canManage={canManage}
                    existingResults={finalResults}
                  />
                ) : (
                  <p className="text-sm text-text-muted">A classificação final ainda não foi reportada.</p>
                )
              ) : finalStandings.length > 0 ? (
                <AmericanoStandings players={finalStandings} />
              ) : (
                <p className="text-sm text-text-muted">Sem dados de ranking.</p>
              )}
            </Card>
          )}

          {/* ─── Chat Section ─── */}
          {activeSection === "chat" && (
            <Card className="py-5 px-6">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chat do Torneio
              </h2>
              <TournamentChat
                tournamentId={tournament.id}
                currentPlayerId={currentPlayerId}
                canManage={canManage}
                onSend={async (message) => {
                  return await sendChatMessage(tournament.id, message);
                }}
                onDelete={async (messageId) => {
                  await deleteChatMessage(messageId);
                }}
                onLoadMessages={async (limit, before) => {
                  return await getChatMessages(tournament.id, limit, before);
                }}
              />
            </Card>
          )}

          {/* ─── Payments Section ─── */}
          {activeSection === "pagamentos" && tournament.requiresPayment && (
            <Card className="py-5 px-6">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Pagamentos
              </h2>

              {/* Fee info */}
              {tournament.inscriptionFee && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm px-4 py-2.5 rounded-lg mb-4">
                  Taxa de inscrição: <strong>{tournament.inscriptionFee.toFixed(2)} €</strong>
                </div>
              )}

              {/* Summary */}
              {paymentsLoaded && (() => {
                const allPlayerIds = new Set<string>();
                for (const team of tournament.teams) {
                  if (team.player1) allPlayerIds.add(team.player1.id);
                  if (team.player2) allPlayerIds.add(team.player2.id);
                }
                const totalPlayers = allPlayerIds.size;
                const paidCount = payments.filter((p) => p.status === "PAID" || p.status === "MANUAL").length;

                return (
                  <div className="bg-surface-alt border border-border rounded-lg px-4 py-3 mb-4">
                    <p className="text-sm font-semibold text-text">
                      {paidCount} de {totalPlayers} jogadores pagaram
                    </p>
                    <div className="w-full bg-surface-hover rounded-full h-2 mt-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-full h-2 transition-all duration-500"
                        style={{ width: `${totalPlayers > 0 ? Math.round((paidCount / totalPlayers) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Player payment list */}
              {paymentsLoaded ? (
                <div className="space-y-2">
                  {(() => {
                    // Build full player list with payment status
                    const playerMap = new Map<string, { name: string; nickname: string | null }>();
                    for (const team of tournament.teams) {
                      if (team.player1) playerMap.set(team.player1.id, { name: team.player1.fullName, nickname: team.player1.nickname });
                      if (team.player2) playerMap.set(team.player2.id, { name: team.player2.fullName, nickname: team.player2.nickname });
                    }

                    const paymentByPlayer = new Map<string, TournamentPaymentInfo>();
                    for (const p of payments) {
                      paymentByPlayer.set(p.playerId, p);
                    }

                    const entries = Array.from(playerMap.entries())
                      .map(([id, player]) => ({
                        id,
                        name: player.nickname || player.name,
                        payment: paymentByPlayer.get(id) || null,
                      }))
                      .sort((a, b) => {
                        // Pending first, then paid/manual, then no payment
                        const statusOrder = (p: TournamentPaymentInfo | null) => {
                          if (!p) return 0;
                          if (p.status === "PENDING") return 0;
                          if (p.status === "MANUAL") return 2;
                          if (p.status === "PAID") return 2;
                          return 3;
                        };
                        return statusOrder(a.payment) - statusOrder(b.payment) || a.name.localeCompare(b.name);
                      });

                    return entries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border hover:bg-surface-alt/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-sm font-medium text-text truncate">{entry.name}</span>
                          {entry.payment ? (
                            <Badge
                              variant={
                                entry.payment.status === "PAID" ? "success" :
                                entry.payment.status === "MANUAL" ? "info" :
                                entry.payment.status === "REFUNDED" ? "default" :
                                "warning"
                              }
                            >
                              {entry.payment.status === "PAID" ? "Pago" :
                               entry.payment.status === "MANUAL" ? "Manual" :
                               entry.payment.status === "REFUNDED" ? "Reembolsado" :
                               "Pendente"}
                            </Badge>
                          ) : (
                            <Badge variant="default">Pendente</Badge>
                          )}
                        </div>
                        {canManage && (!entry.payment || entry.payment.status === "PENDING") && (
                          <button
                            disabled={markingManual === entry.id}
                            onClick={async () => {
                              setMarkingManual(entry.id);
                              try {
                                await markPaymentManual(tournament.id, entry.id);
                                const updated = await getTournamentPayments(tournament.id);
                                setPayments(updated);
                              } catch {
                                // ignore
                              }
                              setMarkingManual(null);
                            }}
                            className="text-xs font-medium text-primary hover:text-primary-dark disabled:opacity-50 whitespace-nowrap ml-2"
                          >
                            {markingManual === entry.id ? "A marcar..." : "Marcar Pagamento Manual"}
                          </button>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <p className="text-sm text-text-muted">A carregar pagamentos...</p>
              )}
            </Card>
          )}

          {/* ─── Photo Gallery Section ─── */}
          {activeSection === "fotos" && (
            <Card className="py-5 px-6">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Fotos do Torneio
              </h2>
              <PhotoGallery
                photos={photos}
                canUpload={canManage}
                onUpload={async (imageData, thumbnailData, caption) => {
                  await uploadTournamentPhoto(tournament.id, imageData, thumbnailData, caption);
                  const updated = await getTournamentPhotos(tournament.id);
                  setPhotos(updated);
                }}
                onDelete={async (photoId) => {
                  await deleteTournamentPhoto(photoId);
                  const updated = await getTournamentPhotos(tournament.id);
                  setPhotos(updated);
                }}
                onLoadFull={async (photoId) => {
                  const photo = await getTournamentPhoto(photoId);
                  return photo.imageData;
                }}
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
