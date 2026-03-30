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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  let leagues = managedLeagues.map((m) => m.league);

  if (user?.role === "ADMINISTRADOR" && leagues.length === 0) {
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

  const availabilityCount = await prisma.playerAvailability.count({
    where: {
      status: "AVAILABLE",
      tournament: {
        status: { in: ["DRAFT", "PUBLISHED", "RUNNING"] },
        league: {
          managers: { some: { userId } },
        },
      },
    },
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold">Painel de Gestão</h1>
        <p className="text-sm text-text-muted mt-1 font-medium">
          Visão geral das suas ligas
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card className="stat-card stat-card-blue py-4 px-5 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-text tabular-nums">{leagues.length}</p>
            <p className="text-xs text-text-muted font-medium">Ligas Geridas</p>
          </div>
        </Card>
        <Card className="stat-card stat-card-amber py-4 px-5 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-text tabular-nums">{pendingSubmissions}</p>
            <p className="text-xs text-text-muted font-medium">Resultados Pendentes</p>
          </div>
        </Card>
        <Card className="stat-card stat-card-green py-4 px-5 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-text tabular-nums">{availabilityCount}</p>
            <p className="text-xs text-text-muted font-medium">Disponíveis (7 dias)</p>
          </div>
        </Card>
        <Card className="stat-card stat-card-red py-4 px-5 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-text tabular-nums">
              {leagues.reduce((s, l) => s + l.memberships.length, 0)}
            </p>
            <p className="text-xs text-text-muted font-medium">Pedidos Pendentes</p>
          </div>
        </Card>
      </div>

      {leagues.length === 0 ? (
        <EmptyState
          title="Sem ligas atribuídas"
          description="Não gere nenhuma liga. Contacte um administrador."
        />
      ) : (
        <div className="space-y-4">
          {leagues.map((league, i) => (
            <Card key={league.id} className={`animate-fade-in-up stagger-${i + 1}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Link
                    href={`/ligas/${league.id}`}
                    className="hover:text-primary transition-colors"
                  >
                    <CardTitle>{league.name}</CardTitle>
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted font-medium">
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

              {league.seasons.flatMap((s) => s.tournaments).length > 0 ? (
                <div className="space-y-2">
                  {league.seasons
                    .flatMap((s) => s.tournaments)
                    .map((t) => {
                      const finished = t.matches.length;
                      const total = t._count.matches;
                      const pct = total > 0 ? Math.round((finished / total) * 100) : 0;
                      return (
                        <Link key={t.id} href={`/torneios/${t.id}`}>
                          <div className="flex items-center justify-between px-3 py-2.5 bg-surface-alt rounded-xl hover:bg-surface-hover transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{t.name}</span>
                              <Badge
                                variant={t.status === "RUNNING" ? "warning" : "info"}
                                pulse={t.status === "RUNNING"}
                              >
                                {t.status === "RUNNING" ? "A decorrer" : "Publicado"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-20 bg-surface-hover rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-primary to-primary-light rounded-full h-1.5 transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-text-muted font-semibold tabular-nums w-8 text-right">
                                {pct}%
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                </div>
              ) : (
                <p className="text-xs text-text-muted font-medium px-1">
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
