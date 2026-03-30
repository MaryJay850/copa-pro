"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  createReservation,
  updateReservationStatus,
  deleteReservation,
  getLeagueReservations,
} from "@/lib/actions/reservation-actions";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  User,
  Trash2,
  Check,
  X,
  CheckCircle,
} from "lucide-react";

// ── Types ──

type Court = {
  id: string;
  name: string;
  clubName: string;
  quality: string;
  isAvailable: boolean;
  orderIndex: number;
};

type Reservation = {
  id: string;
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  playerName: string | null;
  notes: string | null;
  price: number | null;
  player: { id: string; fullName: string; nickname: string | null } | null;
  court: {
    id: string;
    name: string;
    club?: { id: string; name: string } | null;
  };
};

interface Props {
  leagueId: string;
  courts: Court[];
  canManage: boolean;
}

// ── Constants ──

const TIME_SLOTS = [
  "08:00", "09:30", "11:00", "12:30",
  "14:00", "15:30", "17:00", "18:30",
  "20:00", "21:30",
];

const TIME_SLOT_LABELS: Record<string, string> = {
  "08:00": "08:00",
  "09:30": "09:30",
  "11:00": "11:00",
  "12:30": "12:30",
  "14:00": "14:00",
  "15:30": "15:30",
  "17:00": "17:00",
  "18:30": "18:30",
  "20:00": "20:00",
  "21:30": "21:30",
};

function getEndTimeForSlot(startTime: string): string {
  const idx = TIME_SLOTS.indexOf(startTime);
  if (idx >= 0 && idx < TIME_SLOTS.length - 1) return TIME_SLOTS[idx + 1];
  return "23:00";
}

const DAY_NAMES = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
const DAY_NAMES_FULL = [
  "Segunda-feira",
  "Terca-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sabado",
  "Domingo",
];

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  CONFIRMED: {
    label: "Confirmada",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  PENDING: {
    label: "Pendente",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  CANCELLED: {
    label: "Cancelada",
    bg: "bg-gray-50",
    text: "text-gray-500",
    border: "border-gray-200",
  },
  COMPLETED: {
    label: "Concluida",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
};

// ── Helpers ──

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDateShort(date: Date): string {
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}`;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function getReservationForSlot(
  reservations: Reservation[],
  courtId: string,
  dateStr: string,
  startTime: string,
): Reservation | undefined {
  return reservations.find((r) => {
    const rDate = formatDate(new Date(r.date));
    return (
      r.courtId === courtId &&
      rDate === dateStr &&
      r.startTime <= startTime &&
      r.endTime > startTime
    );
  });
}

function isSlotStart(
  reservation: Reservation,
  startTime: string,
): boolean {
  return reservation.startTime === startTime;
}

function getReservationDisplayName(r: Reservation): string {
  if (r.player) return r.player.nickname || r.player.fullName;
  if (r.playerName) return r.playerName;
  return "Reserva";
}

// ── Component ──

export function ReservationCalendar({ leagueId, courts, canManage }: Props) {
  const today = new Date();
  const [weekStart, setWeekStart] = useState<Date>(getMonday(today));
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const day = today.getDay();
    return day === 0 ? 6 : day - 1; // 0=Mon, 6=Sun
  });
  const [selectedCourtFilter, setSelectedCourtFilter] = useState<string>("all");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    courtId: "",
    date: "",
    startTime: "",
    endTime: "",
    playerName: "",
    notes: "",
  });

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);

  const currentDate = addDays(weekStart, selectedDay);

  const filteredCourts =
    selectedCourtFilter === "all"
      ? courts
      : courts.filter((c) => c.id === selectedCourtFilter);

  // ── Load reservations ──

  const loadReservations = useCallback(() => {
    setLoading(true);
    startTransition(async () => {
      try {
        const data = await getLeagueReservations(
          leagueId,
          formatDate(weekStart),
        );
        setReservations(data as unknown as Reservation[]);
      } catch (err) {
        toast.error("Erro ao carregar reservas");
      } finally {
        setLoading(false);
      }
    });
  }, [leagueId, weekStart]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  // ── Navigation ──

  const goToPrevWeek = () => setWeekStart(addDays(weekStart, -7));
  const goToNextWeek = () => setWeekStart(addDays(weekStart, 7));
  const goToToday = () => {
    const m = getMonday(today);
    setWeekStart(m);
    const day = today.getDay();
    setSelectedDay(day === 0 ? 6 : day - 1);
  };

  // ── Create reservation ──

  const openCreateModal = (courtId: string, timeSlot: string) => {
    const date = formatDate(currentDate);
    setCreateForm({
      courtId,
      date,
      startTime: timeSlot,
      endTime: getEndTimeForSlot(timeSlot),
      playerName: "",
      notes: "",
    });
    setShowCreateModal(true);
  };

  const handleCreate = () => {
    if (!createForm.courtId || !createForm.date || !createForm.startTime || !createForm.endTime) {
      toast.error("Preencha todos os campos obrigatorios");
      return;
    }
    startTransition(async () => {
      try {
        await createReservation({
          courtId: createForm.courtId,
          date: createForm.date,
          startTime: createForm.startTime,
          endTime: createForm.endTime,
          playerName: createForm.playerName || undefined,
          leagueId,
          notes: createForm.notes || undefined,
        });
        toast.success("Reserva criada com sucesso");
        setShowCreateModal(false);
        loadReservations();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao criar reserva");
      }
    });
  };

  // ── Manage reservation ──

  const openDetailModal = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowDetailModal(true);
  };

  const handleStatusChange = (
    status: "CONFIRMED" | "CANCELLED" | "COMPLETED",
  ) => {
    if (!selectedReservation) return;
    startTransition(async () => {
      try {
        await updateReservationStatus(selectedReservation.id, status);
        toast.success(
          `Reserva ${STATUS_CONFIG[status].label.toLowerCase()}`,
        );
        setShowDetailModal(false);
        loadReservations();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erro ao atualizar reserva",
        );
      }
    });
  };

  const handleDelete = () => {
    if (!selectedReservation) return;
    startTransition(async () => {
      try {
        await deleteReservation(selectedReservation.id);
        toast.success("Reserva eliminada");
        setShowDetailModal(false);
        loadReservations();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erro ao eliminar reserva",
        );
      }
    });
  };

  // ── Week header info ──

  const weekEnd = addDays(weekStart, 6);
  const weekLabel = `${formatDateShort(weekStart)} - ${formatDateShort(weekEnd)}`;
  const isCurrentWeek = isSameDay(getMonday(today), weekStart);

  // ── Render ──

  if (courts.length === 0) {
    return (
      <Card className="text-center py-12">
        <MapPin className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-40" />
        <p className="text-text-muted font-medium">Nenhum campo disponivel</p>
        <p className="text-sm text-text-muted mt-1">
          Adicione campos aos clubes da liga para gerir reservas.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <Card className="p-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Week navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={goToPrevWeek}
              aria-label="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold text-text min-w-[130px] text-center">
              {weekLabel}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={goToNextWeek}
              aria-label="Proxima semana"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            {!isCurrentWeek && (
              <Button variant="ghost" size="sm" onClick={goToToday}>
                Hoje
              </Button>
            )}
          </div>

          {/* Court filter */}
          {courts.length > 1 && (
            <select
              value={selectedCourtFilter}
              onChange={(e) => setSelectedCourtFilter(e.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">Todos os campos ({courts.length})</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.clubName}
                </option>
              ))}
            </select>
          )}
        </div>
      </Card>

      {/* ── Day Tabs ── */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {DAY_NAMES.map((name, idx) => {
          const dayDate = addDays(weekStart, idx);
          const isToday = isSameDay(dayDate, today);
          const isSelected = selectedDay === idx;
          return (
            <button
              key={idx}
              onClick={() => setSelectedDay(idx)}
              className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                isSelected
                  ? "bg-primary text-white shadow-[0_2px_6px_0_rgba(87,102,218,0.4)]"
                  : isToday
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-surface text-text-muted border border-border hover:bg-surface-hover hover:border-primary/30"
              }`}
            >
              <span>{name}</span>
              <span className={`text-[11px] mt-0.5 ${isSelected ? "text-white/80" : ""}`}>
                {formatDateShort(dayDate)}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Day header ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">
          {DAY_NAMES_FULL[selectedDay]},{" "}
          {currentDate.getDate()}/{currentDate.getMonth() + 1}/{currentDate.getFullYear()}
        </h2>
        {loading && (
          <span className="text-xs text-text-muted animate-pulse">
            A carregar...
          </span>
        )}
      </div>

      {/* ── Calendar Grid ── */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[400px]">
            {/* Court headers */}
            <thead>
              <tr className="border-b border-border">
                <th className="p-2 text-xs font-semibold text-text-muted text-left w-[72px] bg-surface sticky left-0 z-10 border-r border-border">
                  <Clock className="w-3.5 h-3.5 inline mr-1 opacity-60" />
                  Hora
                </th>
                {filteredCourts.map((court) => (
                  <th
                    key={court.id}
                    className="p-2 text-xs font-semibold text-text text-center border-r border-border last:border-r-0 min-w-[140px]"
                  >
                    <div>{court.name}</div>
                    <div className="text-[10px] font-normal text-text-muted">
                      {court.clubName}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((timeSlot) => {
                const dateStr = formatDate(currentDate);
                return (
                  <tr
                    key={timeSlot}
                    className="border-b border-border last:border-b-0"
                  >
                    {/* Time label */}
                    <td className="p-2 text-xs font-medium text-text-muted bg-surface sticky left-0 z-10 border-r border-border whitespace-nowrap">
                      {TIME_SLOT_LABELS[timeSlot]}
                    </td>

                    {/* Court cells */}
                    {filteredCourts.map((court) => {
                      const reservation = getReservationForSlot(
                        reservations,
                        court.id,
                        dateStr,
                        timeSlot,
                      );

                      if (reservation) {
                        const isStart = isSlotStart(reservation, timeSlot);
                        const cfg = STATUS_CONFIG[reservation.status];

                        if (!isStart) {
                          // Continuation of a reservation block - render a continuation cell
                          return (
                            <td
                              key={court.id}
                              className="p-0 border-r border-border last:border-r-0"
                            >
                              <button
                                onClick={() => openDetailModal(reservation)}
                                className={`w-full h-full px-2 py-1.5 text-left transition-opacity hover:opacity-80 ${cfg.bg} border-l-2 ${cfg.border}`}
                              >
                                <span className={`text-[10px] ${cfg.text} opacity-60`}>
                                  ...
                                </span>
                              </button>
                            </td>
                          );
                        }

                        // Start of a reservation
                        return (
                          <td
                            key={court.id}
                            className="p-0 border-r border-border last:border-r-0"
                          >
                            <button
                              onClick={() => openDetailModal(reservation)}
                              className={`w-full text-left px-2 py-1.5 transition-opacity hover:opacity-80 border-l-2 ${cfg.bg} ${cfg.border}`}
                            >
                              <div className={`text-xs font-semibold ${cfg.text} truncate`}>
                                {getReservationDisplayName(reservation)}
                              </div>
                              <div className={`text-[10px] ${cfg.text} opacity-70`}>
                                {reservation.startTime} - {reservation.endTime}
                              </div>
                            </button>
                          </td>
                        );
                      }

                      // Empty slot
                      return (
                        <td
                          key={court.id}
                          className="p-0 border-r border-border last:border-r-0"
                        >
                          {canManage ? (
                            <button
                              onClick={() => openCreateModal(court.id, timeSlot)}
                              className="w-full h-full px-2 py-3 text-left group hover:bg-primary/5 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5 text-text-muted/30 group-hover:text-primary transition-colors mx-auto" />
                            </button>
                          ) : (
                            <div className="px-2 py-3" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className={`w-3 h-3 rounded-sm border ${cfg.bg} ${cfg.border}`}
            />
            <span>{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* ── Create Reservation Modal ── */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nova Reserva"
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCreateModal(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={isPending}>
              {isPending ? "A criar..." : "Criar Reserva"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {/* Court display */}
          <div className="text-xs">
            <span className="font-semibold text-text">Campo: </span>
            <span>
              {courts.find((c) => c.id === createForm.courtId)?.name} —{" "}
              {courts.find((c) => c.id === createForm.courtId)?.clubName}
            </span>
          </div>

          {/* Date */}
          <Input
            label="Data"
            type="date"
            value={createForm.date}
            onChange={(e) =>
              setCreateForm({ ...createForm, date: e.target.value })
            }
          />

          {/* Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-text">Inicio</label>
              <select
                value={createForm.startTime}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    startTime: e.target.value,
                    endTime: getEndTimeForSlot(e.target.value),
                  })
                }
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-text">Fim</label>
              <select
                value={createForm.endTime}
                onChange={(e) =>
                  setCreateForm({ ...createForm, endTime: e.target.value })
                }
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {TIME_SLOTS.filter((t) => t > createForm.startTime)
                  .concat(["23:00"])
                  .map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Player name */}
          <Input
            label="Nome do Jogador"
            placeholder="Nome do jogador ou contacto"
            value={createForm.playerName}
            onChange={(e) =>
              setCreateForm({ ...createForm, playerName: e.target.value })
            }
          />

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-text">Notas</label>
            <textarea
              value={createForm.notes}
              onChange={(e) =>
                setCreateForm({ ...createForm, notes: e.target.value })
              }
              placeholder="Observacoes opcionais..."
              rows={2}
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted/60 transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-primary/30 resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* ── Reservation Detail Modal ── */}
      <Modal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Detalhes da Reserva"
        variant={
          selectedReservation?.status === "CANCELLED" ? "warning" : "default"
        }
        actions={
          canManage && selectedReservation ? (
            <>
              {selectedReservation.status === "PENDING" && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange("CONFIRMED")}
                  disabled={isPending}
                  className="gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Confirmar
                </Button>
              )}
              {(selectedReservation.status === "PENDING" ||
                selectedReservation.status === "CONFIRMED") && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleStatusChange("COMPLETED")}
                    disabled={isPending}
                    className="gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Concluir
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleStatusChange("CANCELLED")}
                    disabled={isPending}
                    className="gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancelar
                  </Button>
                </>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={isPending}
                className="gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDetailModal(false)}
            >
              Fechar
            </Button>
          )
        }
      >
        {selectedReservation && (
          <div className="space-y-3">
            {/* Status badge */}
            <div>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_CONFIG[selectedReservation.status].bg} ${STATUS_CONFIG[selectedReservation.status].text} ${STATUS_CONFIG[selectedReservation.status].border}`}
              >
                {STATUS_CONFIG[selectedReservation.status].label}
              </span>
            </div>

            {/* Details grid */}
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-text-muted mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-text">
                    {selectedReservation.court.name}
                  </span>
                  {selectedReservation.court.club && (
                    <span className="text-text-muted">
                      {" "}
                      — {selectedReservation.court.club.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-muted flex-shrink-0" />
                <span className="text-text">
                  {new Date(selectedReservation.date).toLocaleDateString(
                    "pt-PT",
                  )}{" "}
                  | {selectedReservation.startTime} -{" "}
                  {selectedReservation.endTime}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-text-muted flex-shrink-0" />
                <span className="text-text">
                  {getReservationDisplayName(selectedReservation)}
                </span>
              </div>

              {selectedReservation.price != null && (
                <div className="flex items-center gap-2">
                  <span className="w-4 text-center text-text-muted text-xs font-bold">
                    EUR
                  </span>
                  <span className="text-text font-medium">
                    {selectedReservation.price.toFixed(2)} EUR
                  </span>
                </div>
              )}

              {selectedReservation.notes && (
                <div className="bg-surface-hover rounded-lg p-2.5 text-xs text-text-muted mt-1">
                  {selectedReservation.notes}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
