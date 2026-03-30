"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getLeagueFinancials,
  type LeagueFinancialSummary,
  getTournamentPayments,
  type TournamentPaymentInfo,
} from "@/lib/actions/payment-actions";

type Season = {
  id: string;
  name: string;
  createdAt: string;
};

type Props = {
  leagueId: string;
  seasons: Season[];
};

export function FinancialDashboard({ leagueId, seasons }: Props) {
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [summary, setSummary] = useState<LeagueFinancialSummary | null>(null);
  const [recentPayments, setRecentPayments] = useState<TournamentPaymentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const financials = await getLeagueFinancials(
        leagueId,
        selectedSeasonId || undefined
      );
      setSummary(financials);

      // Fetch recent payments from all tournaments in the summary
      const allPayments: TournamentPaymentInfo[] = [];
      for (const t of financials.tournaments.slice(0, 10)) {
        try {
          const payments = await getTournamentPayments(t.id);
          allPayments.push(...payments);
        } catch {
          // skip tournaments we can't access
        }
      }

      // Sort by date descending, take latest 50
      allPayments.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setRecentPayments(allPayments.slice(0, 50));
    } catch (err) {
      toast.error("Erro ao carregar dados financeiros.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [leagueId, selectedSeasonId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (value: number, currency = "EUR") =>
    new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(value);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!summary) {
    return (
      <Card>
        <p className="text-center text-text-muted py-10">
          Sem dados financeiros disponíveis.
        </p>
      </Card>
    );
  }

  const totalReceived = summary.totalReceived + summary.totalManual;
  const totalPaymentCount = summary.tournaments.reduce(
    (sum, t) => sum + t.paymentCount,
    0
  );

  return (
    <div className="space-y-6">
      {/* Season Filter */}
      <div className="flex items-center gap-3">
        <label htmlFor="season-filter" className="text-sm font-medium text-text">
          Época:
        </label>
        <select
          id="season-filter"
          value={selectedSeasonId}
          onChange={(e) => setSelectedSeasonId(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Todas as épocas</option>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="text-center">
          <p className="text-3xl font-bold text-emerald-600">
            {formatCurrency(totalReceived, summary.currency)}
          </p>
          <p className="text-xs text-text-muted mt-1">Total Recebido</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-amber-500">
            {formatCurrency(summary.totalPending, summary.currency)}
          </p>
          <p className="text-xs text-text-muted mt-1">Total Pendente</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-red-500">
            {formatCurrency(summary.totalRefunded, summary.currency)}
          </p>
          <p className="text-xs text-text-muted mt-1">Total Reembolsado</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-primary">{totalPaymentCount}</p>
          <p className="text-xs text-text-muted mt-1">Total Inscrições</p>
        </Card>
      </div>

      {/* Tournament Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Receitas por Torneio</CardTitle>
        </CardHeader>
        {summary.tournaments.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-6">
            Nenhum torneio com pagamentos encontrado.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-muted">
                  <th className="px-5 py-3 font-medium">Torneio</th>
                  <th className="px-5 py-3 font-medium text-right">Pagos</th>
                  <th className="px-5 py-3 font-medium text-right">Total Inscrições</th>
                  <th className="px-5 py-3 font-medium text-right">Recebido</th>
                  <th className="px-5 py-3 font-medium text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {summary.tournaments.map((t) => {
                  const paidCount =
                    t.paymentCount -
                    countByStatus(recentPayments, t.id, "PENDING") -
                    countByStatus(recentPayments, t.id, "REFUNDED");
                  const received = t.received + t.manual;
                  const allPaid = t.pending === 0 && t.paymentCount > 0;
                  const nonePaid = received === 0;

                  return (
                    <tr
                      key={t.id}
                      className="border-b border-border/50 hover:bg-surface-alt/50 transition-colors"
                    >
                      <td className="px-5 py-3 font-medium text-text">
                        {t.name}
                      </td>
                      <td className="px-5 py-3 text-right text-text">
                        {paidCount > 0 ? paidCount : 0}
                      </td>
                      <td className="px-5 py-3 text-right text-text-muted">
                        {t.paymentCount}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-emerald-600">
                        {formatCurrency(received, summary.currency)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {allPaid ? (
                          <Badge variant="success">Completo</Badge>
                        ) : nonePaid ? (
                          <Badge variant="danger">Sem pagamentos</Badge>
                        ) : (
                          <Badge variant="warning">Parcial</Badge>
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

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Pagamentos Recentes</CardTitle>
        </CardHeader>
        {recentPayments.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-6">
            Nenhum pagamento registado.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-muted">
                  <th className="px-5 py-3 font-medium">Jogador</th>
                  <th className="px-5 py-3 font-medium">Torneio</th>
                  <th className="px-5 py-3 font-medium text-right">Valor</th>
                  <th className="px-5 py-3 font-medium text-center">Estado</th>
                  <th className="px-5 py-3 font-medium text-right">Data</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p) => {
                  const tournamentName =
                    summary.tournaments.find((t) => t.id === p.tournamentId)
                      ?.name ?? "—";

                  return (
                    <tr
                      key={p.id}
                      className="border-b border-border/50 hover:bg-surface-alt/50 transition-colors"
                    >
                      <td className="px-5 py-3 text-text">
                        <span className="font-medium">
                          {p.player.nickname ?? p.player.name}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-text-muted">
                        {tournamentName}
                      </td>
                      <td className="px-5 py-3 text-right font-medium">
                        <span
                          className={
                            p.status === "REFUNDED"
                              ? "text-red-500"
                              : p.status === "PENDING"
                                ? "text-amber-500"
                                : "text-emerald-600"
                          }
                        >
                          {formatCurrency(p.amount, p.currency)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <PaymentStatusBadge status={p.status} />
                      </td>
                      <td className="px-5 py-3 text-right text-text-muted">
                        {formatDate(p.paidAt ?? p.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Helpers ──

function PaymentStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "PAID":
      return <Badge variant="success">Pago</Badge>;
    case "MANUAL":
      return <Badge variant="info">Manual</Badge>;
    case "PENDING":
      return <Badge variant="warning">Pendente</Badge>;
    case "REFUNDED":
      return <Badge variant="danger">Reembolsado</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function countByStatus(
  payments: TournamentPaymentInfo[],
  tournamentId: string,
  status: string
): number {
  return payments.filter(
    (p) => p.tournamentId === tournamentId && p.status === status
  ).length;
}
