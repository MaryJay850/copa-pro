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
      colorClass: "stat-card-blue",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: "Ligas",
      value: leagueCount,
      href: "/admin/ligas",
      colorClass: "stat-card-green",
      iconBg: "bg-success/10",
      iconColor: "text-success",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      label: "Torneios",
      value: tournamentCount,
      href: "/admin/analytics",
      colorClass: "stat-card-amber",
      iconBg: "bg-accent/10",
      iconColor: "text-accent",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      label: "Pedidos Pendentes",
      value: pendingRequests,
      href: null,
      colorClass: "stat-card-red",
      iconBg: "bg-danger/10",
      iconColor: "text-danger",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Painel de Administração</h1>
        <p className="text-sm text-text-muted mt-1 font-medium">Visão geral da plataforma</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const content = (
            <Card
              key={stat.label}
              className={`stat-card ${stat.colorClass} card-hover py-5 px-5 animate-fade-in-up stagger-${i + 1}`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-xl ${stat.iconBg} flex items-center justify-center flex-shrink-0 ${stat.iconColor}`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-extrabold text-text tabular-nums mt-0.5">
                    {stat.value}
                  </p>
                </div>
              </div>
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

      <div>
        <Link
          href="/admin/analytics"
          className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary-dark font-semibold transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Ver Analytics Detalhado
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </Link>
      </div>
    </div>
  );
}
