export const dynamic = "force-dynamic";

import { getHomepageData } from "@/lib/actions";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RankingTable } from "@/components/ranking-table";
import { RecentResults } from "@/components/recent-results";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";

export default async function HomePage() {
  const data = await getHomepageData();

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="text-center py-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-primary mb-2">
          CopaPro
        </h1>
        <p className="text-lg text-text-muted max-w-xl mx-auto">
          Plataforma de gestão de ligas e torneios de padel. Crie torneios
          Round Robin, forme equipas e acompanhe rankings individuais em tempo
          real.
        </p>
        <div className="flex justify-center gap-3 mt-6">
          <Link href="/ligas">
            <Button size="lg">Ver Ligas</Button>
          </Link>
        </div>
      </section>

      {!data.league ? (
        /* No data yet */
        <Card className="text-center py-8">
          <EmptyState
            title="Sem dados disponíveis"
            description="Crie uma liga e um torneio para começar a ver rankings e resultados aqui."
            action={
              <Link href="/ligas">
                <Button>Criar Liga</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          {/* Active league banner */}
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <span>Liga activa:</span>
            <Link
              href={`/ligas/${data.league.id}`}
              className="font-medium text-text hover:text-primary transition-colors"
            >
              {data.league.name}
            </Link>
            <span>·</span>
            <Link
              href={`/ligas/${data.league.id}/epocas/${data.season!.id}`}
              className="font-medium text-text hover:text-primary transition-colors"
            >
              {data.season!.name}
            </Link>
          </div>

          {/* Active Tournaments */}
          {data.activeTournaments.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Torneios em Curso
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.activeTournaments.map((t) => {
                  const pct =
                    t.totalMatches > 0
                      ? Math.round((t.finishedMatches / t.totalMatches) * 100)
                      : 0;
                  return (
                    <Link key={t.id} href={`/torneios/${t.id}`}>
                      <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{t.name}</h3>
                          <Badge
                            variant={
                              t.status === "RUNNING" ? "warning" : "info"
                            }
                          >
                            {t.status === "RUNNING" ? "A decorrer" : "Publicado"}
                          </Badge>
                        </div>
                        <div className="flex gap-3 text-xs text-text-muted mb-3">
                          <span>{t.teamsCount} equipas</span>
                          <span>
                            {t.finishedMatches}/{t.totalMatches} jogos
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-primary rounded-full h-2 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-text-muted mt-1 text-right">
                          {pct}% completo
                        </p>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Ranking */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">
                Ranking — {data.season!.name}
              </h2>
              <Link
                href={`/ligas/${data.league.id}/epocas/${data.season!.id}`}
                className="text-sm text-primary hover:underline"
              >
                Ver completo →
              </Link>
            </div>
            <Card>
              {data.rankings.length > 0 ? (
                <RankingTable rows={data.rankings} />
              ) : (
                <EmptyState
                  title="Sem ranking"
                  description="Complete jogos para ver o ranking individual."
                />
              )}
            </Card>
          </section>

          {/* Recent Results */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Últimos Resultados</h2>
            <RecentResults matches={data.recentMatches} />
          </section>
        </>
      )}

      {/* Features */}
      <section className="border-t border-border pt-8">
        <h2 className="text-lg font-semibold mb-4 text-center">
          Funcionalidades
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon="🎯"
            title="Round Robin"
            description="Calendário automático onde todas as equipas jogam entre si."
          />
          <FeatureCard
            icon="📊"
            title="Rankings Individuais"
            description="Pontuação por jogador com vitórias, sets e desempate automático."
          />
          <FeatureCard
            icon="👥"
            title="3 Modos de Equipas"
            description="Equipas fixas, aleatórias com seed, ou escolha manual de pares."
          />
          <FeatureCard
            icon="🏟️"
            title="Múltiplos Campos"
            description="Distribua jogos por vários campos em paralelo."
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-5 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs text-text-muted">{description}</p>
    </div>
  );
}
