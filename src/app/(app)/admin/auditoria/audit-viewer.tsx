"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAuditLogs } from "@/lib/actions/audit-actions";

type AuditEntry = {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
};

const ACTION_COLORS: Record<string, string> = {
  SAVE_MATCH: "bg-emerald-100 text-emerald-800",
  RESET_MATCH: "bg-amber-100 text-amber-800",
  CREATE_TOURNAMENT: "bg-blue-100 text-blue-800",
  FINISH_TOURNAMENT: "bg-emerald-100 text-emerald-800",
  REOPEN_TOURNAMENT: "bg-amber-100 text-amber-800",
  DELETE_TOURNAMENT: "bg-red-100 text-red-800",
  CREATE_USER: "bg-blue-100 text-blue-800",
  UPDATE_USER: "bg-purple-100 text-purple-800",
  DELETE_USER: "bg-red-100 text-red-800",
  UPDATE_ROLE: "bg-purple-100 text-purple-800",
  UPDATE_SETTING: "bg-gray-100 text-gray-800",
};

export function AuditLogViewer() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");

  const limit = 20;

  useEffect(() => {
    setLoading(true);
    const filters: Record<string, string> = {};
    if (actionFilter) filters.action = actionFilter;
    if (entityFilter) filters.entity = entityFilter;

    getAuditLogs(Object.keys(filters).length > 0 ? filters : undefined, page, limit)
      .then((data) => {
        setEntries(data.logs as AuditEntry[]);
        setTotal(data.total);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [page, actionFilter, entityFilter]);

  const totalPages = Math.ceil(total / limit);

  const handleExportCSV = () => {
    const csv = [
      ["Data", "Utilizador", "Acao", "Entidade", "ID Entidade", "Detalhes"].join(","),
      ...entries.map((e) =>
        [
          new Date(e.createdAt).toLocaleString("pt-PT"),
          e.userName || "Sistema",
          e.action,
          e.entity,
          e.entityId || "",
          (e.details || "").replace(/,/g, ";"),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Filtrar acao..."
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <input
          type="text"
          placeholder="Filtrar entidade..."
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <Button size="sm" variant="secondary" onClick={handleExportCSV} disabled={entries.length === 0}>
          Exportar CSV
        </Button>
        <span className="text-xs text-text-muted">{total} registos</span>
      </div>

      {/* Table */}
      <Card>
        {loading && entries.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-text-muted text-sm">A carregar...</div>
        ) : entries.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-text-muted text-sm">Sem registos.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-muted uppercase tracking-wide">
                  <th className="pb-2 px-3">Data</th>
                  <th className="pb-2 px-3">Utilizador</th>
                  <th className="pb-2 px-3">Acao</th>
                  <th className="pb-2 px-3">Entidade</th>
                  <th className="pb-2 px-3">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/50 hover:bg-surface-alt transition-colors">
                    <td className="py-2 px-3 text-xs text-text-muted whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleString("pt-PT", {
                        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                      })}
                    </td>
                    <td className="py-2 px-3 text-xs">{entry.userName || "Sistema"}</td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${ACTION_COLORS[entry.action] || "bg-gray-100 text-gray-800"}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs">
                      {entry.entity}
                      {entry.entityId && (
                        <span className="text-text-muted ml-1">#{entry.entityId.slice(0, 8)}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-xs text-text-muted max-w-[200px] truncate">
                      {entry.details || "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button size="sm" variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            Anterior
          </Button>
          <span className="text-xs text-text-muted">{page} / {totalPages}</span>
          <Button size="sm" variant="ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
            Seguinte
          </Button>
        </div>
      )}
    </div>
  );
}
