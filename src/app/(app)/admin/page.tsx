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
      href: "/admin/analytics",
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

      <div className="mt-6">
        <Link
          href="/admin/analytics"
          className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary-dark font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Ver Analytics Detalhado
        </Link>
      </div>
    </div>
  );
}
