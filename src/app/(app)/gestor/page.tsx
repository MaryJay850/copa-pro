export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function GestorPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // Get leagues this user manages
  const managedLeagues = await prisma.leagueManager.findMany({
    where: { userId },
    include: {
      league: {
        include: {
          seasons: {
            where: { isActive: true },
            include: {
              tournaments: {
                where: { status: { in: ["PUBLISHED", "RUNNING"] } },
                include: {
                  _count: { select: { matches: true } },
                  matches: {
                    where: { status: "FINISHED" },
                    select: { id: true },
                  },
                },
              },
            },
          },
          memberships: { where: { status: "PENDING" }, select: { id: true } },
          _count: { select: { memberships: true } },
        },
      },
    },
  });

  // Also check if admin (admins see all)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  let leagues = managedLeagues.map((m) => m.league);

  if (user?.role === "ADMINISTRADOR" && leagues.length === 0) {
    // Admin sees all leagues if no managed ones
    leagues = await prisma.league.findMany({
      include: {
        seasons: {
          where: { isActive: true },
          include: {
            tournaments: {
              where: { status: { in: ["PUBLISHED", "RUNNING"] } },
              include: {
                _count: { select: { matches: true } },
                matches: {
                  where: { status: "FINISHED" },
                  select: { id: true },
                },
              },
            },
          },
        },
        memberships: { where: { status: "PENDING" }, select: { id: true } },
        _count: { select: { memberships: true } },
      },
    });
  }

  // Pending result submissions across all managed leagues
  const pendingSubmissions = await prisma.matchResultSubmission.count({
    where: {
      status: "PENDING",
      match: {
        tournament: {
          league: {
            managers: { some: { userId } },
          },
        },
      },
    },
  });

  // Get availability for next 7 days across all leagues
  const today = new Date();
  const next7 = new Date();
  next7.setDate(today.getDate() + 7);

  const availabilityCount = await prisma.playerAvailability.count({
    where: {
      available: true,
      date: { gte: today, lte: next7 },
      player: {
        user: {
          leagueMemberships: {
            some: {
              status: "APPROVED",
              league: {
                managers: { some: { userId } },
              },
            },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Painel de Gestao</h1>
        <p className="text-sm text-text-muted mt-1">
          Visao geral das suas ligas
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card className="text-center py-3">
          <p className="text-2xl font-bold text-primary">{leagues.length}</p>
          <p className="text-xs text-text-muted">Ligas Geridas</p>
        </Card>
        <Card className="text-center py-3">
          <p className="text-2xl font-bold text-amber-600">
            {pendingSubmissions}
          </p>
          <p className="text-xs text-text-muted">Resultados Pendentes</p>
        </Card>
        <Card className="text-center py-3">
          <p className="text-2xl font-bold text-emerald-600">
            {availabilityCount}
          </p>
          <p className="text-xs text-text-muted">Disponiveis (7 dias)</p>
        </Card>
        <Card className="text-center py-3">
          <p className="text-2xl font-bold text-red-500">
            {leagues.reduce((s, l) => s + l.memberships.length, 0)}
          </p>
          <p className="text-xs text-text-muted">Pedidos Pendentes</p>
        </Card>
      </div>

      {leagues.length === 0 ? (
        <EmptyState
          title="Sem ligas atribuidas"
          description="Nao gere nenhuma liga. Contacte um administrador."
        />
      ) : (
        <div className="space-y-4">
          {leagues.map((league) => (
            <Card key={league.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Link
                    href={`/ligas/${league.id}`}
                    className="hover:text-primary transition-colors"
                  >
                    <CardTitle>{league.name}</CardTitle>
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">
                      {league._count.memberships} membros
                    </span>
                    {league.memberships.length > 0 && (
                      <Badge variant="warning">
                        {league.memberships.length} pendentes
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* Active tournaments */}
              {league.seasons.flatMap((s) => s.tournaments).length > 0 ? (
                <div className="space-y-2">
                  {league.seasons
                    .flatMap((s) => s.tournaments)
                    .map((t) => {
                      const finished = t.matches.length;
                      const total = t._count.matches;
                      const pct =
                        total > 0 ? Math.round((finished / total) * 100) : 0;
                      return (
                        <Link key={t.id} href={`/torneios/${t.id}`}>
                          <div className="flex items-center justify-between px-3 py-2 bg-surface-alt rounded-lg hover:opacity-80 transition-opacity">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {t.name}
                              </span>
                              <Badge
                                variant={
                                  t.status === "RUNNING" ? "warning" : "info"
                                }
                              >
                                {t.status === "RUNNING"
                                  ? "A decorrer"
                                  : "Publicado"}
                              </Badge>
                            </div>
                            <span className="text-xs text-text-muted">
                              {pct}% ({finished}/{total})
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                </div>
              ) : (
                <p className="text-xs text-text-muted px-3">
                  Sem torneios ativos
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
