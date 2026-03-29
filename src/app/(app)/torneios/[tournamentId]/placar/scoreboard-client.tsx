"use client";

import { useState, useCallback, useTransition } from "react";
import { saveScoreboardMatch, startMatch } from "@/lib/actions";
import { useRouter } from "next/navigation";

type Player = { id: string; fullName: string; nickname: string | null };
type Team = {
  id: string;
  name: string;
  player1: Player;
  player2: Player | null;
};
type Match = {
  id: string;
  slotIndex: number;
  status: string;
  resultType: string;
  set1A: number | null; set1B: number | null;
  set2A: number | null; set2B: number | null;
  set3A: number | null; set3B: number | null;
  teamA: Team;
  teamB: Team;
  court: { id: string; name: string } | null;
};
type Round = { id: string; index: number; matches: Match[] };
type Court = { id: string; name: string };
type Tournament = {
  id: string;
  name: string;
  numberOfSets: number;
  teamSize: number;
  startDate: string | null;
  courts: Court[];
  rounds: Round[];
};

function getTeamLabel(team: Team, teamSize: number): string {
  if (teamSize === 1) {
    return team.player1.nickname || team.player1.fullName;
  }
  const p1 = team.player1.nickname || team.player1.fullName.split(" ")[0];
  const p2 = team.player2
    ? team.player2.nickname || team.player2.fullName.split(" ")[0]
    : "";
  return p2 ? `${p1} & ${p2}` : p1;
}

export function ScoreboardClient({ tournament }: { tournament: Tournament }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const courts = tournament.courts;
  const rounds = tournament.rounds;
  const numberOfSets = tournament.numberOfSets;

  // State
  const [selectedCourtIdx, setSelectedCourtIdx] = useState(0);
  const [selectedRoundIdx, setSelectedRoundIdx] = useState(() => {
    // Find first round with unfinished matches on first court
    if (courts.length === 0 || rounds.length === 0) return 0;
    const courtId = courts[0]?.id;
    for (let ri = 0; ri < rounds.length; ri++) {
      const hasUnfinished = rounds[ri].matches.some(
        (m) => m.court?.id === courtId && m.status !== "FINISHED"
      );
      if (hasUnfinished) return ri;
    }
    return 0;
  });
  const [currentSet, setCurrentSet] = useState(1);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [showConfirmStart, setShowConfirmStart] = useState(false);
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);
  const [showAllDone, setShowAllDone] = useState(false);
  const [allDoneMsg, setAllDoneMsg] = useState("");
  const [savedSets, setSavedSets] = useState<{ a: number; b: number }[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const selectedCourt = courts[selectedCourtIdx];
  const selectedRound = rounds[selectedRoundIdx];

  // Get the current match for this court + round
  const currentMatch = selectedRound?.matches.find(
    (m) => m.court?.id === selectedCourt?.id && m.status !== "FINISHED"
  );

  // Check if all matches on this court are done
  const allMatchesOnCourt = rounds.flatMap((r) =>
    r.matches.filter((m) => m.court?.id === selectedCourt?.id)
  );
  const allCourtDone = allMatchesOnCourt.every((m) => m.status === "FINISHED");

  const handleInitClick = () => {
    if (!currentMatch) return;
    setShowConfirmStart(true);
  };

  const confirmStart = async () => {
    setShowConfirmStart(false);
    setIsActive(true);
    setScoreA(0);
    setScoreB(0);
    setCurrentSet(1);
    setSavedSets([]);
    setErrorMsg("");
    // Mark match as IN_PROGRESS in database
    if (currentMatch) {
      try {
        await startMatch(currentMatch.id);
      } catch {
        // Non-critical: match still playable if this fails
      }
    }
  };

  const handleTapA = () => {
    if (!isActive || isPending) return;
    setScoreA((s) => s + 1);
  };

  const handleTapB = () => {
    if (!isActive || isPending) return;
    setScoreB((s) => s + 1);
  };

  const handleUndo = (side: "A" | "B") => {
    if (!isActive || isPending) return;
    if (side === "A" && scoreA > 0) setScoreA((s) => s - 1);
    if (side === "B" && scoreB > 0) setScoreB((s) => s - 1);
  };

  const handleTerminar = () => {
    if (!isActive || isPending || !currentMatch) return;
    setShowConfirmEnd(true);
  };

  const confirmEnd = () => {
    setShowConfirmEnd(false);
    if (!currentMatch) return;

    const setsCompleted = [...savedSets, { a: scoreA, b: scoreB }];

    if (currentSet < numberOfSets) {
      // For best-of-3: check if someone already won 2 sets
      if (numberOfSets === 3) {
        const setsA = setsCompleted.filter((s) => s.a > s.b).length;
        const setsB = setsCompleted.filter((s) => s.b > s.a).length;
        if (setsA >= 2 || setsB >= 2) {
          // Match is decided, save now
          saveAndAdvance(currentMatch, setsCompleted);
          return;
        }
      }
      // Move to next set
      setSavedSets(setsCompleted);
      setCurrentSet((s) => s + 1);
      setScoreA(0);
      setScoreB(0);
      return;
    }

    // Last set — save the match
    saveAndAdvance(currentMatch, setsCompleted);
  };

  const saveAndAdvance = useCallback(
    (match: Match, sets: { a: number; b: number }[]) => {
      const scores = {
        set1A: sets[0]?.a ?? null,
        set1B: sets[0]?.b ?? null,
        set2A: sets[1]?.a ?? null,
        set2B: sets[1]?.b ?? null,
        set3A: sets[2]?.a ?? null,
        set3B: sets[2]?.b ?? null,
      };

      startTransition(async () => {
        const result = await saveScoreboardMatch(match.id, scores);
        if (!result.success) {
          setErrorMsg(result.error);
          return;
        }

        setIsActive(false);
        setScoreA(0);
        setScoreB(0);
        setCurrentSet(1);
        setSavedSets([]);

        // Check if there are more matches on this court
        // We need to find the next unfinished match on this court across rounds
        const courtId = selectedCourt?.id;
        let foundNext = false;

        for (let ri = selectedRoundIdx; ri < rounds.length; ri++) {
          const roundMatches = rounds[ri].matches.filter(
            (m) => m.court?.id === courtId && m.id !== match.id && m.status !== "FINISHED"
          );
          if (roundMatches.length > 0) {
            setSelectedRoundIdx(ri);
            foundNext = true;
            break;
          }
          // Check next rounds
          if (ri === selectedRoundIdx) {
            // Also check remaining rounds
            for (let nri = ri + 1; nri < rounds.length; nri++) {
              const nextRoundMatches = rounds[nri].matches.filter(
                (m) => m.court?.id === courtId && m.status !== "FINISHED"
              );
              if (nextRoundMatches.length > 0) {
                setSelectedRoundIdx(nri);
                foundNext = true;
                break;
              }
            }
            break;
          }
        }

        if (!foundNext) {
          setAllDoneMsg("Todos os jogos e rondas concluídos neste campo!");
          setShowAllDone(true);
        }

        // Refresh data from server
        router.refresh();
      });
    },
    [selectedCourt, selectedRoundIdx, rounds, router]
  );

  const formattedDate = tournament.startDate
    ? new Date(tournament.startDate).toLocaleDateString("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  // ─── Render ───

  if (courts.length === 0 || rounds.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Sem dados</h2>
          <p className="text-gray-500">Este torneio não tem campos ou rondas configurados.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col select-none">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
            <span className="font-display font-bold text-lg text-primary">CopaPro</span>
          </div>
          <div className="text-center flex-1">
            <div className="text-sm font-semibold truncate">{tournament.name}</div>
            {formattedDate && <div className="text-xs text-gray-500">{formattedDate}</div>}
          </div>
          <div className="flex flex-col gap-1 min-w-[110px]">
            {/* Court selector */}
            <select
              value={selectedCourtIdx}
              onChange={(e) => {
                if (isActive) return;
                setSelectedCourtIdx(Number(e.target.value));
                setSelectedRoundIdx(0);
                setCurrentSet(1);
                setScoreA(0);
                setScoreB(0);
                setSavedSets([]);
              }}
              disabled={isActive}
              className="text-xs font-bold bg-[#1a5276] text-white rounded px-2 py-1 text-center appearance-none cursor-pointer disabled:opacity-60"
            >
              {courts.map((c, i) => (
                <option key={c.id} value={i}>
                  {c.name.toUpperCase()}
                </option>
              ))}
            </select>
            {/* Round selector */}
            <select
              value={selectedRoundIdx}
              onChange={(e) => {
                if (isActive) return;
                setSelectedRoundIdx(Number(e.target.value));
                setCurrentSet(1);
                setScoreA(0);
                setScoreB(0);
                setSavedSets([]);
              }}
              disabled={isActive}
              className="text-xs font-bold bg-[#1a5276] text-white rounded px-2 py-1 text-center appearance-none cursor-pointer disabled:opacity-60"
            >
              {rounds.map((r, i) => (
                <option key={r.id} value={i}>
                  RONDA {r.index}
                </option>
              ))}
            </select>
            {/* Set indicator */}
            {numberOfSets > 1 && (
              <div className="text-xs font-bold bg-amber-600 text-white rounded px-2 py-1 text-center">
                SET {currentSet}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Saved sets indicator */}
      {savedSets.length > 0 && (
        <div className="bg-gray-200 dark:bg-gray-700 px-3 py-1 flex gap-3 justify-center">
          {savedSets.map((s, i) => (
            <span key={i} className="text-sm font-bold">
              Set {i + 1}: <span className="text-orange-600">{s.a}</span> - <span className="text-blue-600">{s.b}</span>
            </span>
          ))}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col p-3 gap-3">
        {allCourtDone && !currentMatch ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
              <div className="text-4xl mb-4">🏆</div>
              <h2 className="text-xl font-bold mb-2">Campo Concluído</h2>
              <p className="text-gray-500">Todos os jogos e rondas concluídos neste campo!</p>
            </div>
          </div>
        ) : !currentMatch ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
              <h2 className="text-lg font-bold mb-2">Sem jogos nesta ronda</h2>
              <p className="text-gray-500 text-sm">Não há jogos para este campo nesta ronda. Selecione outra ronda.</p>
            </div>
          </div>
        ) : (
          <>
            {/* INICIAR button */}
            {!isActive && (
              <button
                onClick={handleInitClick}
                className="w-full py-3 rounded-lg font-bold text-white text-lg bg-green-600 hover:bg-green-700 active:scale-[0.98] transition-all shadow"
              >
                INICIAR
              </button>
            )}

            {/* Team names */}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
              <div className="bg-[#1a5276] text-white text-center py-2 px-2 rounded-lg font-semibold text-sm truncate">
                {getTeamLabel(currentMatch.teamA, tournament.teamSize)}
              </div>
              <span className="text-lg font-bold text-gray-400">vs</span>
              <div className="bg-[#1a5276] text-white text-center py-2 px-2 rounded-lg font-semibold text-sm truncate">
                {getTeamLabel(currentMatch.teamB, tournament.teamSize)}
              </div>
            </div>

            {/* Score display */}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
              <div className="text-center">
                <div className="text-8xl sm:text-9xl font-black tabular-nums leading-none">
                  {scoreA}
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-400">VS</div>
              <div className="text-center">
                <div className="text-8xl sm:text-9xl font-black tabular-nums leading-none">
                  {scoreB}
                </div>
              </div>
            </div>

            {/* Tap zones */}
            <div className="grid grid-cols-2 gap-3 flex-1 min-h-[180px] sm:min-h-[250px]">
              <button
                onClick={handleTapA}
                disabled={!isActive || isPending}
                className="rounded-2xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg relative"
              >
                {isActive && (
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/60 text-xs font-medium">
                    Toque para marcar
                  </span>
                )}
              </button>
              <button
                onClick={handleTapB}
                disabled={!isActive || isPending}
                className="rounded-2xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg relative"
              >
                {isActive && (
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/60 text-xs font-medium">
                    Toque para marcar
                  </span>
                )}
              </button>
            </div>

            {/* Undo buttons */}
            {isActive && (scoreA > 0 || scoreB > 0) && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleUndo("A")}
                  disabled={scoreA === 0 || isPending}
                  className="py-2 text-sm font-medium rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 disabled:opacity-30 transition-all"
                >
                  ← Desfazer
                </button>
                <button
                  onClick={() => handleUndo("B")}
                  disabled={scoreB === 0 || isPending}
                  className="py-2 text-sm font-medium rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 disabled:opacity-30 transition-all"
                >
                  Desfazer →
                </button>
              </div>
            )}

            {/* TERMINAR button */}
            {isActive && (
              <button
                onClick={handleTerminar}
                disabled={isPending}
                className="w-full py-4 rounded-lg font-bold text-white text-xl bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all shadow disabled:opacity-60"
              >
                {isPending ? "A guardar..." : numberOfSets > 1 && currentSet < numberOfSets ? `TERMINAR SET ${currentSet}` : "TERMINAR"}
              </button>
            )}
          </>
        )}
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="fixed bottom-4 left-4 right-4 bg-red-600 text-white p-3 rounded-lg text-center font-medium shadow-lg z-50">
          {errorMsg}
          <button onClick={() => setErrorMsg("")} className="ml-3 underline text-sm">
            Fechar
          </button>
        </div>
      )}

      {/* Confirm START modal */}
      {showConfirmStart && currentMatch && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-center">Confirmar Equipas</h3>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-orange-500"></div>
                <span className="font-semibold">{getTeamLabel(currentMatch.teamA, tournament.teamSize)}</span>
              </div>
              <div className="text-center text-gray-400 font-bold">vs</div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-blue-500"></div>
                <span className="font-semibold">{getTeamLabel(currentMatch.teamB, tournament.teamSize)}</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 text-center mb-4">
              {selectedCourt?.name} · Ronda {selectedRound?.index}
              {numberOfSets > 1 ? ` · ${numberOfSets} Sets` : ""}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowConfirmStart(false)}
                className="py-2.5 rounded-lg font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={confirmStart}
                className="py-2.5 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm END modal */}
      {showConfirmEnd && currentMatch && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-center">
              {numberOfSets > 1 && currentSet < numberOfSets ? `Confirmar Set ${currentSet}` : "Confirmar Resultado"}
            </h3>
            {/* Show saved sets */}
            {savedSets.length > 0 && (
              <div className="mb-3 space-y-1">
                {savedSets.map((s, i) => (
                  <div key={i} className="text-center text-sm">
                    Set {i + 1}: <span className="font-bold text-orange-600">{s.a}</span> - <span className="font-bold text-blue-600">{s.b}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="text-center mb-4">
              <span className="text-sm text-gray-500">{numberOfSets > 1 ? `Set ${currentSet}: ` : ""}</span>
              <span className="text-2xl font-black">
                <span className="text-orange-600">{scoreA}</span>
                {" - "}
                <span className="text-blue-600">{scoreB}</span>
              </span>
            </div>
            <div className="text-center text-sm mb-4">
              <span className="font-medium">{getTeamLabel(currentMatch.teamA, tournament.teamSize)}</span>
              <span className="text-gray-400 mx-2">vs</span>
              <span className="font-medium">{getTeamLabel(currentMatch.teamB, tournament.teamSize)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowConfirmEnd(false)}
                className="py-2.5 rounded-lg font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={confirmEnd}
                className="py-2.5 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All done modal */}
      {showAllDone && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-xl text-center">
            <div className="text-5xl mb-4">🏆</div>
            <h3 className="text-xl font-bold mb-2">Campo Concluído</h3>
            <p className="text-gray-500 mb-6">{allDoneMsg}</p>
            <button
              onClick={() => setShowAllDone(false)}
              className="py-2.5 px-6 rounded-lg font-bold text-white bg-primary hover:bg-primary/90"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
