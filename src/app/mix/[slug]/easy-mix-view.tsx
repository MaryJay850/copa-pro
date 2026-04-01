"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { saveEasyMixScore, getTournamentPhotos, getTournamentPhoto } from "@/lib/actions";
import { PhotoGallery } from "@/components/photo-gallery";
import { toast } from "sonner";

export function EasyMixView({ tournament }: { tournament: any }) {
  const router = useRouter();
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<{ id: string; thumbnailData: string | null; caption: string | null; createdAt: string }[]>([]);

  // Load photos on mount
  React.useEffect(() => {
    getTournamentPhotos(tournament.id).then(setPhotos).catch(() => {});
  }, [tournament.id]);

  const totalMatches = tournament.rounds.reduce((acc: number, r: any) => acc + r.matches.length, 0);
  const finishedMatches = tournament.rounds.reduce((acc: number, r: any) => acc + r.matches.filter((m: any) => m.status === "FINISHED").length, 0);
  const progress = totalMatches > 0 ? Math.round((finishedMatches / totalMatches) * 100) : 0;

  const playerName = (p: any) => p?.nickname || p?.fullName?.split(" ")[0] || "?";

  // Compute individual rankings from finished matches
  const playerStats: Record<string, { name: string; points: number; matches: number; wins: number; setsWon: number; setsLost: number }> = {};
  for (const insc of tournament.inscriptions || []) {
    playerStats[insc.playerId] = {
      name: playerName(insc.player),
      points: 0, matches: 0, wins: 0, setsWon: 0, setsLost: 0,
    };
  }
  for (const round of tournament.rounds) {
    for (const match of round.matches) {
      if (match.status !== "FINISHED") continue;
      const teamAPlayers = [match.teamA.player1?.id, match.teamA.player2?.id].filter(Boolean);
      const teamBPlayers = [match.teamB.player1?.id, match.teamB.player2?.id].filter(Boolean);

      let setsA = 0, setsB = 0;
      if (match.set1A != null && match.set1B != null) { if (match.set1A > match.set1B) setsA++; else if (match.set1B > match.set1A) setsB++; }
      if (match.set2A != null && match.set2B != null) { if (match.set2A > match.set2B) setsA++; else if (match.set2B > match.set2A) setsB++; }
      if (match.set3A != null && match.set3B != null) { if (match.set3A > match.set3B) setsA++; else if (match.set3B > match.set3A) setsB++; }

      const ptsA = setsA * 2 + (match.resultType === "WIN_A" ? 3 : 0);
      const ptsB = setsB * 2 + (match.resultType === "WIN_B" ? 3 : 0);

      for (const pid of teamAPlayers) {
        if (playerStats[pid]) {
          playerStats[pid].points += ptsA;
          playerStats[pid].matches++;
          playerStats[pid].setsWon += setsA;
          playerStats[pid].setsLost += setsB;
          if (match.resultType === "WIN_A") playerStats[pid].wins++;
        }
      }
      for (const pid of teamBPlayers) {
        if (playerStats[pid]) {
          playerStats[pid].points += ptsB;
          playerStats[pid].matches++;
          playerStats[pid].setsWon += setsB;
          playerStats[pid].setsLost += setsA;
          if (match.resultType === "WIN_B") playerStats[pid].wins++;
        }
      }
    }
  }
  const ranking = Object.entries(playerStats)
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => b.points - a.points || b.wins - a.wins || (b.setsWon - b.setsLost) - (a.setsWon - a.setsLost));

  const handleSave = async (matchId: string) => {
    setSaving(true);
    const s = scores[matchId] || {};
    try {
      const result = await saveEasyMixScore(matchId, {
        set1A: s.set1A ?? null, set1B: s.set1B ?? null,
        set2A: s.set2A ?? null, set2B: s.set2B ?? null,
        set3A: s.set3A ?? null, set3B: s.set3B ?? null,
      });
      if (result.success) {
        toast.success("Resultado guardado!");
        setEditingMatch(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao guardar.");
    }
    setSaving(false);
  };

  const updateScore = (matchId: string, field: string, value: string) => {
    const num = value === "" ? null : Number(value);
    setScores((prev) => ({ ...prev, [matchId]: { ...prev[matchId], [field]: num } }));
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="min-h-screen bg-surface-alt text-text">
      {/* Hero header */}
      <div className="rounded-b-2xl shadow-card bg-surface border-b border-border overflow-hidden">
        <div className="h-24" style={{ background: "linear-gradient(to right, #10b981, #06b6d4, #6366f1)" }} />
        <div className="max-w-5xl mx-auto px-4 pb-6 relative">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border-4 border-surface absolute -top-8" style={{ background: "linear-gradient(to bottom right, #10b981, #06b6d4)" }}>
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="pt-12 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-xl font-extrabold">{tournament.name}</h1>
              <p className="text-sm text-text-muted">Easy Mix - Torneio Rápido</p>
            </div>
            <div className="flex items-center gap-4 text-center">
              <div>
                <p className="text-2xl font-extrabold text-emerald-600">{tournament.inscriptions.length}</p>
                <p className="text-[10px] font-bold text-text-muted uppercase">Jogadores</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-text">{finishedMatches}/{totalMatches}</p>
                <p className="text-[10px] font-bold text-text-muted uppercase">Jogos</p>
              </div>
            </div>
          </div>
          <div className="mt-3 h-1.5 bg-border rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "linear-gradient(to right, #10b981, #06b6d4)" }} />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Share button */}
        <div className="flex justify-end">
          <button
            onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Link copiado!"); }}
            className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Partilhar link
          </button>
        </div>

        {/* Ranking */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Ranking Individual
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-text-muted uppercase tracking-wide">
                  <th className="pb-2 pr-3 text-left w-8">#</th>
                  <th className="pb-2 pr-3 text-left">Jogador</th>
                  <th className="pb-2 pr-3 text-center">Pts</th>
                  <th className="pb-2 pr-3 text-center">J</th>
                  <th className="pb-2 pr-3 text-center">V</th>
                  <th className="pb-2 pr-3 text-center">%V</th>
                  <th className="pb-2 text-center">Dif</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((p, i) => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="py-2 pr-3 font-medium text-text-muted">{i + 1}</td>
                    <td className="py-2 pr-3 font-medium">{p.name}</td>
                    <td className="py-2 pr-3 text-center font-bold text-emerald-600">{p.points}</td>
                    <td className="py-2 pr-3 text-center text-text-muted">{p.matches}</td>
                    <td className="py-2 pr-3 text-center text-emerald-600">{p.wins}</td>
                    <td className="py-2 pr-3 text-center">
                      <span className={`text-xs font-semibold ${
                        p.matches === 0 ? "text-text-muted" :
                        Math.round((p.wins / p.matches) * 100) >= 60 ? "text-emerald-600" :
                        Math.round((p.wins / p.matches) * 100) >= 40 ? "text-amber-600" :
                        "text-red-500"
                      }`}>
                        {p.matches > 0 ? `${Math.round((p.wins / p.matches) * 100)}%` : "—"}
                      </span>
                    </td>
                    <td className="py-2 text-center font-medium">{p.setsWon - p.setsLost > 0 ? `+${p.setsWon - p.setsLost}` : p.setsWon - p.setsLost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Schedule by rounds */}
        {tournament.rounds.map((round: any, rIdx: number) => (
          <div key={round.id} className="bg-surface rounded-xl border border-border p-5">
            <h3 className="text-sm font-bold mb-3">Ronda {rIdx + 1}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {round.matches.map((match: any) => {
                const isFinished = match.status === "FINISHED";
                const isEditing = editingMatch === match.id;
                const s = scores[match.id] || { set1A: match.set1A, set1B: match.set1B, set2A: match.set2A, set2B: match.set2B, set3A: match.set3A, set3B: match.set3B };
                return (
                  <div key={match.id} className={`rounded-xl border p-3 space-y-2 ${isFinished ? "border-border bg-surface-alt" : "border-border"}`}>
                    <div className="flex items-center justify-between text-[10px] text-text-muted font-semibold uppercase">
                      <span>{match.court?.name || "Campo"}</span>
                      {isFinished ? (
                        <Badge variant="success">Terminado</Badge>
                      ) : match.status === "IN_PROGRESS" ? (
                        <Badge variant="info" pulse>Em curso</Badge>
                      ) : (
                        <Badge variant="default">Por jogar</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs">
                        <div className="font-bold">{playerName(match.teamA.player1)}</div>
                        {match.teamA.player2 && <div className="text-text-muted">{playerName(match.teamA.player2)}</div>}
                      </div>
                      <div className="text-xs font-bold text-text-muted/50">VS</div>
                      <div className="text-xs text-right">
                        <div className="font-bold">{playerName(match.teamB.player1)}</div>
                        {match.teamB.player2 && <div className="text-text-muted">{playerName(match.teamB.player2)}</div>}
                      </div>
                    </div>

                    {isFinished && !isEditing && (
                      <div className="text-center">
                        <span className="text-sm font-bold">
                          {match.set1A}-{match.set1B}
                          {match.set2A != null && `, ${match.set2A}-${match.set2B}`}
                          {match.set3A != null && `, ${match.set3A}-${match.set3B}`}
                        </span>
                      </div>
                    )}

                    {isEditing && (
                      <div className="space-y-1.5 pt-1">
                        {[1, 2, 3].slice(0, tournament.numberOfSets).map((setNum) => (
                          <div key={setNum} className="flex items-center gap-2 text-xs">
                            <span className="text-text-muted w-8">Set {setNum}</span>
                            <input
                              type="number" min={0} max={99}
                              value={s[`set${setNum}A`] ?? ""}
                              onChange={(e) => updateScore(match.id, `set${setNum}A`, e.target.value)}
                              className="w-12 rounded border border-border px-2 py-1 text-center text-sm"
                            />
                            <span className="text-text-muted">-</span>
                            <input
                              type="number" min={0} max={99}
                              value={s[`set${setNum}B`] ?? ""}
                              onChange={(e) => updateScore(match.id, `set${setNum}B`, e.target.value)}
                              className="w-12 rounded border border-border px-2 py-1 text-center text-sm"
                            />
                          </div>
                        ))}
                        <div className="flex gap-1.5 pt-1">
                          <Button size="sm" onClick={() => handleSave(match.id)} disabled={saving}>
                            {saving ? "..." : "Guardar"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingMatch(null)}>Cancelar</Button>
                        </div>
                      </div>
                    )}

                    {!isFinished && !isEditing && (
                      <button
                        onClick={() => {
                          setScores((prev) => ({
                            ...prev,
                            [match.id]: {
                              set1A: match.set1A, set1B: match.set1B,
                              set2A: match.set2A, set2B: match.set2B,
                              set3A: match.set3A, set3B: match.set3B,
                            },
                          }));
                          setEditingMatch(match.id);
                        }}
                        className="text-xs text-primary font-semibold hover:underline"
                      >
                        Inserir resultado
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Photo Gallery (read-only) */}
        {photos.length > 0 && (
          <div className="bg-surface rounded-xl border border-border p-5">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Fotos
            </h2>
            <PhotoGallery
              photos={photos}
              canUpload={false}
              onUpload={async () => {}}
              onDelete={async () => {}}
              onLoadFull={async (photoId) => {
                const photo = await getTournamentPhoto(photoId);
                return photo.imageData;
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
