"use client";
import { useState } from "react";
import { ScoreInput } from "./ui/score-input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { saveMatchScore, resetMatch, submitMatchResult, confirmMatchResult, rejectMatchResult } from "@/lib/actions";

interface MatchCardProps {
  match: {
    id: string;
    slotIndex: number;
    set1A: number | null;
    set1B: number | null;
    set2A: number | null;
    set2B: number | null;
    set3A: number | null;
    set3B: number | null;
    status: string;
    resultType: string;
    court: { name: string } | null;
    teamA: {
      id: string;
      name: string;
      player1: { id?: string; fullName: string; nickname: string | null };
      player2: { id?: string; fullName: string; nickname: string | null } | null;
    };
    teamB: {
      id: string;
      name: string;
      player1: { id?: string; fullName: string; nickname: string | null };
      player2: { id?: string; fullName: string; nickname: string | null } | null;
    };
  };
  numberOfSets?: number;
  canEdit?: boolean;
  currentPlayerId?: string;
  pendingSubmission?: {
    id: string;
    submittedBy: string;
    set1A: number | null;
    set1B: number | null;
    set2A: number | null;
    set2B: number | null;
    set3A: number | null;
    set3B: number | null;
    submitter: { email: string; player: { fullName: string } | null };
  } | null;
  currentUserId?: string;
}

function playerLabel(p: { fullName: string; nickname: string | null }) {
  return p.nickname || p.fullName.split(" ")[0];
}

export function MatchCard({ match, numberOfSets = 3, canEdit = true, currentPlayerId, pendingSubmission, currentUserId }: MatchCardProps) {
  const [set1A, setSet1A] = useState(match.set1A);
  const [set1B, setSet1B] = useState(match.set1B);
  const [set2A, setSet2A] = useState(match.set2A);
  const [set2B, setSet2B] = useState(match.set2B);
  const [set3A, setSet3A] = useState(match.set3A);
  const [set3B, setSet3B] = useState(match.set3B);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const isFinished = match.status === "FINISHED";

  // Determine if current player is in one of the teams
  const isInTeamA = currentPlayerId && (
    match.teamA.player1?.id === currentPlayerId ||
    match.teamA.player2?.id === currentPlayerId
  );
  const isInTeamB = currentPlayerId && (
    match.teamB.player1?.id === currentPlayerId ||
    match.teamB.player2?.id === currentPlayerId
  );
  const isInMatch = isInTeamA || isInTeamB;

  // Determine if this user submitted the pending result
  const isSubmitter = pendingSubmission && currentUserId === pendingSubmission.submittedBy;
  const isOpponentOfSubmitter = pendingSubmission && !isSubmitter && isInMatch;

  // Can the player submit a result? Only if scheduled, in match, not manager (canEdit=false), no pending
  const canSubmitResult = !canEdit && match.status === "SCHEDULED" && isInMatch && !pendingSubmission && !submitted;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await saveMatchScore(match.id, { set1A, set1B, set2A, set2B, set3A, set3B });
      if (!result.success) {
        setError(result.error);
      }
    } catch (e: any) {
      setError(e.message || "Erro ao guardar resultado.");
    }
    setSaving(false);
  };

  const handleReset = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await resetMatch(match.id);
      if (!result.success) {
        setError(result.error);
      } else {
        setSet1A(null); setSet1B(null);
        setSet2A(null); setSet2B(null);
        setSet3A(null); setSet3B(null);
      }
    } catch (e: any) {
      setError(e.message || "Erro ao repor jogo.");
    }
    setSaving(false);
  };

  const handleSubmitResult = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await submitMatchResult(match.id, { set1A, set1B, set2A, set2B, set3A, set3B });
      if (result.success) {
        toast.success("Resultado submetido! Aguarda confirmacao do adversario.");
        setShowSubmitForm(false);
        setSubmitted(true);
      }
    } catch (e: any) {
      setError(e.message || "Erro ao submeter resultado.");
      toast.error(e.message || "Erro ao submeter resultado.");
    }
    setSaving(false);
  };

  const handleConfirm = async () => {
    if (!pendingSubmission) return;
    setSaving(true);
    try {
      const result = await confirmMatchResult(pendingSubmission.id);
      if (result.success) {
        toast.success("Resultado confirmado com sucesso!");
        setConfirmed(true);
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao confirmar resultado.");
    }
    setSaving(false);
  };

  const handleReject = async () => {
    if (!pendingSubmission) return;
    setSaving(true);
    try {
      const result = await rejectMatchResult(pendingSubmission.id);
      if (result.success) {
        toast.success("Resultado rejeitado.");
        setConfirmed(true); // Hide the buttons
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao rejeitar resultado.");
    }
    setSaving(false);
  };

  const statusBadge = () => {
    if (submitted || (pendingSubmission && !confirmed)) {
      return <Badge variant="warning">Aguarda confirmacao</Badge>;
    }
    switch (match.resultType) {
      case "WIN_A":
        return <Badge variant="success">Vitoria {match.teamA.name}</Badge>;
      case "WIN_B":
        return <Badge variant="success">Vitoria {match.teamB.name}</Badge>;
      case "DRAW":
        return <Badge variant="warning">Empate</Badge>;
      default:
        return <Badge variant="default">Por jogar</Badge>;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-text-muted">
          {match.court?.name || "Sem campo"}
        </div>
        {statusBadge()}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">{match.teamA.name}</div>
            <div className="text-xs text-text-muted">
              {playerLabel(match.teamA.player1)}{match.teamA.player2 && ` & ${playerLabel(match.teamA.player2)}`}
            </div>
          </div>
          <div className="text-lg font-bold text-text-muted">vs</div>
          <div className="text-right">
            <div className="font-medium text-sm">{match.teamB.name}</div>
            <div className="text-xs text-text-muted">
              {playerLabel(match.teamB.player1)}{match.teamB.player2 && ` & ${playerLabel(match.teamB.player2)}`}
            </div>
          </div>
        </div>
      </div>

      {/* Manager editing mode */}
      {canEdit ? (
        <>
          <div className="space-y-1.5 pt-2 border-t border-border">
            <ScoreInput label="Set 1" valueA={set1A} valueB={set1B} onChangeA={setSet1A} onChangeB={setSet1B} disabled={saving} />
            {numberOfSets >= 2 && (
              <ScoreInput label="Set 2" valueA={set2A} valueB={set2B} onChangeA={setSet2A} onChangeB={setSet2B} disabled={saving} />
            )}
            {numberOfSets >= 3 && (
              <ScoreInput label="Set 3" valueA={set3A} valueB={set3B} onChangeA={setSet3A} onChangeB={setSet3B} disabled={saving} />
            )}
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "A guardar..." : "Guardar"}
            </Button>
            {isFinished && (
              <Button size="sm" variant="ghost" onClick={handleReset} disabled={saving}>
                Repor
              </Button>
            )}
          </div>
        </>
      ) : isFinished ? (
        /* Read-only finished scores */
        <div className="pt-2 border-t border-border space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted text-xs">Set 1</span>
            <span className="font-medium">{match.set1A} - {match.set1B}</span>
          </div>
          {numberOfSets >= 2 && match.set2A != null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted text-xs">Set 2</span>
              <span className="font-medium">{match.set2A} - {match.set2B}</span>
            </div>
          )}
          {numberOfSets >= 3 && match.set3A != null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted text-xs">Set 3</span>
              <span className="font-medium">{match.set3A} - {match.set3B}</span>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Pending submission: show to opponent for confirmation */}
          {pendingSubmission && !confirmed && (
            <div className="pt-2 border-t border-border space-y-2">
              <div className="text-xs text-text-muted">
                Resultado submetido por {pendingSubmission.submitter.player?.fullName || pendingSubmission.submitter.email}:
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted text-xs">Set 1</span>
                  <span className="font-medium">{pendingSubmission.set1A} - {pendingSubmission.set1B}</span>
                </div>
                {pendingSubmission.set2A != null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted text-xs">Set 2</span>
                    <span className="font-medium">{pendingSubmission.set2A} - {pendingSubmission.set2B}</span>
                  </div>
                )}
                {pendingSubmission.set3A != null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted text-xs">Set 3</span>
                    <span className="font-medium">{pendingSubmission.set3A} - {pendingSubmission.set3B}</span>
                  </div>
                )}
              </div>
              {isSubmitter && (
                <Badge variant="warning">Aguarda confirmacao do adversario</Badge>
              )}
              {isOpponentOfSubmitter && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={handleConfirm} disabled={saving}>
                    {saving ? "..." : "Confirmar"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleReject} disabled={saving}>
                    Rejeitar
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Player submit result button */}
          {canSubmitResult && !showSubmitForm && (
            <div className="pt-2 border-t border-border">
              <Button size="sm" variant="secondary" onClick={() => setShowSubmitForm(true)}>
                Submeter Resultado
              </Button>
            </div>
          )}

          {/* Player submit result form */}
          {showSubmitForm && (
            <div className="pt-2 border-t border-border space-y-2">
              <div className="space-y-1.5">
                <ScoreInput label="Set 1" valueA={set1A} valueB={set1B} onChangeA={setSet1A} onChangeB={setSet1B} disabled={saving} />
                {numberOfSets >= 2 && (
                  <ScoreInput label="Set 2" valueA={set2A} valueB={set2B} onChangeA={setSet2A} onChangeB={setSet2B} disabled={saving} />
                )}
                {numberOfSets >= 3 && (
                  <ScoreInput label="Set 3" valueA={set3A} valueB={set3B} onChangeA={setSet3A} onChangeB={setSet3B} disabled={saving} />
                )}
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSubmitResult} disabled={saving}>
                  {saving ? "A submeter..." : "Submeter"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSubmitForm(false)} disabled={saving}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Already submitted feedback */}
          {submitted && (
            <div className="pt-2 border-t border-border">
              <Badge variant="warning">Resultado submetido - aguarda confirmacao</Badge>
            </div>
          )}
        </>
      )}
    </div>
  );
}
