"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AuditData } from "@/lib/actions/audit-ranking-actions";

type Tab = "resumo" | "comparacao" | "jogador" | "torneio" | "jogo-a-jogo";

const TABS: { key: Tab; label: string }[] = [
  { key: "resumo", label: "Resumo" },
  { key: "comparacao", label: "Ranking Comparacao" },
  { key: "jogador", label: "Por Jogador" },
  { key: "torneio", label: "Por Torneio" },
  { key: "jogo-a-jogo", label: "Jogo a Jogo" },
];

function formatScore(a: number | null, b: number | null): string {
  if (a === null || b === null) return "-";
  return `${a}x${b}`;
}

function resultLabel(resultType: string): string {
  switch (resultType) {
    case "WIN_A":
      return "Vitoria A";
    case "WIN_B":
      return "Vitoria B";
    case "DRAW":
      return "Empate";
    default:
      return resultType;
  }
}

function resultBadgeVariant(
  resultType: string
): "success" | "danger" | "warning" | "default" {
  switch (resultType) {
    case "WIN_A":
    case "WIN_B":
      return "success";
    case "DRAW":
      return "warning";
    default:
      return "default";
  }
}

function eventLabel(event: string): string | null {
  switch (event) {
    case "NONE":
      return null;
    case "WALKOVER_A":
      return "WO (A)";
    case "WALKOVER_B":
      return "WO (B)";
    case "CANCELLED":
      return "Cancelado";
    case "INJURY":
      return "Lesao";
    case "POSTPONED":
      return "Adiado";
    default:
      return event;
  }
}

function teamNames(
  p1: { name: string } | null,
  p2: { name: string } | null
): string {
  if (!p1) return "?";
  if (!p2) return p1.name;
  return `${p1.name} / ${p2.name}`;
}

export function AuditContent({
  data,
  leagueId,
}: {
  data: AuditData;
  leagueId: string;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("resumo");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(
    data.players[0]?.id || ""
  );
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>(
    data.tournaments[0]?.id || ""
  );

  // Total matches across all tournaments
  const totalMatches = useMemo(
    () => data.tournaments.reduce((sum, t) => sum + t.matches.length, 0),
    [data.tournaments]
  );

  const finishedMatches = useMemo(
    () =>
      data.tournaments.reduce(
        (sum, t) =>
          sum + t.matches.filter((m) => m.status === "FINISHED").length,
        0
      ),
    [data.tournaments]
  );

  const selectedPlayer = useMemo(
    () => data.players.find((p) => p.id === selectedPlayerId),
    [data.players, selectedPlayerId]
  );

  const selectedTournament = useMemo(
    () => data.tournaments.find((t) => t.id === selectedTournamentId),
    [data.tournaments, selectedTournamentId]
  );

  // For Per Player tab: get all matches involving this player
  const playerMatches = useMemo(() => {
    if (!selectedPlayerId) return [];
    const result: {
      tournamentName: string;
      match: (typeof data.tournaments)[0]["matches"][0];
    }[] = [];
    for (const t of data.tournaments) {
      for (const m of t.matches) {
        const involvedIds = [
          m.teamAPlayer1.id,
          m.teamAPlayer2?.id,
          m.teamBPlayer1.id,
          m.teamBPlayer2?.id,
        ].filter(Boolean);
        if (involvedIds.includes(selectedPlayerId)) {
          result.push({ tournamentName: t.name, match: m });
        }
      }
    }
    return result;
  }, [data.tournaments, selectedPlayerId]);

  // For Per Tournament tab: compute per-player totals within tournament
  const tournamentPlayerTotals = useMemo(() => {
    if (!selectedTournament) return [];
    const map = new Map<
      string,
      {
        name: string;
        points: number;
        matchesPlayed: number;
        wins: number;
        draws: number;
        losses: number;
        setsWon: number;
        setsLost: number;
      }
    >();
    for (const m of selectedTournament.matches) {
      for (const d of m.deltas) {
        const e = map.get(d.playerId) || {
          name: d.playerName,
          points: 0,
          matchesPlayed: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          setsWon: 0,
          setsLost: 0,
        };
        e.points += d.points;
        e.matchesPlayed += 1;
        e.wins += d.wins;
        e.draws += d.draws;
        e.losses += d.losses;
        e.setsWon += d.setsWon;
        e.setsLost += d.setsLost;
        map.set(d.playerId, e);
      }
    }
    return Array.from(map.entries())
      .map(([id, stats]) => ({ id, ...stats }))
      .sort((a, b) => b.points - a.points);
  }, [selectedTournament]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="rounded-lg shadow-card bg-surface border border-border overflow-hidden">
        <div
          className="h-20"
          style={{
            background:
              "linear-gradient(to right, #5766da, #7c6fe0, #a78bfa)",
          }}
        />
        <div className="px-6 pb-5 relative">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border-4 border-surface absolute -top-8 left-6"
            style={{
              background:
                "linear-gradient(to bottom right, #5766da, #8b9cf7)",
            }}
          >
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div className="pt-12">
            <div className="flex items-center gap-2 text-xs text-text-muted mb-1 font-medium">
              <Link
                href="/ligas"
                className="hover:text-primary transition-colors"
              >
                Ligas
              </Link>
              <span>&rsaquo;</span>
              <Link
                href={`/ligas/${leagueId}`}
                className="hover:text-primary transition-colors"
              >
                {data.season.leagueName}
              </Link>
              <span>&rsaquo;</span>
              <Link
                href={`/ligas/${leagueId}/epocas/${data.season.id}`}
                className="hover:text-primary transition-colors"
              >
                {data.season.name}
              </Link>
              <span>&rsaquo;</span>
              <span className="text-text">Auditoria</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-extrabold tracking-tight">
                Auditoria de Ranking
              </h1>
              {data.totalDiscrepancies === 0 ? (
                <Badge variant="success">Sem discrepancias</Badge>
              ) : (
                <Badge variant="danger">
                  {data.totalDiscrepancies} discrepancia
                  {data.totalDiscrepancies > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary/10 text-primary"
                : "text-text hover:bg-surface-hover"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "resumo" && (
        <TabResumo
          data={data}
          totalMatches={totalMatches}
          finishedMatches={finishedMatches}
        />
      )}
      {activeTab === "comparacao" && <TabComparacao data={data} />}
      {activeTab === "jogador" && (
        <TabJogador
          data={data}
          selectedPlayerId={selectedPlayerId}
          setSelectedPlayerId={setSelectedPlayerId}
          selectedPlayer={selectedPlayer}
          playerMatches={playerMatches}
        />
      )}
      {activeTab === "torneio" && (
        <TabTorneio
          data={data}
          selectedTournamentId={selectedTournamentId}
          setSelectedTournamentId={setSelectedTournamentId}
          selectedTournament={selectedTournament}
          tournamentPlayerTotals={tournamentPlayerTotals}
        />
      )}
      {activeTab === "jogo-a-jogo" && <TabJogoAJogo data={data} />}
    </div>
  );
}

// ── Tab: Resumo ──

function TabResumo({
  data,
  totalMatches,
  finishedMatches,
}: {
  data: AuditData;
  totalMatches: number;
  finishedMatches: number;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Config Card */}
      <Card className="py-5 px-5">
        <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-4">
          Configuracao da Epoca
        </h3>
        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-text-muted">Modo de ranking</span>
            <span className="font-semibold">
              {data.season.rankingMode === "AVERAGE" ? "Media" : "Soma"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Empates</span>
            <span className="font-semibold">
              {data.season.allowDraws ? "Permitidos" : "Nao permitidos"}
            </span>
          </div>
          <div className="border-t border-border pt-2 mt-2 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-text-muted">Set ganho</span>
              <span className="font-semibold">
                +{data.season.pointsSetWon} pts
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Vitoria</span>
              <span className="font-semibold">
                +{data.season.pointsWin} pts
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Empate</span>
              <span className="font-semibold">
                +{data.season.pointsDraw} pts
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Derrota</span>
              <span className="font-semibold">
                {data.season.pointsLoss >= 0 ? "+" : ""}
                {data.season.pointsLoss} pts
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Status Card */}
      <Card className="py-5 px-5">
        <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-4">
          Estado da Auditoria
        </h3>
        <div className="space-y-4">
          <div
            className={`rounded-lg p-4 ${
              data.totalDiscrepancies === 0
                ? "bg-[rgba(30,202,184,0.1)]"
                : "bg-[rgba(249,59,122,0.1)]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">
                {data.totalDiscrepancies === 0 ? "\u2705" : "\u274C"}
              </span>
              <div>
                <p className="font-bold text-sm">
                  {data.totalDiscrepancies === 0
                    ? "Ranking consistente"
                    : `${data.totalDiscrepancies} discrepancia${data.totalDiscrepancies > 1 ? "s" : ""} encontrada${data.totalDiscrepancies > 1 ? "s" : ""}`}
                </p>
                <p className="text-xs text-text-muted">
                  {data.totalDiscrepancies === 0
                    ? "Os valores calculados coincidem com os armazenados na base de dados."
                    : "Os valores calculados nao coincidem com os armazenados."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-extrabold text-primary">
                {data.tournaments.length}
              </p>
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Torneios
              </p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-text">
                {finishedMatches}
                <span className="text-sm text-text-muted font-normal">
                  /{totalMatches}
                </span>
              </p>
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Jogos
              </p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-text">
                {data.players.length}
              </p>
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Jogadores
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Tab: Comparacao ──

function TabComparacao({ data }: { data: AuditData }) {
  return (
    <Card className="py-5 px-5">
      <h3 className="text-base font-bold mb-4 flex items-center gap-2">
        <svg
          className="w-4 h-4 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        Comparacao: Base de Dados vs Calculado
      </h3>

      {data.players.length === 0 ? (
        <p className="text-sm text-text-muted">Nenhum jogador encontrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  #
                </th>
                <th className="text-left py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Jogador
                </th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Pts(BD)
                </th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Pts(Calc)
                </th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Jogos
                </th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  V
                </th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  E
                </th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  D
                </th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  SG+
                </th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  SG-
                </th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Dif
                </th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Ajuste
                </th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  OK
                </th>
              </tr>
            </thead>
            <tbody>
              {data.players.map((p, i) => {
                const storedPts = p.stored?.pointsTotal ?? "-";
                const computedWithAdj =
                  p.computed.pointsTotal +
                  (p.stored?.manualAdjustment ?? 0);
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-border/50 transition-colors ${
                      p.discrepancy
                        ? "bg-[rgba(249,59,122,0.06)] hover:bg-[rgba(249,59,122,0.1)]"
                        : "hover:bg-surface-hover"
                    }`}
                  >
                    <td className="py-2 px-2 text-text-muted">{i + 1}</td>
                    <td className="py-2 px-2 font-semibold">{p.name}</td>
                    <td className="py-2 px-2 text-center font-mono">
                      {storedPts}
                    </td>
                    <td className="py-2 px-2 text-center font-mono">
                      {computedWithAdj}
                    </td>
                    <td className="py-2 px-2 text-center text-text-muted">
                      {p.stored?.matchesPlayed ?? "-"} /{" "}
                      {p.computed.matchesPlayed}
                    </td>
                    <td className="py-2 px-2 text-center text-text-muted">
                      {p.stored?.wins ?? "-"} / {p.computed.wins}
                    </td>
                    <td className="py-2 px-2 text-center text-text-muted">
                      {p.stored?.draws ?? "-"} / {p.computed.draws}
                    </td>
                    <td className="py-2 px-2 text-center text-text-muted">
                      {p.stored?.losses ?? "-"} / {p.computed.losses}
                    </td>
                    <td className="py-2 px-2 text-center text-text-muted">
                      {p.stored?.setsWon ?? "-"} / {p.computed.setsWon}
                    </td>
                    <td className="py-2 px-2 text-center text-text-muted">
                      {p.stored?.setsLost ?? "-"} / {p.computed.setsLost}
                    </td>
                    <td className="py-2 px-2 text-center text-text-muted">
                      {p.stored?.setsDiff ?? "-"} / {p.computed.setsDiff}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {p.stored?.manualAdjustment
                        ? (
                            <span
                              className="font-semibold text-amber-600"
                              title={
                                p.stored.adjustmentNote || "Sem nota"
                              }
                            >
                              {p.stored.manualAdjustment > 0 ? "+" : ""}
                              {p.stored.manualAdjustment}
                            </span>
                          )
                        : (
                            <span className="text-text-muted">-</span>
                          )}
                    </td>
                    <td className="py-2 px-2 text-center text-lg">
                      {p.discrepancy ? "\u274C" : "\u2705"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-text-muted mt-3">
            Formato: BD / Calculado. &quot;Pts(Calc)&quot; inclui ajuste manual.
          </p>
        </div>
      )}
    </Card>
  );
}

// ── Tab: Por Jogador ──

function TabJogador({
  data,
  selectedPlayerId,
  setSelectedPlayerId,
  selectedPlayer,
  playerMatches,
}: {
  data: AuditData;
  selectedPlayerId: string;
  setSelectedPlayerId: (id: string) => void;
  selectedPlayer: AuditData["players"][0] | undefined;
  playerMatches: {
    tournamentName: string;
    match: AuditData["tournaments"][0]["matches"][0];
  }[];
}) {
  return (
    <div className="space-y-4">
      {/* Player selector */}
      <Card className="py-4 px-5">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-semibold text-text-muted">
            Jogador:
          </label>
          <select
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
          >
            {data.players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.computed.pointsTotal} pts calc
                {p.stored
                  ? ` / ${p.stored.pointsTotal} pts BD`
                  : " / sem registo"}
                )
              </option>
            ))}
          </select>
          {selectedPlayer?.discrepancy && (
            <Badge variant="danger">Discrepancia</Badge>
          )}
        </div>
      </Card>

      {selectedPlayer && (
        <>
          {/* Per-tournament breakdown */}
          <Card className="py-5 px-5">
            <h3 className="text-sm font-bold mb-3">
              Resumo por Torneio
            </h3>
            {selectedPlayer.perTournament.length === 0 ? (
              <p className="text-sm text-text-muted">
                Sem dados de torneios para este jogador.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Torneio
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Jogos
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Pts
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        V
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        E
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        D
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        SG+
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        SG-
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPlayer.perTournament.map((pt) => (
                      <tr
                        key={pt.tournamentId}
                        className="border-b border-border/50 hover:bg-surface-hover transition-colors"
                      >
                        <td className="py-2 px-2 font-semibold">
                          {pt.tournamentName}
                        </td>
                        <td className="py-2 px-2 text-center text-text-muted">
                          {pt.matchesPlayed}
                        </td>
                        <td className="py-2 px-2 text-center font-semibold">
                          {pt.points}
                        </td>
                        <td className="py-2 px-2 text-center text-text-muted">
                          {pt.wins}
                        </td>
                        <td className="py-2 px-2 text-center text-text-muted">
                          {pt.draws}
                        </td>
                        <td className="py-2 px-2 text-center text-text-muted">
                          {pt.losses}
                        </td>
                        <td className="py-2 px-2 text-center text-text-muted">
                          {pt.setsWon}
                        </td>
                        <td className="py-2 px-2 text-center text-text-muted">
                          {pt.setsLost}
                        </td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="border-t-2 border-border font-bold">
                      <td className="py-2 px-2">Total</td>
                      <td className="py-2 px-2 text-center">
                        {selectedPlayer.computed.matchesPlayed}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {selectedPlayer.computed.pointsTotal}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {selectedPlayer.computed.wins}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {selectedPlayer.computed.draws}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {selectedPlayer.computed.losses}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {selectedPlayer.computed.setsWon}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {selectedPlayer.computed.setsLost}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Match-by-match detail */}
          <Card className="py-5 px-5">
            <h3 className="text-sm font-bold mb-3">
              Detalhe Jogo a Jogo ({playerMatches.length} jogos)
            </h3>
            {playerMatches.length === 0 ? (
              <p className="text-sm text-text-muted">
                Sem jogos encontrados.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Torneio
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Ronda
                      </th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Equipas
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Resultado
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Sets
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Pts
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerMatches.map(({ tournamentName, match: m }) => {
                      const delta = m.deltas.find(
                        (d) => d.playerId === selectedPlayerId
                      );
                      const scores = [
                        formatScore(m.set1A, m.set1B),
                        formatScore(m.set2A, m.set2B),
                        formatScore(m.set3A, m.set3B),
                      ].filter((s) => s !== "-");

                      // Determine if this player won/lost/drew
                      const isTeamA = [
                        m.teamAPlayer1.id,
                        m.teamAPlayer2?.id,
                      ].includes(selectedPlayerId);
                      let rowColor = "";
                      if (m.status === "FINISHED") {
                        if (
                          (isTeamA && m.resultType === "WIN_A") ||
                          (!isTeamA && m.resultType === "WIN_B")
                        ) {
                          rowColor =
                            "bg-[rgba(30,202,184,0.06)]";
                        } else if (m.resultType === "DRAW") {
                          rowColor =
                            "bg-[rgba(251,182,36,0.06)]";
                        } else if (m.status === "FINISHED") {
                          rowColor =
                            "bg-[rgba(249,59,122,0.06)]";
                        }
                      }

                      return (
                        <tr
                          key={m.id}
                          className={`border-b border-border/50 transition-colors ${rowColor}`}
                        >
                          <td className="py-2 px-2 text-text-muted text-xs">
                            {tournamentName}
                          </td>
                          <td className="py-2 px-2 text-center text-text-muted">
                            {m.roundIndex + 1}
                          </td>
                          <td className="py-2 px-2">
                            <span className="font-medium">
                              {teamNames(
                                m.teamAPlayer1,
                                m.teamAPlayer2
                              )}
                            </span>
                            <span className="text-text-muted mx-1.5">
                              vs
                            </span>
                            <span className="font-medium">
                              {teamNames(
                                m.teamBPlayer1,
                                m.teamBPlayer2
                              )}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            {m.status === "FINISHED" ? (
                              <Badge
                                variant={resultBadgeVariant(
                                  m.resultType
                                )}
                              >
                                {resultLabel(m.resultType)}
                              </Badge>
                            ) : (
                              <span className="text-text-muted text-xs">
                                {m.status}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-xs">
                            {scores.join(" ")}
                          </td>
                          <td className="py-2 px-2 text-center font-bold">
                            {delta
                              ? `+${delta.points}`
                              : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {/* Running total */}
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-sm">
                  <span className="text-text-muted font-medium">
                    Total calculado:
                  </span>
                  <span className="font-bold text-primary text-lg">
                    {selectedPlayer.computed.pointsTotal} pts
                  </span>
                </div>
                {selectedPlayer.stored?.manualAdjustment ? (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-text-muted font-medium">
                      Ajuste manual:
                    </span>
                    <span className="font-semibold text-amber-600">
                      {selectedPlayer.stored.manualAdjustment > 0
                        ? "+"
                        : ""}
                      {selectedPlayer.stored.manualAdjustment} pts
                      {selectedPlayer.stored.adjustmentNote &&
                        ` (${selectedPlayer.stored.adjustmentNote})`}
                    </span>
                  </div>
                ) : null}
                {selectedPlayer.stored && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-text-muted font-medium">
                      Total na BD:
                    </span>
                    <span className="font-bold">
                      {selectedPlayer.stored.pointsTotal} pts
                    </span>
                  </div>
                )}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

// ── Tab: Por Torneio ──

function TabTorneio({
  data,
  selectedTournamentId,
  setSelectedTournamentId,
  selectedTournament,
  tournamentPlayerTotals,
}: {
  data: AuditData;
  selectedTournamentId: string;
  setSelectedTournamentId: (id: string) => void;
  selectedTournament: AuditData["tournaments"][0] | undefined;
  tournamentPlayerTotals: {
    id: string;
    name: string;
    points: number;
    matchesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    setsWon: number;
    setsLost: number;
  }[];
}) {
  return (
    <div className="space-y-4">
      {/* Tournament selector */}
      <Card className="py-4 px-5">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-semibold text-text-muted">
            Torneio:
          </label>
          <select
            value={selectedTournamentId}
            onChange={(e) =>
              setSelectedTournamentId(e.target.value)
            }
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
          >
            {data.tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.matches.length} jogos) - {t.status}
              </option>
            ))}
          </select>
          {selectedTournament?.teamMode === "SOBE_DESCE" && (
            <Badge variant="info">Sobe e Desce</Badge>
          )}
        </div>
      </Card>

      {selectedTournament && (
        <>
          {/* SOBE_DESCE final results */}
          {selectedTournament.finalResults &&
            selectedTournament.finalResults.length > 0 && (
              <Card className="py-5 px-5">
                <h3 className="text-sm font-bold mb-3">
                  Resultados Finais (Sobe e Desce)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                          Pos
                        </th>
                        <th className="text-left py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                          Jogador(es)
                        </th>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                          Posicao Pts
                        </th>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                          Bonus
                        </th>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTournament.finalResults.map(
                        (fr) => (
                          <tr
                            key={fr.position}
                            className="border-b border-border/50 hover:bg-surface-hover transition-colors"
                          >
                            <td className="py-2 px-2 text-center font-bold">
                              {fr.position}
                              {fr.position === 1
                                ? "\u00BA"
                                : "\u00BA"}
                            </td>
                            <td className="py-2 px-2 font-semibold">
                              {fr.player1Name}
                              {fr.player2Name
                                ? ` / ${fr.player2Name}`
                                : ""}
                            </td>
                            <td className="py-2 px-2 text-center text-text-muted">
                              {fr.positionPts}
                            </td>
                            <td className="py-2 px-2 text-center text-text-muted">
                              {fr.bonusPts}
                            </td>
                            <td className="py-2 px-2 text-center font-bold">
                              {fr.totalPts}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

          {/* Match list */}
          <Card className="py-5 px-5">
            <h3 className="text-sm font-bold mb-3">
              Jogos ({selectedTournament.matches.length})
            </h3>
            {selectedTournament.matches.length === 0 ? (
              <p className="text-sm text-text-muted">
                Sem jogos neste torneio.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Ronda
                      </th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Equipa A
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Sets
                      </th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Equipa B
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Resultado
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Evento
                      </th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Pontos
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTournament.matches.map((m) => {
                      const scores = [
                        formatScore(m.set1A, m.set1B),
                        formatScore(m.set2A, m.set2B),
                        formatScore(m.set3A, m.set3B),
                      ].filter((s) => s !== "-");
                      const evtLabel = eventLabel(m.event);
                      return (
                        <tr
                          key={m.id}
                          className="border-b border-border/50 hover:bg-surface-hover transition-colors"
                        >
                          <td className="py-2 px-2 text-center text-text-muted">
                            {m.roundIndex + 1}
                          </td>
                          <td className="py-2 px-2 font-medium">
                            {teamNames(
                              m.teamAPlayer1,
                              m.teamAPlayer2
                            )}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-xs">
                            {scores.join(" ")}
                          </td>
                          <td className="py-2 px-2 font-medium">
                            {teamNames(
                              m.teamBPlayer1,
                              m.teamBPlayer2
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {m.status === "FINISHED" ? (
                              <Badge
                                variant={resultBadgeVariant(
                                  m.resultType
                                )}
                              >
                                {resultLabel(m.resultType)}
                              </Badge>
                            ) : (
                              <span className="text-text-muted text-xs">
                                {m.status}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {evtLabel ? (
                              <Badge variant="warning">
                                {evtLabel}
                              </Badge>
                            ) : (
                              <span className="text-text-muted">
                                -
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-xs">
                            {m.deltas.length > 0
                              ? m.deltas.map((d) => (
                                  <div key={d.playerId}>
                                    <span className="text-text-muted">
                                      {d.playerName}:
                                    </span>{" "}
                                    <span className="font-semibold">
                                      +{d.points}
                                    </span>
                                  </div>
                                ))
                              : (
                                <span className="text-text-muted">
                                  -
                                </span>
                              )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Tournament player totals */}
          {tournamentPlayerTotals.length > 0 && (
            <Card className="py-5 px-5">
              <h3 className="text-sm font-bold mb-3">
                Totais por Jogador neste Torneio
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Jogador
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Jogos
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Pts
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        V
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        E
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        D
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        SG+
                      </th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                        SG-
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tournamentPlayerTotals.map((pt) => (
                      <tr
                        key={pt.id}
                        className="border-b border-border/50 hover:bg-surface-hover transition-colors"
                      >
                        <td className="py-2 px-2 font-semibold">
                          {pt.name}
                        </td>
                        <td className="py-2 px-2 text-center text-text-muted">
                          {pt.matchesPlayed}
                        </td>
                        <td className="py-2 px-2 text-center font-bold">
                          {pt.points}
                        </td>
                        <td className="py-2 px-2 text-center text-text-muted">
                          {pt.wins}
                        </td>
                        <td className="py-2 px-2 text-center text-text-muted">
                          {pt.draws}
                        </td>
                        <td className="py-2 px-2 text-center text-text-muted">
                          {pt.losses}
                        </td>
                        <td className="py-2 px-2 text-center text-text-muted">
                          {pt.setsWon}
                        </td>
                        <td className="py-2 px-2 text-center text-text-muted">
                          {pt.setsLost}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ── Tab: Jogo a Jogo ──

function TabJogoAJogo({ data }: { data: AuditData }) {
  return (
    <div className="space-y-6">
      {data.tournaments.map((t) => (
        <Card key={t.id} className="py-5 px-5">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-bold">{t.name}</h3>
            <Badge
              variant={
                t.status === "FINISHED"
                  ? "success"
                  : t.status === "RUNNING"
                    ? "warning"
                    : "default"
              }
            >
              {t.status}
            </Badge>
            {t.teamMode === "SOBE_DESCE" && (
              <Badge variant="info">Sobe e Desce</Badge>
            )}
          </div>

          {t.matches.length === 0 ? (
            <p className="text-sm text-text-muted">
              Sem jogos neste torneio.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Rnd
                    </th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Equipa A
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Sets
                    </th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Equipa B
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Resultado
                    </th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Deltas
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {t.matches.map((m) => {
                    const scores = [
                      formatScore(m.set1A, m.set1B),
                      formatScore(m.set2A, m.set2B),
                      formatScore(m.set3A, m.set3B),
                    ].filter((s) => s !== "-");

                    let rowBg = "";
                    if (m.status === "FINISHED") {
                      if (
                        m.resultType === "WIN_A" ||
                        m.resultType === "WIN_B"
                      ) {
                        rowBg = "";
                      } else if (m.resultType === "DRAW") {
                        rowBg =
                          "bg-[rgba(251,182,36,0.04)]";
                      }
                    }
                    if (m.event === "CANCELLED") {
                      rowBg =
                        "bg-[rgba(249,59,122,0.04)]";
                    }

                    return (
                      <tr
                        key={m.id}
                        className={`border-b border-border/50 hover:bg-surface-hover transition-colors ${rowBg}`}
                      >
                        <td className="py-2 px-2 text-center text-text-muted">
                          {m.roundIndex + 1}
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={`font-medium ${m.resultType === "WIN_A" ? "text-[#1ecab8]" : ""}`}
                          >
                            {teamNames(
                              m.teamAPlayer1,
                              m.teamAPlayer2
                            )}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-xs">
                          {scores.join(" ")}
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={`font-medium ${m.resultType === "WIN_B" ? "text-[#1ecab8]" : ""}`}
                          >
                            {teamNames(
                              m.teamBPlayer1,
                              m.teamBPlayer2
                            )}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          {m.status === "FINISHED" ? (
                            <Badge
                              variant={resultBadgeVariant(
                                m.resultType
                              )}
                            >
                              {resultLabel(m.resultType)}
                            </Badge>
                          ) : (
                            <span className="text-text-muted text-xs">
                              {m.status}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-xs">
                          {m.deltas.length > 0 ? (
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                              {m.deltas.map((d) => {
                                let color =
                                  "text-text-muted";
                                if (d.wins > 0)
                                  color =
                                    "text-[#1ecab8]";
                                else if (d.losses > 0)
                                  color =
                                    "text-[#f93b7a]";
                                else if (d.draws > 0)
                                  color =
                                    "text-[#fbb624]";
                                return (
                                  <span
                                    key={d.playerId}
                                    className={color}
                                  >
                                    {d.playerName}:{" "}
                                    <span className="font-semibold">
                                      +{d.points}
                                    </span>
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-text-muted">
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* SOBE_DESCE final results in this tab too */}
          {t.finalResults && t.finalResults.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                Resultados Finais (Posicao)
              </h4>
              <div className="flex flex-wrap gap-2">
                {t.finalResults.map((fr) => (
                  <div
                    key={fr.position}
                    className="bg-surface-hover rounded-lg px-3 py-1.5 text-xs"
                  >
                    <span className="font-bold">
                      {fr.position}&ordm;
                    </span>{" "}
                    {fr.player1Name}
                    {fr.player2Name ? ` / ${fr.player2Name}` : ""}{" "}
                    <span className="font-semibold text-primary">
                      {fr.totalPts} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      ))}

      {data.tournaments.length === 0 && (
        <Card className="py-5 px-5">
          <p className="text-sm text-text-muted">
            Nenhum torneio encontrado nesta epoca.
          </p>
        </Card>
      )}
    </div>
  );
}
