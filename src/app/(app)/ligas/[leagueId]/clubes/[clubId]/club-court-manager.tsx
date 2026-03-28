"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  addCourtToClub,
  updateCourt,
  deleteCourt,
  reorderCourts,
} from "@/lib/actions/club-actions";
import { sanitizeError } from "@/lib/error-utils";

type Court = {
  id: string;
  name: string;
  quality: "GOOD" | "MEDIUM" | "BAD";
  isAvailable: boolean;
  orderIndex: number;
};

const qualityOptions = [
  { value: "GOOD", label: "Bom", color: "text-green-600 bg-green-50 border-green-200" },
  { value: "MEDIUM", label: "Medio", color: "text-amber-600 bg-amber-50 border-amber-200" },
  { value: "BAD", label: "Mau", color: "text-red-600 bg-red-50 border-red-200" },
];

const qualityBadgeVariant: Record<string, "success" | "warning" | "danger"> = {
  GOOD: "success",
  MEDIUM: "warning",
  BAD: "danger",
};

const qualityLabel: Record<string, string> = {
  GOOD: "Bom",
  MEDIUM: "Medio",
  BAD: "Mau",
};

export function ClubCourtManager({
  clubId,
  leagueId,
  initialCourts,
}: {
  clubId: string;
  leagueId: string;
  initialCourts: Court[];
}) {
  const [courts, setCourts] = useState<Court[]>(initialCourts);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newQuality, setNewQuality] = useState<"GOOD" | "MEDIUM" | "BAD">("GOOD");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleAdd = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      try {
        await addCourtToClub({ clubId, name: newName.trim(), quality: newQuality });
        toast.success("Campo adicionado.");
        setNewName("");
        setNewQuality("GOOD");
        setShowAdd(false);
        router.refresh();
      } catch (err) {
        toast.error(sanitizeError(err, "Erro ao adicionar campo."));
      }
    });
  };

  const handleUpdateQuality = (courtId: string, quality: "GOOD" | "MEDIUM" | "BAD") => {
    startTransition(async () => {
      try {
        await updateCourt({ courtId, quality });
        setCourts((prev) => prev.map((c) => (c.id === courtId ? { ...c, quality } : c)));
        toast.success("Qualidade atualizada.");
      } catch (err) {
        toast.error(sanitizeError(err, "Erro ao atualizar."));
      }
    });
  };

  const handleToggleAvailable = (courtId: string, isAvailable: boolean) => {
    startTransition(async () => {
      try {
        await updateCourt({ courtId, isAvailable });
        setCourts((prev) => prev.map((c) => (c.id === courtId ? { ...c, isAvailable } : c)));
        toast.success(isAvailable ? "Campo disponivel." : "Campo indisponivel.");
      } catch (err) {
        toast.error(sanitizeError(err, "Erro ao atualizar."));
      }
    });
  };

  const handleUpdateName = (courtId: string, name: string) => {
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        await updateCourt({ courtId, name: name.trim() });
        setCourts((prev) => prev.map((c) => (c.id === courtId ? { ...c, name: name.trim() } : c)));
        setEditingId(null);
        toast.success("Nome atualizado.");
      } catch (err) {
        toast.error(sanitizeError(err, "Erro ao atualizar."));
      }
    });
  };

  const handleDelete = (courtId: string, courtName: string) => {
    if (!confirm(`Eliminar o campo "${courtName}"? Esta acao nao pode ser revertida.`)) return;
    startTransition(async () => {
      try {
        await deleteCourt(courtId);
        setCourts((prev) => prev.filter((c) => c.id !== courtId));
        toast.success("Campo eliminado.");
        router.refresh();
      } catch (err) {
        toast.error(sanitizeError(err, "Erro ao eliminar campo."));
      }
    });
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newCourts = [...courts];
    [newCourts[index - 1], newCourts[index]] = [newCourts[index], newCourts[index - 1]];
    setCourts(newCourts);
    startTransition(async () => {
      try {
        await reorderCourts(clubId, newCourts.map((c) => c.id));
      } catch (err) {
        toast.error(sanitizeError(err, "Erro ao reordenar."));
      }
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= courts.length - 1) return;
    const newCourts = [...courts];
    [newCourts[index], newCourts[index + 1]] = [newCourts[index + 1], newCourts[index]];
    setCourts(newCourts);
    startTransition(async () => {
      try {
        await reorderCourts(clubId, newCourts.map((c) => c.id));
      } catch (err) {
        toast.error(sanitizeError(err, "Erro ao reordenar."));
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Court list */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">
            Campos ({courts.length})
          </h2>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Adicionar Campo
            </span>
          </Button>
        </div>

        {/* Add court form */}
        {showAdd && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-surface-alt rounded-xl border border-border">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Nome do campo..."
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
            <select
              value={newQuality}
              onChange={(e) => setNewQuality(e.target.value as any)}
              className="rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {qualityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <Button size="sm" onClick={handleAdd} disabled={isPending || !newName.trim()}>
              {isPending ? "..." : "Adicionar"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => { setShowAdd(false); setNewName(""); }}>
              Cancelar
            </Button>
          </div>
        )}

        {courts.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">
            Nenhum campo configurado. Adicione campos para usar nos torneios.
          </p>
        ) : (
          <div className="space-y-2">
            {courts.map((court, idx) => (
              <div
                key={court.id}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                  !court.isAvailable
                    ? "border-border bg-surface-alt/50 opacity-60"
                    : "border-border bg-surface hover:bg-surface-alt/30"
                }`}
              >
                {/* Reorder buttons */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleMoveUp(idx)}
                    disabled={idx === 0 || isPending}
                    className="text-text-muted hover:text-text disabled:opacity-30 p-0.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleMoveDown(idx)}
                    disabled={idx === courts.length - 1 || isPending}
                    className="text-text-muted hover:text-text disabled:opacity-30 p-0.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Court name */}
                <div className="flex-1 min-w-0">
                  {editingId === court.id ? (
                    <input
                      defaultValue={court.name}
                      onBlur={(e) => handleUpdateName(court.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdateName(court.id, (e.target as HTMLInputElement).value);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="rounded-lg border border-primary px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/20"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => setEditingId(court.id)}
                      className="text-sm font-semibold hover:text-primary transition-colors text-left"
                    >
                      {court.name}
                    </button>
                  )}
                </div>

                {/* Quality selector */}
                <select
                  value={court.quality}
                  onChange={(e) => handleUpdateQuality(court.id, e.target.value as any)}
                  disabled={isPending}
                  className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
                    qualityOptions.find((o) => o.value === court.quality)?.color || ""
                  }`}
                >
                  {qualityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                {/* Availability toggle */}
                <button
                  onClick={() => handleToggleAvailable(court.id, !court.isAvailable)}
                  disabled={isPending}
                  className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg border transition-colors ${
                    court.isAvailable
                      ? "text-green-600 bg-green-50 border-green-200 hover:bg-green-100"
                      : "text-red-600 bg-red-50 border-red-200 hover:bg-red-100"
                  }`}
                >
                  {court.isAvailable ? "Disponivel" : "Indisponivel"}
                </button>

                {/* Delete button */}
                <button
                  onClick={() => handleDelete(court.id, court.name)}
                  disabled={isPending}
                  className="text-text-muted hover:text-red-500 transition-colors p-1"
                  title="Eliminar campo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-text-muted">
        <span className="font-semibold">Qualidade:</span>
        <div className="flex items-center gap-1">
          <Badge variant="success">Bom</Badge>
          <span>max 2x por jogador</span>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="warning">Medio</Badge>
          <span>max 1x por jogador</span>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="danger">Mau</Badge>
          <span>max 1x por jogador</span>
        </div>
      </div>
    </div>
  );
}
