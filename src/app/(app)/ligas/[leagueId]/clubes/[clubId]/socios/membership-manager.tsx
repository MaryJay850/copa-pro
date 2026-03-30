"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  createMembership,
  updateMembership,
  renewMembership,
  cancelMembership,
} from "@/lib/actions/membership-actions";
import { sanitizeError } from "@/lib/error-utils";

// ── Types ──

type Membership = {
  id: string;
  clubId: string;
  playerId: string;
  type: "MENSAL" | "TRIMESTRAL" | "ANUAL";
  startDate: string;
  endDate: string;
  amount: number;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  notes: string | null;
  player: {
    id: string;
    fullName: string;
    nickname: string | null;
  };
};

type Player = {
  id: string;
  name: string;
  nickname: string | null;
};

type StatusFilter = "ALL" | "ACTIVE" | "EXPIRED" | "CANCELLED";

// ── Helpers ──

const typeLabels: Record<string, string> = {
  MENSAL: "Mensal",
  TRIMESTRAL: "Trimestral",
  ANUAL: "Anual",
};

const typeBadgeVariant: Record<string, "info" | "warning" | "success"> = {
  MENSAL: "info",
  TRIMESTRAL: "warning",
  ANUAL: "success",
};

const statusBadgeVariant: Record<string, "success" | "warning" | "danger"> = {
  ACTIVE: "success",
  EXPIRED: "warning",
  CANCELLED: "danger",
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Ativo",
  EXPIRED: "Expirado",
  CANCELLED: "Cancelado",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

// ── Component ──

export function MembershipManager({
  clubId,
  leagueId,
  memberships: initialMemberships,
  players,
  canManage,
}: {
  clubId: string;
  leagueId: string;
  memberships: Membership[];
  players: Player[];
  canManage: boolean;
}) {
  const [memberships, setMemberships] = useState<Membership[]>(initialMemberships);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMembership, setEditingMembership] = useState<Membership | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // ── Stats ──

  const stats = useMemo(() => {
    const active = memberships.filter((m) => m.status === "ACTIVE");
    const nonCancelled = memberships.filter((m) => m.status !== "CANCELLED");

    const totalRevenue = nonCancelled.reduce((sum, m) => sum + m.amount, 0);

    let monthlyRevenue = 0;
    for (const m of active) {
      switch (m.type) {
        case "MENSAL":
          monthlyRevenue += m.amount;
          break;
        case "TRIMESTRAL":
          monthlyRevenue += m.amount / 3;
          break;
        case "ANUAL":
          monthlyRevenue += m.amount / 12;
          break;
      }
    }

    return {
      activeCount: active.length,
      totalRevenue,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
    };
  }, [memberships]);

  // ── Filtered memberships ──

  const filteredMemberships = useMemo(() => {
    if (statusFilter === "ALL") return memberships;
    return memberships.filter((m) => m.status === statusFilter);
  }, [memberships, statusFilter]);

  // ── Actions ──

  const handleRenew = (membershipId: string) => {
    startTransition(async () => {
      try {
        await renewMembership(membershipId);
        toast.success("Mensalidade renovada com sucesso.");
        router.refresh();
      } catch (err) {
        toast.error(sanitizeError(err, "Erro ao renovar mensalidade."));
      }
    });
  };

  const handleCancel = (membershipId: string, playerName: string) => {
    if (!confirm(`Cancelar a mensalidade de ${playerName}?`)) return;
    startTransition(async () => {
      try {
        await cancelMembership(membershipId);
        setMemberships((prev) =>
          prev.map((m) => (m.id === membershipId ? { ...m, status: "CANCELLED" as const } : m))
        );
        toast.success("Mensalidade cancelada.");
        router.refresh();
      } catch (err) {
        toast.error(sanitizeError(err, "Erro ao cancelar mensalidade."));
      }
    });
  };

  // ── Filter tabs ──

  const filterTabs: { key: StatusFilter; label: string }[] = [
    { key: "ALL", label: "Todos" },
    { key: "ACTIVE", label: "Ativos" },
    { key: "EXPIRED", label: "Expirados" },
    { key: "CANCELLED", label: "Cancelados" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Socios Ativos</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-bold">{stats.activeCount}</span>
            <Badge variant="success">{stats.activeCount}</Badge>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Receita Total</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalRevenue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Receita Mensal</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(stats.monthlyRevenue)}</p>
        </Card>
      </div>

      {/* Filter Tabs + Add Button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-surface rounded-lg border border-border p-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                statusFilter === tab.key
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-muted hover:text-text hover:bg-surface-hover"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Adicionar Socio
            </span>
          </Button>
        )}
      </div>

      {/* Memberships Table */}
      <Card className="p-0 overflow-hidden">
        {filteredMemberships.length === 0 ? (
          <p className="text-sm text-text-muted py-8 text-center">
            Nenhuma mensalidade encontrada.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt/50">
                  <th className="text-left px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wide">Jogador</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wide">Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wide">Periodo</th>
                  <th className="text-right px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wide">Valor</th>
                  <th className="text-center px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wide">Estado</th>
                  {canManage && (
                    <th className="text-right px-4 py-3 font-semibold text-text-muted text-xs uppercase tracking-wide">Acoes</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredMemberships.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-b-0 hover:bg-surface-alt/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{m.player.fullName}</p>
                      {m.player.nickname && (
                        <p className="text-xs text-text-muted">{m.player.nickname}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={typeBadgeVariant[m.type]}>{typeLabels[m.type]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {formatDate(m.startDate)} → {formatDate(m.endDate)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(m.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={statusBadgeVariant[m.status]} pulse={m.status === "ACTIVE"}>
                        {statusLabels[m.status]}
                      </Badge>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {m.status === "EXPIRED" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleRenew(m.id)}
                              disabled={isPending}
                            >
                              Renovar
                            </Button>
                          )}
                          {m.status === "ACTIVE" && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleCancel(m.id, m.player.fullName)}
                              disabled={isPending}
                            >
                              Cancelar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingMembership(m)}
                            disabled={isPending}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Member Modal */}
      {canManage && (
        <AddMemberModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          clubId={clubId}
          leagueId={leagueId}
          players={players}
          existingPlayerIds={memberships.filter((m) => m.status === "ACTIVE").map((m) => m.playerId)}
          onSuccess={() => {
            setShowAddModal(false);
            router.refresh();
          }}
        />
      )}

      {/* Edit Modal */}
      {canManage && editingMembership && (
        <EditMemberModal
          open={!!editingMembership}
          onClose={() => setEditingMembership(null)}
          membership={editingMembership}
          onSuccess={() => {
            setEditingMembership(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

// ── Add Member Modal ──

function AddMemberModal({
  open,
  onClose,
  clubId,
  leagueId,
  players,
  existingPlayerIds,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  clubId: string;
  leagueId: string;
  players: Player[];
  existingPlayerIds: string[];
  onSuccess: () => void;
}) {
  const [playerId, setPlayerId] = useState("");
  const [type, setType] = useState<"MENSAL" | "TRIMESTRAL" | "ANUAL">("MENSAL");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const availablePlayers = players.filter((p) => !existingPlayerIds.includes(p.id));

  const resetForm = () => {
    setPlayerId("");
    setType("MENSAL");
    setAmount("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setNotes("");
  };

  const handleSubmit = () => {
    if (!playerId || !amount || parseFloat(amount) < 0) {
      toast.error("Preencha todos os campos obrigatorios.");
      return;
    }
    startTransition(async () => {
      try {
        await createMembership({
          clubId,
          playerId,
          type,
          startDate,
          amount: parseFloat(amount),
          notes: notes.trim() || undefined,
        });
        toast.success("Socio adicionado com sucesso.");
        resetForm();
        onSuccess();
      } catch (err) {
        toast.error(sanitizeError(err, "Erro ao adicionar socio."));
      }
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Adicionar Socio"
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isPending || !playerId || !amount}>
            {isPending ? "A guardar..." : "Adicionar"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Player select */}
        <div>
          <label className="block text-xs font-semibold text-text mb-1">Jogador *</label>
          <select
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface"
          >
            <option value="">Selecionar jogador...</option>
            {availablePlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}{p.nickname ? ` (${p.nickname})` : ""}
              </option>
            ))}
          </select>
          {availablePlayers.length === 0 && (
            <p className="text-xs text-text-muted mt-1">
              Todos os jogadores da liga ja sao socios ativos deste clube.
            </p>
          )}
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-semibold text-text mb-1">Tipo *</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface"
          >
            <option value="MENSAL">Mensal</option>
            <option value="TRIMESTRAL">Trimestral</option>
            <option value="ANUAL">Anual</option>
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold text-text mb-1">Valor (EUR) *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface"
          />
        </div>

        {/* Start date */}
        <div>
          <label className="block text-xs font-semibold text-text mb-1">Data de inicio *</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-text mb-1">Notas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas opcionais..."
            rows={2}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface resize-none"
          />
        </div>
      </div>
    </Modal>
  );
}

// ── Edit Member Modal ──

function EditMemberModal({
  open,
  onClose,
  membership,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  membership: Membership;
  onSuccess: () => void;
}) {
  const [type, setType] = useState<"MENSAL" | "TRIMESTRAL" | "ANUAL">(membership.type);
  const [amount, setAmount] = useState(membership.amount.toString());
  const [notes, setNotes] = useState(membership.notes || "");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) < 0) {
      toast.error("O valor deve ser positivo.");
      return;
    }
    startTransition(async () => {
      try {
        await updateMembership(membership.id, {
          type,
          amount: parseFloat(amount),
          notes: notes.trim() || undefined,
        });
        toast.success("Mensalidade atualizada com sucesso.");
        onSuccess();
      } catch (err) {
        toast.error(sanitizeError(err, "Erro ao atualizar mensalidade."));
      }
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Editar — ${membership.player.fullName}`}
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isPending || !amount}>
            {isPending ? "A guardar..." : "Guardar"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Player info (read-only) */}
        <div>
          <label className="block text-xs font-semibold text-text mb-1">Jogador</label>
          <div className="rounded-lg border border-border px-3 py-2 text-sm bg-surface-alt/50 text-text-muted">
            {membership.player.fullName}
            {membership.player.nickname ? ` (${membership.player.nickname})` : ""}
          </div>
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-semibold text-text mb-1">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface"
          >
            <option value="MENSAL">Mensal</option>
            <option value="TRIMESTRAL">Trimestral</option>
            <option value="ANUAL">Anual</option>
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold text-text mb-1">Valor (EUR)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface"
          />
        </div>

        {/* Current period (read-only) */}
        <div>
          <label className="block text-xs font-semibold text-text mb-1">Periodo atual</label>
          <div className="rounded-lg border border-border px-3 py-2 text-sm bg-surface-alt/50 text-text-muted">
            {formatDate(membership.startDate)} → {formatDate(membership.endDate)}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-text mb-1">Notas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas opcionais..."
            rows={2}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface resize-none"
          />
        </div>

        {/* Status info */}
        <div>
          <label className="block text-xs font-semibold text-text mb-1">Estado</label>
          <Badge variant={statusBadgeVariant[membership.status]}>
            {statusLabels[membership.status]}
          </Badge>
        </div>
      </div>
    </Modal>
  );
}
