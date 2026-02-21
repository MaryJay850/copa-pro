export const dynamic = "force-dynamic";

import { getPlayerProfile } from "@/lib/actions";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EloChart } from "@/components/elo-chart";
import { MatchHistorySection } from "@/components/match-history";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  const profile = await getPlayerProfile(playerId);

  if (!profile) notFound();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-text-muted mb-1">
          <Link href="/dashboard" className="hover:text-text">Painel</Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-bold">{profile.fullName}</h1>
        {profile.nickname && (
          <p className="text-sm text-text-muted">&quot;{profile.nickname}&quot;</p>
        )}
      </div>

      {/* Overall Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card className="text-center">
          <p className="text-2xl font-bold text-primary">{profile.stats.totalMatches}</p>
          <p className="text-xs text-text-muted">Jogos</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-emerald-600">{profile.stats.wins}</p>
          <p className="text-xs text-text-muted">Vitorias</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-red-500">{profile.stats.losses}</p>
          <p className="text-xs text-text-muted">Derrotas</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-accent">
            {profile.stats.totalMatches > 0
              ? `${Math.round((profile.stats.wins / profile.stats.totalMatches) * 100)}%`
              : "\u2014"}
          </p>
          <p className="text-xs text-text-muted">Win Rate</p>
        </Card>
      </div>

      {/* Sets Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Estatisticas de Sets</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xl font-bold">{profile.stats.setsWon}</p>
            <p className="text-xs text-text-muted">Sets Ganhos</p>
          </div>
          <div>
            <p className="text-xl font-bold">{profile.stats.setsLost}</p>
            <p className="text-xs text-text-muted">Sets Perdidos</p>
          </div>
          <div>
            <p className="text-xl font-bold font-mono">
              {profile.stats.setsWon - profile.stats.setsLost > 0 ? "+" : ""}
              {profile.stats.setsWon - profile.stats.setsLost}
            </p>
            <p className="text-xs text-text-muted">Diferenca</p>
          </div>
        </div>
      </Card>

      {/* Leagues */}
      {profile.leagues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ligas</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {profile.leagues.map((l) => (
              <Link key={l.id} href={`/ligas/${l.id}`} className="block hover:bg-surface-alt rounded-lg px-3 py-2 transition-colors">
                <span className="text-sm font-medium">{l.name}</span>
                {l.location && <span className="text-xs text-text-muted ml-2">{l.location}</span>}
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Elo Evolution */}
      <Card>
        <CardHeader>
          <CardTitle>Evolucao Elo</CardTitle>
        </CardHeader>
        <EloChart playerId={playerId} currentRating={profile.eloRating} />
      </Card>

      {/* Match History */}
      <MatchHistorySection playerId={playerId} />

      {/* Head-to-Head */}
      {profile.headToHead.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Frente a Frente</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-muted uppercase tracking-wide">
                  <th className="pb-2 pr-3">Adversario</th>
                  <th className="pb-2 pr-3 text-center">Jogos</th>
                  <th className="pb-2 pr-3 text-center">V</th>
                  <th className="pb-2 pr-3 text-center">D</th>
                  <th className="pb-2 text-center">%</th>
                </tr>
              </thead>
              <tbody>
                {profile.headToHead.map((h) => (
                  <tr key={h.opponentName} className="border-b border-border/50 hover:bg-surface-alt transition-colors">
                    <td className="py-2 pr-3 font-medium">{h.opponentName}</td>
                    <td className="py-2 pr-3 text-center text-text-muted">{h.played}</td>
                    <td className="py-2 pr-3 text-center text-emerald-600">{h.wins}</td>
                    <td className="py-2 pr-3 text-center text-red-500">{h.losses}</td>
                    <td className="py-2 text-center">
                      <Badge variant={h.wins > h.losses ? "success" : h.wins < h.losses ? "default" : "warning"}>
                        {h.played > 0 ? `${Math.round((h.wins / h.played) * 100)}%` : "\u2014"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
