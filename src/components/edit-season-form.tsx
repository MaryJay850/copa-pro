"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { updateSeasonSettings, cloneSeason } from "@/lib/actions";

export function EditSeasonForm({
  seasonId,
  leagueId,
  currentName,
  currentAllowDraws,
  currentStartDate,
  currentEndDate,
}: {
  seasonId: string;
  leagueId: string;
  currentName: string;
  currentAllowDraws: boolean;
  currentStartDate: string | null;
  currentEndDate: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [allowDraws, setAllowDraws] = useState(currentAllowDraws);
  const [startDate, setStartDate] = useState(currentStartDate || "");
  const [endDate, setEndDate] = useState(currentEndDate || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSeasonSettings(seasonId, {
        name,
        allowDraws,
        startDate: startDate || null,
        endDate: endDate || null,
      });
      toast.success("\u00C9poca atualizada!");
      setEditing(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar \u00E9poca.");
    }
    setSaving(false);
  };

  const handleClone = async () => {
    setSaving(true);
    try {
      const newSeason = await cloneSeason(seasonId);
      toast.success("\u00C9poca duplicada com sucesso!");
      router.push(`/ligas/${leagueId}/epocas/${newSeason.id}`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao duplicar \u00E9poca.");
    }
    setSaving(false);
  };

  if (!editing) {
    return (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
          Editar \u00C9poca
        </Button>
        <Button size="sm" variant="ghost" onClick={handleClone} disabled={saving}>
          Duplicar \u00C9poca
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-sm">Editar \u00C9poca</CardTitle>
      </CardHeader>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-text-muted font-medium">Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="allowDraws"
            checked={allowDraws}
            onChange={(e) => setAllowDraws(e.target.checked)}
            className="rounded border-border"
          />
          <label htmlFor="allowDraws" className="text-sm">
            Permitir empates
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-muted font-medium">Data In\u00EDcio</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full mt-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted font-medium">Data Fim</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full mt-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "A guardar..." : "Guardar"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </div>
      </div>
    </Card>
  );
}
