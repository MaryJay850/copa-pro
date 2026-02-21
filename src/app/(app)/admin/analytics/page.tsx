export const dynamic = "force-dynamic";

import { getAnalytics } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth-guards";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function AnalyticsPage() {
  await requireAdmin();
  const data = await getAnalytics();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-text-muted mb-1">
          <Link href="/admin" className="hover:text-text">Admin</Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-bold">Analytics</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="text-center">
          <p className="text-3xl font-bold text-primary">{data.totals.users}</p>
          <p className="text-xs text-text-muted mt-1">Utilizadores</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-emerald-600">{data.totals.players}</p>
          <p className="text-xs text-text-muted mt-1">Jogadores</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-accent">{data.totals.leagues}</p>
          <p className="text-xs text-text-muted mt-1">Ligas</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-purple-600">{data.totals.tournaments}</p>
          <p className="text-xs text-text-muted mt-1">Torneios</p>
        </Card>
      </div>

      {/* Tournament Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Torneios por Estado</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {data.tournamentsByStatus.map((ts) => (
            <div key={ts.status} className="text-center p-3 bg-surface-alt rounded-lg">
              <p className="text-xl font-bold">{ts._count}</p>
              <p className="text-xs text-text-muted">
                {ts.status === "DRAFT" ? "Rascunho" :
                 ts.status === "PUBLISHED" ? "Publicado" :
                 ts.status === "RUNNING" ? "A decorrer" :
                 ts.status === "FINISHED" ? "Terminado" : ts.status}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Top Leagues */}
      {data.topLeagues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Ligas (por membros)</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {data.topLeagues.map((l, i) => (
              <div key={l.id} className="flex items-center justify-between px-3 py-2 bg-surface-alt rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-text-muted w-6">{i + 1}.</span>
                  <div>
                    <p className="text-sm font-medium">{l.name}</p>
                    {l.location && <p className="text-xs text-text-muted">{l.location}</p>}
                  </div>
                </div>
                <span className="text-sm font-bold text-primary">{l._count.memberships} membros</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Activity */}
      {data.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {data.recentActivity.map((t) => (
              <Link key={t.id} href={`/torneios/${t.id}`} className="flex items-center justify-between px-3 py-2 bg-surface-alt rounded-lg hover:bg-surface-hover transition-colors">
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-text-muted">{t.league.name}</p>
                </div>
                <span className="text-xs text-text-muted">
                  {new Date(t.createdAt).toLocaleDateString("pt-PT")}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
