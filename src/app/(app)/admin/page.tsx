export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function AdminPage() {
  const [userCount, leagueCount, tournamentCount, pendingRequests] =
    await Promise.all([
      prisma.user.count(),
      prisma.league.count(),
      prisma.tournament.count(),
      prisma.leagueMembership.count({ where: { status: "PENDING" } }),
    ]);

  const stats = [
    {
      label: "Utilizadores",
      value: userCount,
      href: "/admin/utilizadores",
    },
    {
      label: "Ligas",
      value: leagueCount,
      href: "/admin/ligas",
    },
    {
      label: "Torneios",
      value: tournamentCount,
      href: null,
    },
    {
      label: "Pedidos Pendentes",
      value: pendingRequests,
      href: null,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Painel de Administração</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const content = (
            <Card
              key={stat.label}
              className="hover:border-primary/50 hover:shadow-md transition-all"
            >
              <CardHeader>
                <p className="text-xs text-text-muted uppercase tracking-wider">
                  {stat.label}
                </p>
                <CardTitle className="text-3xl font-extrabold">
                  {stat.value}
                </CardTitle>
              </CardHeader>
            </Card>
          );
          return stat.href ? (
            <Link key={stat.label} href={stat.href}>
              {content}
            </Link>
          ) : (
            <div key={stat.label}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
