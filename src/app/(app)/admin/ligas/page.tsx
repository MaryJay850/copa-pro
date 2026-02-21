export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeagueManagersPanel } from "./league-managers-panel";
import { LeagueActiveToggle } from "./league-active-toggle";

function serialize<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export default async function AdminLeaguesPage() {
  await requireAdmin();

  const leagues = await prisma.league.findMany({
    include: {
      managers: { include: { user: { include: { player: true } } } },
      _count: {
        select: {
          seasons: true,
          tournaments: true,
          memberships: { where: { status: "APPROVED" } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const users = await prisma.user.findMany({
    include: { player: true },
    orderBy: { email: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Gestão de Ligas</h1>
      <div className="space-y-4">
        {leagues.map((league) => (
          <Card
            key={league.id}
            className={`p-4 transition-opacity ${!league.isActive ? "opacity-60" : ""}`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex-1">
                <CardHeader className="p-0 mb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{league.name}</CardTitle>
                    <LeagueActiveToggle
                      leagueId={league.id}
                      isActive={league.isActive}
                    />
                  </div>
                </CardHeader>
                <div className="flex gap-3 text-xs text-text-muted mb-3">
                  <span>{league._count.seasons} épocas</span>
                  <span>{league._count.tournaments} torneios</span>
                  <span>{league._count.memberships} membros</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {league.managers.length === 0 ? (
                    <Badge variant="warning">Sem gestores</Badge>
                  ) : (
                    league.managers.map((m) => (
                      <Badge key={m.id} variant="info">
                        {m.user.player?.fullName ?? m.user.email}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 w-full sm:w-64">
                <LeagueManagersPanel
                  leagueId={league.id}
                  currentManagers={serialize(
                    league.managers.map((m) => ({
                      userId: m.userId,
                      name: m.user.player?.fullName ?? m.user.email,
                    }))
                  )}
                  allUsers={serialize(
                    users.map((u) => ({
                      id: u.id,
                      name: u.player?.fullName ?? u.email,
                    }))
                  )}
                />
              </div>
            </div>
          </Card>
        ))}
        {leagues.length === 0 && (
          <p className="text-sm text-text-muted text-center py-8">
            Nenhuma liga criada.
          </p>
        )}
      </div>
    </div>
  );
}
