import Link from "next/link";

interface RecentMatch {
  id: string;
  set1A: number | null;
  set1B: number | null;
  set2A: number | null;
  set2B: number | null;
  set3A: number | null;
  set3B: number | null;
  resultType: string;
  playedAt: string | null;
  teamA: {
    name: string;
    player1: { fullName: string; nickname: string | null };
    player2: { fullName: string; nickname: string | null };
  };
  teamB: {
    name: string;
    player1: { fullName: string; nickname: string | null };
    player2: { fullName: string; nickname: string | null };
  };
  tournament: { id: string; name: string };
}

function playerLabel(p: { fullName: string; nickname: string | null }) {
  return p.nickname || p.fullName.split(" ")[0];
}

function formatScore(match: RecentMatch) {
  const sets: string[] = [];
  if (match.set1A != null && match.set1B != null) sets.push(`${match.set1A}-${match.set1B}`);
  if (match.set2A != null && match.set2B != null) sets.push(`${match.set2A}-${match.set2B}`);
  if (match.set3A != null && match.set3B != null) sets.push(`${match.set3A}-${match.set3B}`);
  return sets.join(" / ");
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
}

export function RecentResults({ matches }: { matches: RecentMatch[] }) {
  if (matches.length === 0) {
    return (
      <p className="text-sm text-text-muted py-4 text-center">
        Ainda não há resultados registados.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {matches.map((match) => {
        const isWinA = match.resultType === "WIN_A";
        const isWinB = match.resultType === "WIN_B";

        return (
          <Link
            key={match.id}
            href={`/torneios/${match.tournament.id}`}
            className="block bg-white rounded-lg border border-border p-4 hover:border-primary/50 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-text-muted">{match.tournament.name}</span>
              <span className="text-xs text-text-muted">{formatDate(match.playedAt)}</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className={`flex-1 ${isWinA ? "font-semibold" : "text-text-muted"}`}>
                <div className="text-sm">{match.teamA.name}</div>
                <div className="text-xs text-text-muted">
                  {playerLabel(match.teamA.player1)} & {playerLabel(match.teamA.player2)}
                </div>
              </div>

              <div className="text-center px-2">
                <div className="text-sm font-bold text-primary whitespace-nowrap">
                  {formatScore(match)}
                </div>
              </div>

              <div className={`flex-1 text-right ${isWinB ? "font-semibold" : "text-text-muted"}`}>
                <div className="text-sm">{match.teamB.name}</div>
                <div className="text-xs text-text-muted">
                  {playerLabel(match.teamB.player1)} & {playerLabel(match.teamB.player2)}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
