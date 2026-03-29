"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  createClub,
  updateClub,
  deleteClub,
  addCourtToClub,
  updateCourt,
  deleteCourt,
} from "@/lib/actions/club-actions";
import { sanitizeError } from "@/lib/error-utils";

type Court = {
  id: string;
  name: string;
  quality: string;
  isAvailable: boolean;
  orderIndex: number;
  _count: { matches: number; tournamentCourts: number };
};

type Club = {
  id: string;
  name: string;
  location: string | null;
  courts: Court[];
  _count: { tournaments: number; leagueClubs: number; courts: number };
};

export function AdminClubsContent({ clubs }: { clubs: Club[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [savingNew, setSavingNew] = useState(false);
  const [expandedClub, setExpandedClub] = useState<string | null>(null);

  // Court creation
  const [addingCourt, setAddingCourt] = useState<string | null>(null);
  const [courtName, setCourtName] = useState("");
  const [courtQuality, setCourtQuality] = useState("GOOD");
  const [savingCourt, setSavingCourt] = useState(false);

  // Court editing
  const [editingCourt, setEditingCourt] = useState<string | null>(null);
  const [editCourtName, setEditCourtName] = useState("");
  const [editCourtQuality, setEditCourtQuality] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [reordering, setReordering] = useState(false);

  const inputClass = "w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors";

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNew(true);
    try {
      await createClub(newName, newLocation);
      toast.success("Clube criado com sucesso!");
      setNewName("");
      setNewLocation("");
      setCreating(false);
      router.refresh();
    } catch (err) {
      toast.error(sanitizeError(err, "Erro ao criar clube."));
    }
    setSavingNew(false);
  };

  const handleDeleteClub = async (clubId: string, clubName: string) => {
    if (!confirm(`Eliminar o clube "${clubName}" e todos os seus campos?`)) return;
    try {
      await deleteClub(clubId);
      toast.success("Clube eliminado.");
      router.refresh();
    } catch (err) {
      toast.error(sanitizeError(err, "Erro ao eliminar clube."));
    }
  };

  const handleAddCourt = async (e: React.FormEvent, clubId: string) => {
    e.preventDefault();
    setSavingCourt(true);
    try {
      await addCourtToClub({ clubId, name: courtName, quality: courtQuality as any });
      toast.success("Campo adicionado!");
      setCourtName("");
      setCourtQuality("GOOD");
      setAddingCourt(null);
      router.refresh();
    } catch (err) {
      toast.error(sanitizeError(err, "Erro ao adicionar campo."));
    }
    setSavingCourt(false);
  };

  const handleToggleCourtAvailability = async (courtId: string, isAvailable: boolean) => {
    try {
      await updateCourt({ courtId, isAvailable: !isAvailable });
      router.refresh();
    } catch (err) {
      toast.error(sanitizeError(err, "Erro ao alterar disponibilidade."));
    }
  };

  const handleDeleteCourt = async (courtId: string) => {
    try {
      await deleteCourt(courtId);
      toast.success("Campo eliminado.");
      router.refresh();
    } catch (err) {
      toast.error(sanitizeError(err, "Erro ao eliminar campo."));
    }
  };

  const handleStartEditCourt = (court: Court) => {
    setEditingCourt(court.id);
    setEditCourtName(court.name);
    setEditCourtQuality(court.quality);
  };

  const handleSaveEditCourt = async (courtId: string) => {
    setSavingEdit(true);
    try {
      await updateCourt({ courtId, name: editCourtName, quality: editCourtQuality as any });
      toast.success("Campo atualizado.");
      setEditingCourt(null);
      router.refresh();
    } catch (err) {
      toast.error(sanitizeError(err, "Erro ao atualizar campo."));
    }
    setSavingEdit(false);
  };

  const handleMoveCourt = async (club: Club, courtId: string, direction: "up" | "down") => {
    const courtIds = club.courts.map((c) => c.id);
    const idx = courtIds.indexOf(courtId);
    if ((direction === "up" && idx <= 0) || (direction === "down" && idx >= courtIds.length - 1)) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [courtIds[idx], courtIds[swapIdx]] = [courtIds[swapIdx], courtIds[idx]];

    setReordering(true);
    try {
      // Update both courts' orderIndex
      await updateCourt({ courtId: courtIds[idx], orderIndex: idx });
      await updateCourt({ courtId: courtIds[swapIdx], orderIndex: swapIdx });
      router.refresh();
    } catch (err) {
      toast.error(sanitizeError(err, "Erro ao reordenar."));
    }
    setReordering(false);
  };

  const qualityLabel: Record<string, { label: string; color: string }> = {
    GOOD: { label: "Bom", color: "text-success" },
    MEDIUM: { label: "Médio", color: "text-warning" },
    BAD: { label: "Mau", color: "text-danger" },
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="rounded-lg shadow-card bg-surface border border-border overflow-hidden">
        <div className="h-28" style={{ background: "linear-gradient(to right, #5766da, #7c6fe0, #a78bfa)" }} />
        <div className="px-6 pb-6 relative">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border-4 border-surface absolute -top-10 left-6" style={{ background: "linear-gradient(to bottom right, #5766da, #8b9cf7)" }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="pt-14 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-xl font-extrabold tracking-tight">Gestão de Clubes</h1>
              <p className="text-sm text-text-muted mt-0.5">Criar e gerir clubes de padel e os seus campos</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-extrabold text-primary">{clubs.length}</p>
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Clubes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold text-text">{clubs.reduce((sum, c) => sum + c._count.courts, 0)}</p>
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Campos</p>
              </div>
            </div>
            {!creating && (
              <Button onClick={() => setCreating(true)} className="gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Novo Clube
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Create Club Form */}
      {creating && (
        <Card className="py-5 px-6 border-primary/30">
          <h2 className="text-base font-bold mb-4">Novo Clube</h2>
          <form onSubmit={handleCreateClub} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">Nome do Clube</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} required placeholder="Ex: Padel Factory" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">Localização</label>
                <input type="text" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="Ex: Carregado, Lisboa..." className={inputClass} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancelar</Button>
              <Button type="submit" disabled={savingNew}>{savingNew ? "A criar..." : "Criar Clube"}</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Clubs List */}
      {clubs.length === 0 ? (
        <Card className="py-12 text-center">
          <p className="text-text-muted">Sem clubes registados.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {clubs.map((club) => (
            <Card key={club.id} className="py-0 px-0 overflow-hidden">
              {/* Club Header */}
              <div
                className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-surface-hover transition-colors"
                onClick={() => setExpandedClub(expandedClub === club.id ? null : club.id)}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(to bottom right, #5766da, #8b9cf7)" }}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm">{club.name}</h3>
                  {club.location && (
                    <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {club.location}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="default">{club._count.courts} campos</Badge>
                  <Badge variant="default">{club._count.leagueClubs} ligas</Badge>
                  <Badge variant="default">{club._count.tournaments} torneios</Badge>
                  <svg className={`w-4 h-4 text-text-muted transition-transform ${expandedClub === club.id ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedClub === club.id && (
                <div className="border-t border-border px-6 py-5 space-y-4">
                  {/* Courts List */}
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold">Campos</h4>
                    <div className="flex gap-2">
                      {addingCourt !== club.id && (
                        <Button size="sm" variant="secondary" onClick={() => { setAddingCourt(club.id); setCourtName(""); setCourtQuality("GOOD"); }}>
                          + Campo
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger hover:text-danger"
                        onClick={() => handleDeleteClub(club.id, club.name)}
                      >
                        Eliminar Clube
                      </Button>
                    </div>
                  </div>

                  {/* Add Court Form */}
                  {addingCourt === club.id && (
                    <form onSubmit={(e) => handleAddCourt(e, club.id)} className="flex gap-3 items-end p-3 bg-surface-alt rounded-lg">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-text-muted mb-1">Nome</label>
                        <input type="text" value={courtName} onChange={(e) => setCourtName(e.target.value)} required placeholder="Ex: Campo 1" className={inputClass} />
                      </div>
                      <div className="w-32">
                        <label className="block text-xs font-semibold text-text-muted mb-1">Qualidade</label>
                        <select value={courtQuality} onChange={(e) => setCourtQuality(e.target.value)} className={inputClass}>
                          <option value="GOOD">Bom</option>
                          <option value="MEDIUM">Médio</option>
                          <option value="BAD">Mau</option>
                        </select>
                      </div>
                      <Button type="submit" size="sm" disabled={savingCourt}>{savingCourt ? "..." : "Adicionar"}</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setAddingCourt(null)}>Cancelar</Button>
                    </form>
                  )}

                  {club.courts.length === 0 ? (
                    <p className="text-sm text-text-muted py-2">Sem campos registados.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {club.courts.map((court, courtIdx) => {
                        const hasUsage = (court._count?.matches ?? 0) > 0 || (court._count?.tournamentCourts ?? 0) > 0;
                        const isEditing = editingCourt === court.id;

                        if (isEditing) {
                          return (
                            <div key={court.id} className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-primary/30 bg-primary/5">
                              <input
                                type="text"
                                value={editCourtName}
                                onChange={(e) => setEditCourtName(e.target.value)}
                                className="flex-1 text-sm font-medium rounded-lg border border-border bg-surface px-3 py-1.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                autoFocus
                              />
                              <select
                                value={editCourtQuality}
                                onChange={(e) => setEditCourtQuality(e.target.value)}
                                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              >
                                <option value="GOOD">Bom</option>
                                <option value="MEDIUM">Médio</option>
                                <option value="BAD">Mau</option>
                              </select>
                              <Button size="sm" onClick={() => handleSaveEditCourt(court.id)} disabled={savingEdit}>
                                {savingEdit ? "..." : "Guardar"}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingCourt(null)}>Cancelar</Button>
                            </div>
                          );
                        }

                        return (
                          <div key={court.id} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border bg-surface ${court.isAvailable ? "border-border" : "border-border/50 opacity-70"}`}>
                            {/* Reorder buttons */}
                            <div className="flex flex-col gap-0.5">
                              <button
                                onClick={() => handleMoveCourt(club, court.id, "up")}
                                disabled={courtIdx === 0 || reordering}
                                className="text-text-muted hover:text-primary disabled:opacity-20 transition-colors"
                                title="Mover para cima"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                              </button>
                              <button
                                onClick={() => handleMoveCourt(club, court.id, "down")}
                                disabled={courtIdx === club.courts.length - 1 || reordering}
                                className="text-text-muted hover:text-primary disabled:opacity-20 transition-colors"
                                title="Mover para baixo"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                              </button>
                            </div>

                            <span
                              className="flex-1 text-sm font-medium cursor-pointer hover:text-primary transition-colors"
                              onClick={() => handleStartEditCourt(court)}
                              title="Clique para editar"
                            >
                              {court.name}
                            </span>
                            <span
                              className={`text-xs font-semibold cursor-pointer hover:opacity-70 ${qualityLabel[court.quality]?.color || ""}`}
                              onClick={() => handleStartEditCourt(court)}
                              title="Clique para editar"
                            >
                              {qualityLabel[court.quality]?.label || court.quality}
                            </span>
                            {hasUsage && (
                              <span className="text-[10px] text-text-muted font-medium px-1.5 py-0.5 bg-surface-alt rounded">
                                {court._count.tournamentCourts > 0 && `${court._count.tournamentCourts} torneio${court._count.tournamentCourts > 1 ? "s" : ""}`}
                                {court._count.matches > 0 && ` · ${court._count.matches} jogo${court._count.matches > 1 ? "s" : ""}`}
                              </span>
                            )}
                            <button
                              onClick={() => handleToggleCourtAvailability(court.id, court.isAvailable)}
                              className={`text-xs font-medium px-2 py-0.5 rounded ${court.isAvailable ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}
                            >
                              {court.isAvailable ? "Disponível" : "Indisponível"}
                            </button>
                            <button
                              onClick={() => handleStartEditCourt(court)}
                              className="text-xs text-text-muted hover:text-primary transition-colors"
                              title="Editar campo"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            {hasUsage ? (
                              <span className="text-[10px] text-text-muted" title="Campo tem torneios/jogos associados. Desative-o em vez de eliminar.">
                                <svg className="w-3.5 h-3.5 text-text-muted/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleDeleteCourt(court.id)}
                                className="text-xs text-text-muted hover:text-danger transition-colors"
                                title="Eliminar campo"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
