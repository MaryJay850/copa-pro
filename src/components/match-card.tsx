"use client";
import { useState } from "react";
import { ScoreInput } from "./ui/score-input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { saveMatchScore, resetMatch } from "@/lib/actions";
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
      player1: { fullName: string; nickname: string | null };
      player2: { fullName: string; nickname: string | null } | null;
    };
    teamB: {
      id: string;
      name: string;
      player1: { fullName: string; nickname: string | null };
      player2: { fullName: string; nickname: string | null } | null;
    };
  };
  numberOfSets?: number;
  canEdit?: boolean;
}
function playerLabel(p: { fullName: string; nickname: string | null }) {
  return p.nickname || p.fullName.split(" ")[0];
}
export function MatchCard({ match, numberOfSets = 3, canEdit = true }: MatchCardProps) {
  const [set1A, setSet1A] = useState(match.set1A);
  const [set1B, setSet1B] = useState(match.set1B);
  const [set2A, setSet2A] = useState(match.set2A);
  const [set2B, setSet2B] = useState(match.set2B);
  const [set3A, setSet3A] = useState(match.set3A);
  const [set3B, setSet3B] = useState(match.set3B);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFinished = match.status === "FINISHED";
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
  const statusBadge = () => {
    switch (match.resultType) {
      case "WIN_A":
        return <Badge variant="success">Vitória {match.teamA.name}</Badge>;
      case "WIN_B":
        return <Badge variant="success">Vitória {match.teamB.name}</Badge>;
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
      ) : null}
    </div>
  );
}