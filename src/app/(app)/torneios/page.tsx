export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function MeusTorneiosPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { playerId: true },
  });

  if (!user?.playerId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Os Meus Torneios</h1>
        <EmptyState
          title="Sem perfil de jogador"
          description="O seu perfil de jogador ainda não foi criado. Junte-se a uma liga para começar."
          icon={
            <svg className="w-12 h-12 text-text-muted/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
      </div>
    );
  }

  // Get all tournaments the player is inscribed in
  const inscriptions = await prisma.tournamentInscription.findMany({
    where: { playerId: user.playerId },
    include: {
      tournament: {
        include: {
          league: true,
          season: true,
          _count: { select: { inscriptions: true, rounds: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Separate into active and past
  const activeTournaments = inscriptions.filter(
    (i) => i.tournament.status !== "FINISHED"
  );
  const pastTournaments = inscriptions.filter(
    (i) => i.tournament.status === "FINISHED"
  );

  const statusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="default">Rascunho</Badge>;
      case "PUBLISHED":
        return <Badge variant="info">Publicado</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="success">Em Curso</Badge>;
      case "FINISHED":
        return <Badge variant="default">Terminado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const inscriptionBadge = (status: string) => {
    switch (status) {
      case "TITULAR":
        return <Badge variant="success">Titular</Badge>;
      case "SUPLENTE":
        return <Badge variant="warning">Suplente</Badge>;
      case "PROMOVIDO":
        return <Badge variant="info">Promovido</Badge>;
      case "DESISTIU":
        return <Badge variant="danger">Desistiu</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const teamModeLabel = (mode: string) => {
    switch (mode) {
      case "FIXED_TEAMS": return "Equipas Fixas";
      case "RANDOM_PER_ROUND": return "Aleatório";
      case "AMERICANO": return "Americano";
      case "SOBE_DESCE": return "Sobe e Desce";
      case "NONSTOP": return "Nonstop";
      case "LADDER": return "Escada";
      case "RANKED_SPLIT": return "Ranked Split";
      default: return mode;
    }
  };

  const TournamentCard = ({ inscription }: { inscription: typeof inscriptions[0] }) => {
    const t = inscription.tournament;
    return (
      <Link href={`/torneios/${t.id}`} className="block group">
        <Card className="p-5 hover:border-primary/30 hover:shadow-md transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-text group-hover:text-primary transition-colors truncate">
                {t.name}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                {t.league && <span>{t.league.name}</span>}
                {t.league && t.season && <span>·</span>}
                {t.season && <span>{t.season.name}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {inscriptionBadge(inscription.status)}
              {statusBadge(t.status)}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
            {t.startDate && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {new Date(t.startDate).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            )}
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t._count.inscriptions} jogadores
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              {t._count.rounds} rondas
            </span>
            <span>{teamModeLabel(t.teamMode)}</span>
          </div>
        </Card>
      </Link>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold">Os Meus Torneios</h1>
        <p className="text-sm text-text-muted mt-1">
          Todos os torneios em que estou inscrito
        </p>
      </div>

      {inscriptions.length === 0 ? (
        <EmptyState
          title="Sem torneios"
          description="Ainda não está inscrito em nenhum torneio. Os seus torneios aparecerão aqui quando for inscrito."
          icon={
            <svg className="w-12 h-12 text-text-muted/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      ) : (
        <>
          {/* Active Tournaments */}
          {activeTournaments.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">
                Torneios Ativos ({activeTournaments.length})
              </h2>
              <div className="space-y-3">
                {activeTournaments.map((insc) => (
                  <TournamentCard key={insc.id} inscription={insc} />
                ))}
              </div>
            </div>
          )}

          {/* Past Tournaments */}
          {pastTournaments.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">
                Torneios Anteriores ({pastTournaments.length})
              </h2>
              <div className="space-y-3">
                {pastTournaments.map((insc) => (
                  <TournamentCard key={insc.id} inscription={insc} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
