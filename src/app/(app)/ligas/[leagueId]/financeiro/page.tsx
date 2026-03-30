import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { FinancialDashboard } from "./financial-dashboard";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { seasons: { orderBy: { createdAt: "desc" } } }
  });
  if (!league) notFound();

  // Check manager
  const isManager = await prisma.leagueManager.findFirst({
    where: { leagueId, userId: session.user.id }
  }) !== null || (session.user as any).role === "ADMINISTRADOR";

  if (!isManager) redirect(`/ligas/${leagueId}`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestão Financeira</h1>
        <p className="text-sm text-text-muted mt-1">{league.name} — Pagamentos e receitas</p>
      </div>
      <FinancialDashboard leagueId={leagueId} seasons={JSON.parse(JSON.stringify(league.seasons))} />
    </div>
  );
}
