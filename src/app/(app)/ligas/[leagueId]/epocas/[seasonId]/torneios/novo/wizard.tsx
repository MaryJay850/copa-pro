"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, FieldLabel } from "@/components/ui/tooltip";
import { createTournament, generateSchedule, updateTournament, updateTournamentBasic, getPlayersWithRanking } from "@/lib/actions";
import { sanitizeError } from "@/lib/error-utils";

interface Player {
  id: string;
  fullName: string;
  nickname: string | null;
}

interface TeamPair {
  name: string;
  player1Id: string;
  player2Id: string | null;
}

type TeamMode = "FIXED_TEAMS" | "RANDOM_TEAMS" | "MANUAL_TEAMS" | "RANDOM_PER_ROUND" | "RANKED_SPLIT";

export function TournamentWizard({
  leagueId,
  seasonId,
  existingPlayers,
  editMode,
}: {
  leagueId: string;
  seasonId: string;
  existingPlayers: Player[];
  editMode?: {
    tournamentId: string;
    initialData: {
      name: string;
      startDate?: string;
      courtsCount: number;
      matchesPerPair: number;
      numberOfSets: number;
      teamMode: string;
      teamSize: number;
      randomSeed?: string;
      numberOfRounds?: number;
      rankedSplitSubMode?: string;
      teams: { name: string; player1Id: string; player2Id: string | null }[];
      selectedPlayerIds: string[];
      courtNames?: string[];
    };
  };
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [name, setName] = useState(editMode?.initialData.name ?? "");
  const [startDate, setStartDate] = useState(editMode?.initialData.startDate ?? "");
  const [courtsCount, setCourtsCount] = useState(editMode?.initialData.courtsCount ?? 2);
  const [courtNames, setCourtNames] = useState<string[]>(
    editMode?.initialData.courtNames ??
      Array.from({ length: editMode?.initialData.courtsCount ?? 2 }, (_, i) => `Campo ${i + 1}`)
  );
  const [matchesPerPair, setMatchesPerPair] = useState(editMode?.initialData.matchesPerPair ?? 1);
  const [numberOfSets, setNumberOfSets] = useState(editMode?.initialData.numberOfSets ?? 1);
  const [teamSize, setTeamSize] = useState(editMode?.initialData.teamSize ?? 2);
  const [teamMode, setTeamMode] = useState<TeamMode>(
    (editMode?.initialData.teamMode as TeamMode) ?? "FIXED_TEAMS"
  );
  const [numberOfRounds, setNumberOfRounds] = useState(
    editMode?.initialData.numberOfRounds ?? 3
  );
  const [rankedSplitSubMode, setRankedSplitSubMode] = useState<"fixed" | "per_round">(
    (editMode?.initialData.rankedSplitSubMode as "fixed" | "per_round") ?? "fixed"
  );
  const [rankingData, setRankingData] = useState<{ playerId: string; name: string; points: number }[]>([]);
  const [rankingLoaded, setRankingLoaded] = useState(false);

  // Step 2 — ordered selection
  const [players] = useState<Player[]>(existingPlayers);
  const [selectionOrder, setSelectionOrder] = useState<string[]>(
    editMode?.initialData.selectedPlayerIds ?? []
  );

  // Step 3
  const [teams, setTeams] = useState<TeamPair[]>(editMode?.initialData.teams ?? []);
  const [randomSeed, setRandomSeed] = useState(
    editMode?.initialData.randomSeed ?? Math.random().toString(36).substring(2, 8)
  );

  // Derived values
  const selectedPlayerIds = new Set(selectionOrder);
  const playersPerSide = teamSize;
  const maxTitulars = courtsCount * 2 * playersPerSide;
  const titularIds = selectionOrder.slice(0, maxTitulars);
  const suplenteIds = selectionOrder.slice(maxTitulars);
  const titularPlayers = titularIds.map((id) => players.find((p) => p.id === id)!).filter(Boolean);
  const suplentePlayers = suplenteIds.map((id) => players.find((p) => p.id === id)!).filter(Boolean);

  // Max rounds for RANDOM_PER_ROUND: N-1 where N = number of titular players
  // (1-factorization of complete graph K_N gives N-1 perfect matchings)
  // Use maxTitulars (capacity) as fallback when no players are selected yet (Step 1)
  const effectivePlayerCount = titularIds.length > 0 ? titularIds.length : maxTitulars;
  const maxPossibleRounds = Math.max(effectivePlayerCount - 1, 1);

  // Total steps: 1v1 skips step 3, RANDOM_PER_ROUND and RANKED_SPLIT skip step 3
  const skipsTeamStep = teamSize === 1 || teamMode === "RANDOM_PER_ROUND" || teamMode === "RANKED_SPLIT";
  const totalSteps = skipsTeamStep ? 3 : 4;
  const reviewStep = skipsTeamStep ? 3 : 4;

  // Compute unassigned players for MANUAL_TEAMS mode
  const assignedPlayerIds = new Set(teams.flatMap((t) => [t.player1Id, t.player2Id].filter(Boolean)));
  const unassignedPlayers = titularPlayers.filter((p) => !assignedPlayerIds.has(p.id));

  const handleCourtsCountChange = useCallback((count: number) => {
    setCourtsCount(count);
    setCourtNames((prev) => {
      const next = [...prev];
      while (next.length < count) next.push(`Campo ${next.length + 1}`);
      return next.slice(0, count);
    });
  }, []);

  const togglePlayer = (id: string) => {
    setSelectionOrder((prev) => {
      if (prev.includes(id)) return prev.filter((pid) => pid !== id);
      return [...prev, id];
    });
  };

  const generateRandomTeamsLocal = () => {
    const pool = titularPlayers;
    if (pool.length < 4 || pool.length % 2 !== 0) {
      setError("Número par de jogadores titulares necessário (mínimo 4).");
      return;
    }
    const shuffled = [...pool];
    let seed = randomSeed;
    const random = () => {
      let x = 0;
      for (let i = 0; i < seed.length; i++) x = ((x << 5) - x + seed.charCodeAt(i)) | 0;
      seed = x.toString(36);
      return Math.abs(x) / 2147483647;
    };
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const newTeams: TeamPair[] = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      newTeams.push({
        name: `Equipa ${newTeams.length + 1}`,
        player1Id: shuffled[i].id,
        player2Id: shuffled[i + 1].id,
      });
    }
    setTeams(newTeams);
    setError(null);
  };

  const initFixedTeams = () => {
    const pool = titularPlayers;
    if (pool.length < 4 || pool.length % 2 !== 0) {
      setError("Número par de jogadores titulares necessário (mínimo 4).");
      return;
    }
    const newTeams: TeamPair[] = [];
    for (let i = 0; i < pool.length; i += 2) {
      newTeams.push({
        name: `Equipa ${newTeams.length + 1}`,
        player1Id: pool[i].id,
        player2Id: pool[i + 1].id,
      });
    }
    setTeams(newTeams);
    setError(null);
  };

  const initManualTeams = () => {
    const pool = titularPlayers;
    if (pool.length < 4 || pool.length % 2 !== 0) {
      setError("Número par de jogadores titulares necessário (mínimo 4).");
      return;
    }
    const numTeams = pool.length / 2;
    const newTeams: TeamPair[] = [];
    for (let i = 0; i < numTeams; i++) {
      newTeams.push({ name: `Equipa ${i + 1}`, player1Id: "", player2Id: "" });
    }
    setTeams(newTeams);
    setError(null);
  };

  const init1v1Teams = () => {
    setTeams(
      titularPlayers.map((p) => ({
        name: p.nickname || p.fullName,
        player1Id: p.id,
        player2Id: null,
      }))
    );
  };

  const updateTeamPlayer = (teamIdx: number, slot: "player1Id" | "player2Id", playerId: string) => {
    setTeams((prev) => {
      const next = [...prev];
      next[teamIdx] = { ...next[teamIdx], [slot]: playerId };
      return next;
    });
  };

  // Detect if structural changes require schedule regeneration (only relevant in edit mode)
  const roundsChanged = editMode &&
    (teamMode === "RANDOM_PER_ROUND" || (teamMode === "RANKED_SPLIT" && rankedSplitSubMode === "per_round")) &&
    numberOfRounds !== (editMode.initialData.numberOfRounds ?? 3);

  const needsRegeneration = !editMode ? true : (
    courtsCount !== editMode.initialData.courtsCount ||
    matchesPerPair !== editMode.initialData.matchesPerPair ||
    (teamSize === 1 ? "FIXED_TEAMS" : teamMode) !== editMode.initialData.teamMode ||
    teamSize !== editMode.initialData.teamSize ||
    ((teamMode === "RANDOM_PER_ROUND" || teamMode === "RANKED_SPLIT") && roundsChanged) ||
    (["RANDOM_TEAMS", "RANDOM_PER_ROUND", "RANKED_SPLIT"].includes(teamMode) && randomSeed !== editMode.initialData.randomSeed) ||
    // Player set changed (added/removed players)
    selectionOrder.length !== editMode.initialData.selectedPlayerIds.length ||
    !selectionOrder.every((id) => editMode.initialData.selectedPlayerIds.includes(id))
  );

  const handleSubmit = async () => {
    // For RANDOM_PER_ROUND and RANKED_SPLIT, skip team validation — teams are generated server-side
    if (teamMode !== "RANDOM_PER_ROUND" && teamMode !== "RANKED_SPLIT" && teams.length > 0) {
      const usedIds = new Set<string>();
      for (const t of teams) {
        if (!t.player1Id) { setError("Todos os lugares devem ser preenchidos."); return; }
        if (teamSize === 2 && !t.player2Id) { setError("Todos os lugares devem ser preenchidos."); return; }
        if (usedIds.has(t.player1Id) || (t.player2Id && usedIds.has(t.player2Id))) {
          setError("Um jogador não pode estar em múltiplas equipas."); return;
        }
        if (teamSize === 2 && t.player1Id === t.player2Id) {
          setError("Uma equipa não pode ter o mesmo jogador duas vezes."); return;
        }
        usedIds.add(t.player1Id);
        if (t.player2Id) usedIds.add(t.player2Id);
      }
    }

    setLoading(true);
    setError(null);
    try {
      const effectiveTeamMode = teamSize === 1 ? "FIXED_TEAMS" : teamMode;
      const needsRounds = teamMode === "RANDOM_PER_ROUND" || (teamMode === "RANKED_SPLIT" && rankedSplitSubMode === "per_round");
      const needsSeed = ["RANDOM_TEAMS", "RANDOM_PER_ROUND", "RANKED_SPLIT"].includes(teamMode);
      const payload = {
        name,
        startDate: startDate || undefined,
        courtsCount,
        courtNames,
        matchesPerPair,
        numberOfSets,
        teamSize,
        teamMode: effectiveTeamMode,
        randomSeed: needsSeed && teamSize === 2 ? randomSeed : undefined,
        numberOfRounds: needsRounds ? numberOfRounds : undefined,
        rankedSplitSubMode: teamMode === "RANKED_SPLIT" ? rankedSplitSubMode : undefined,
        teams: (teamMode === "RANDOM_PER_ROUND" || teamMode === "RANKED_SPLIT") ? [] : teams,
        allPlayerIds: selectionOrder,
      };

      if (editMode) {
        if (needsRegeneration) {
          // Structural change: full reset + regenerate schedule
          await updateTournament({ tournamentId: editMode.tournamentId, ...payload });
          const hasTeamsOrPerRound = teams.length > 0 || teamMode === "RANDOM_PER_ROUND" || teamMode === "RANKED_SPLIT";
          if (hasTeamsOrPerRound) await generateSchedule(editMode.tournamentId);
        } else {
          // Light update: preserve existing schedule
          await updateTournamentBasic({
            tournamentId: editMode.tournamentId,
            name,
            startDate: startDate || undefined,
            numberOfSets,
            courtNames,
            teams,
            allPlayerIds: selectionOrder,
          });
        }
        router.push(`/torneios/${editMode.tournamentId}`);
      } else {
        const tournament = await createTournament({ leagueId, seasonId, ...payload });
        const hasTeamsOrPerRound = teams.length > 0 || teamMode === "RANDOM_PER_ROUND" || teamMode === "RANKED_SPLIT";
        if (hasTeamsOrPerRound) await generateSchedule(tournament.id);
        router.push(`/torneios/${tournament.id}`);
      }
    } catch (e) {
      setError(sanitizeError(e, "Erro ao criar torneio."));
      setLoading(false);
    }
  };

  const getPlayerName = (id: string) => {
    const p = players.find((pl) => pl.id === id);
    return p ? (p.nickname || p.fullName) : "?";
  };

  const validateStep3 = () => {
    if (teamMode === "MANUAL_TEAMS") {
      const hasEmpty = teams.some((t) => !t.player1Id || !t.player2Id);
      if (hasEmpty) { setError("Todos os lugares devem ser preenchidos."); return false; }
      const usedIds = new Set<string>();
      for (const t of teams) {
        if (usedIds.has(t.player1Id) || (t.player2Id && usedIds.has(t.player2Id)) || (t.player2Id && t.player1Id === t.player2Id)) {
          setError("Cada jogador só pode estar numa equipa."); return false;
        }
        usedIds.add(t.player1Id);
        if (t.player2Id) usedIds.add(t.player2Id);
      }
    }
    return true;
  };

  const teamModeLabel = (mode: string) => {
    switch (mode) {
      case "RANDOM_TEAMS": return "Aleatórias";
      case "MANUAL_TEAMS": return "Manuais";
      case "RANDOM_PER_ROUND": return "Aleatórias por Ronda";
      case "RANKED_SPLIT": return "Aleatórias por Nível";
      default: return "Fixas";
    }
  };

  const handleStep2Next = () => {
    // Allow 0 players — tournament created without teams
    if (selectionOrder.length === 0) {
      setTeams([]);
      setError(null);
      setStep(reviewStep);
      return;
    }
    const minPlayers = teamSize === 1 ? 2 : 4;
    if (selectionOrder.length < minPlayers) { setError(`Selecione pelo menos ${minPlayers} jogadores.`); return; }
    if (teamSize === 2 && titularIds.length % 2 !== 0) {
      setError("O número de jogadores titulares deve ser par para modo 2v2."); return;
    }

    // For RANDOM_PER_ROUND or RANKED_SPLIT per_round, ensure numberOfRounds is valid
    if (teamMode === "RANDOM_PER_ROUND" || (teamMode === "RANKED_SPLIT" && rankedSplitSubMode === "per_round")) {
      // For RANKED_SPLIT, max rounds is based on half the titular players (each group)
      const groupSize = teamMode === "RANKED_SPLIT" ? Math.floor(titularIds.length / 2) : titularIds.length;
      const maxRoundsForMode = Math.max(groupSize - 1, 1);
      if (numberOfRounds < 1 || numberOfRounds > maxRoundsForMode) {
        setError(`O número de rondas deve ser entre 1 e ${maxRoundsForMode}.`);
        return;
      }
    }

    setError(null);

    if (teamSize === 1) {
      init1v1Teams();
      setStep(reviewStep);
    } else if (teamMode === "RANDOM_PER_ROUND") {
      // Skip team formation — teams generated server-side per round
      setTeams([]);
      setStep(reviewStep);
    } else if (teamMode === "RANKED_SPLIT") {
      // Skip team formation — teams generated server-side based on ranking
      setTeams([]);
      setStep(reviewStep);
    } else {
      if (teamMode === "RANDOM_TEAMS") generateRandomTeamsLocal();
      else if (teamMode === "MANUAL_TEAMS") initManualTeams();
      else initFixedTeams();
      setStep(3);
    }
  };

  const stepBars = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex gap-1">
        {stepBars.map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-border"}`} />
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>
      )}

      {/* Step 1: Basic info */}
      {step === 1 && (
        <Card>
          <h2 className="text-lg font-semibold mb-4">Passo 1: Informações Básicas</h2>
          <div className="space-y-4">
            <Input label="Nome do Torneio" tooltip="Nome do torneio. Ex: Torneio Janeiro, Taça Verão" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Torneio Janeiro" required />

            <div>
              <FieldLabel label="Data do Torneio" tooltip="Data em que o torneio será realizado." htmlFor="start-date" />
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>

            <div>
              <FieldLabel label="Modo de Jogo" tooltip="Pares (2v2): equipas de 2 jogadores. Individual (1v1): cada jogador joga sozinho." />
              <div className="flex gap-3 mt-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" checked={teamSize === 2} onChange={() => setTeamSize(2)} className="text-primary focus:ring-primary" />
                  Pares (2v2)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" checked={teamSize === 1} onChange={() => setTeamSize(1)} className="text-primary focus:ring-primary" />
                  Individual (1v1)
                </label>
              </div>
            </div>

            <div>
              <FieldLabel label="Número de Campos" tooltip="Quantos campos disponíveis para jogar em simultâneo. Mais campos = mais jogos por ronda." htmlFor="courts-count" />
              <select id="courts-count" value={courtsCount} onChange={(e) => handleCourtsCountChange(parseInt(e.target.value))} className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>{n} {n === 1 ? "campo" : "campos"}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <FieldLabel label="Nomes dos Campos" tooltip="Nome identificador de cada campo. Ex: Campo Central, Campo 2" />
              {courtNames.slice(0, courtsCount).map((cn, i) => (
                <input key={i} value={cn} onChange={(e) => setCourtNames((prev) => { const next = [...prev]; next[i] = e.target.value; return next; })}
                  className="w-full rounded-lg border border-border bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder={`Campo ${i + 1}`} />
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs px-3 py-2 rounded-lg">
              Capacidade: <strong>{maxTitulars} jogadores titulares</strong> ({courtsCount} {courtsCount === 1 ? "campo" : "campos"} × {playersPerSide * 2} jogadores/campo)
            </div>

            <div>
              <FieldLabel label="Formato" tooltip="Simples: cada par joga uma vez. Duplo: cada par joga duas vezes (ida e volta)." />
              <div className="flex gap-3 mt-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" checked={matchesPerPair === 1} onChange={() => setMatchesPerPair(1)} className="text-primary focus:ring-primary" />
                  Round Robin Simples
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" checked={matchesPerPair === 2} onChange={() => setMatchesPerPair(2)} className="text-primary focus:ring-primary" />
                  Round Robin Duplo
                </label>
              </div>
            </div>

            <div>
              <FieldLabel label="Sets por Jogo" tooltip="1 Set: jogo rápido. 2 Sets: dois sets obrigatórios. Melhor de 3: ganha quem vencer 2 sets." />
              <div className="flex gap-3 mt-1">
                {[1, 2, 3].map((n) => (
                  <label key={n} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={numberOfSets === n} onChange={() => setNumberOfSets(n)} className="text-primary focus:ring-primary" />
                    {n === 1 ? "1 Set" : n === 2 ? "2 Sets" : "Melhor de 3"}
                  </label>
                ))}
              </div>
            </div>

            {teamSize === 2 && (
              <div>
                <FieldLabel label="Modo de Equipas" tooltip="Fixas: pares por ordem de seleção. Aleatórias: pares gerados aleatoriamente. Manuais: escolha manual. Aleatórias por Ronda: novas equipas em cada ronda. Por Nível: divide jogadores por classificação." />
                <div className="flex flex-wrap gap-3 mt-1">
                  {(["FIXED_TEAMS", "RANDOM_TEAMS", "MANUAL_TEAMS", "RANDOM_PER_ROUND", "RANKED_SPLIT"] as const).map((mode) => (
                    <label key={mode} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" checked={teamMode === mode} onChange={() => { setTeamMode(mode); if (mode === "RANKED_SPLIT" && !rankingLoaded) { getPlayersWithRanking(seasonId).then((data) => { setRankingData(data); setRankingLoaded(true); }).catch(() => {}); } }} className="text-primary focus:ring-primary" />
                      {mode === "FIXED_TEAMS" ? "Equipas Fixas" : mode === "RANDOM_TEAMS" ? "Equipas Aleatórias" : mode === "MANUAL_TEAMS" ? "Equipas Manuais" : mode === "RANDOM_PER_ROUND" ? "Aleatórias por Ronda" : "Aleatórias por Nível"}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {teamSize === 2 && teamMode === "RANDOM_PER_ROUND" && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 space-y-3">
                <p className="text-sm text-indigo-800">
                  Cada ronda terá novas equipas aleatórias. Nenhum par se repete até esgotar todas as combinações.
                </p>
                <div>
                  <FieldLabel label="Número de Rondas" tooltip="Quantas rondas terá o torneio. Cada ronda gera equipas aleatórias diferentes. Máximo: quando os pares se esgotam." htmlFor="num-rounds" />
                  <div className="flex items-center gap-3 mt-1">
                    <input
                      id="num-rounds"
                      type="number"
                      min={1}
                      max={maxPossibleRounds}
                      value={numberOfRounds}
                      onChange={(e) => setNumberOfRounds(Math.max(1, Math.min(maxPossibleRounds, parseInt(e.target.value) || 1)))}
                      className="w-20 rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <span className="text-xs text-indigo-600">
                      Máximo: {maxPossibleRounds} rondas
                      {titularIds.length > 0 && ` (para ${titularIds.length} jogadores)`}
                    </span>
                  </div>
                </div>
                <Input
                  label="Seed"
                  tooltip="Código que determina a aleatoriedade. Mesmo seed = mesmas equipas."
                  value={randomSeed}
                  onChange={(e) => setRandomSeed(e.target.value)}
                  className="w-40"
                />
              </div>
            )}

            {teamSize === 2 && teamMode === "RANKED_SPLIT" && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 space-y-3">
                <p className="text-sm text-purple-800">
                  Os jogadores inscritos são divididos em dois grupos com base na classificação da época.
                  Os melhores classificados jogam entre si (Grupo A), os restantes jogam entre si (Grupo B).
                </p>
                <div>
                  <FieldLabel label="Modo dentro de cada grupo" tooltip="Fixo: equipas aleatórias geradas uma vez. Por Ronda: equipas aleatórias diferentes em cada ronda." />
                  <div className="flex gap-3 mt-1">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" checked={rankedSplitSubMode === "fixed"} onChange={() => setRankedSplitSubMode("fixed")} className="text-primary focus:ring-primary" />
                      Equipas Fixas
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" checked={rankedSplitSubMode === "per_round"} onChange={() => setRankedSplitSubMode("per_round")} className="text-primary focus:ring-primary" />
                      Aleatórias por Ronda
                    </label>
                  </div>
                </div>
                {rankedSplitSubMode === "per_round" && (
                  <div>
                    <FieldLabel label="Número de Rondas" tooltip="Cada ronda gera equipas aleatórias diferentes dentro de cada grupo." htmlFor="num-rounds-split" />
                    <div className="flex items-center gap-3 mt-1">
                      <input
                        id="num-rounds-split"
                        type="number"
                        min={1}
                        max={Math.max(Math.floor(maxTitulars / 2) - 1, 1)}
                        value={numberOfRounds}
                        onChange={(e) => setNumberOfRounds(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <span className="text-xs text-purple-600">
                        Máximo: {Math.max(Math.floor(maxTitulars / 2) - 1, 1)} rondas (por grupo)
                      </span>
                    </div>
                  </div>
                )}
                <Input
                  label="Seed"
                  tooltip="Código que determina a aleatoriedade. Mesmo seed = mesmas equipas."
                  value={randomSeed}
                  onChange={(e) => setRandomSeed(e.target.value)}
                  className="w-40"
                />
              </div>
            )}

            <Button onClick={() => { if (!name.trim()) { setError("Nome é obrigatório."); return; } if (!startDate) { setError("Data do torneio é obrigatória."); return; } setError(null); setStep(2); }}>Seguinte</Button>
          </div>
        </Card>
      )}

      {/* Step 2: Players */}
      {step === 2 && (
        <Card>
          <h2 className="text-lg font-semibold mb-4">Passo 2: Jogadores</h2>
          <p className="text-sm text-text-muted mb-1">
            Selecione os jogadores ({selectionOrder.length} selecionados).
            {selectionOrder.length > 0 && (teamSize === 1 ? " Mínimo 2." : " Número par de titulares (mínimo 4).")}
          </p>
          <p className="text-xs text-text-muted mb-3">
            Capacidade: <strong>{maxTitulars} titulares</strong>.
            {selectionOrder.length > maxTitulars && (
              <span className="text-amber-600"> {selectionOrder.length - maxTitulars} suplente(s).</span>
            )}
          </p>

          {teamMode === "RANDOM_PER_ROUND" && titularIds.length >= 4 && (
            <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs px-3 py-2 rounded-lg mb-3">
              Modo Aleatórias por Ronda: <strong>{numberOfRounds}</strong> ronda(s) com equipas diferentes.
              Máximo possível: <strong>{Math.max(titularIds.length - 1, 1)}</strong> rondas para {titularIds.length} jogadores.
            </div>
          )}

          {teamMode === "RANKED_SPLIT" && titularIds.length >= 4 && (
            <div className="bg-purple-50 border border-purple-200 text-purple-800 text-xs px-3 py-2 rounded-lg mb-3 space-y-2">
              <p>Modo <strong>Aleatórias por Nível</strong>: {titularIds.length} titulares divididos em 2 grupos de {Math.floor(titularIds.length / 2)} jogadores com base na classificação.</p>
              {rankingLoaded && (() => {
                const halfSize = Math.floor(titularIds.length / 2);
                const titularRanked = titularIds
                  .map((id) => ({ id, rank: rankingData.findIndex((r) => r.playerId === id) }))
                  .sort((a, b) => {
                    const ra = a.rank === -1 ? 9999 : a.rank;
                    const rb = b.rank === -1 ? 9999 : b.rank;
                    return ra - rb;
                  });
                const groupA = titularRanked.slice(0, halfSize).map((r) => r.id);
                const groupB = titularRanked.slice(halfSize).map((r) => r.id);
                return (
                  <div className="space-y-1">
                    <p><strong>Grupo A (melhores):</strong> {groupA.map((id) => { const p = players.find((pl) => pl.id === id); return p?.nickname || p?.fullName || "?"; }).join(", ")}</p>
                    <p><strong>Grupo B (restantes):</strong> {groupB.map((id) => { const p = players.find((pl) => pl.id === id); return p?.nickname || p?.fullName || "?"; }).join(", ")}</p>
                  </div>
                );
              })()}
            </div>
          )}

          {players.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-lg mb-3">
              Nenhum membro na liga.{" "}
              <a href={`/ligas/${leagueId}/membros`} className="underline font-medium">Gestão de Membros</a>
            </div>
          )}

          <div className="space-y-1 max-h-80 overflow-y-auto border border-border rounded-lg p-2">
            {players.map((p) => {
              const isSelected = selectedPlayerIds.has(p.id);
              const orderIdx = selectionOrder.indexOf(p.id);
              const isTitular = isSelected && orderIdx < maxTitulars;
              const suplenteNum = isSelected && !isTitular ? orderIdx - maxTitulars + 1 : 0;

              return (
                <label key={p.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm hover:bg-surface-alt ${isSelected ? (isTitular ? "bg-emerald-50" : "bg-amber-50") : ""}`}>
                  <input type="checkbox" checked={isSelected} onChange={() => togglePlayer(p.id)} className="rounded border-border text-primary focus:ring-primary" />
                  <span className={isSelected ? "font-medium" : ""}>
                    {p.fullName}
                    {p.nickname && <span className="text-text-muted text-xs ml-1">({p.nickname})</span>}
                  </span>
                  {isSelected && isTitular && <Badge variant="success" className="ml-auto text-[10px]">Titular</Badge>}
                  {isSelected && !isTitular && <Badge variant="warning" className="ml-auto text-[10px]">Suplente #{suplenteNum}</Badge>}
                </label>
              );
            })}
            {players.length === 0 && <p className="text-sm text-text-muted py-2 text-center">Sem membros.</p>}
          </div>

          <div className="flex gap-2 mt-4">
            <Button variant="ghost" onClick={() => setStep(1)}>Anterior</Button>
            {selectionOrder.length === 0 && (
              <Button variant="secondary" onClick={() => { setTeams([]); setError(null); setStep(reviewStep); }}>
                Criar sem jogadores
              </Button>
            )}
            {selectionOrder.length > 0 && (
              <Button onClick={handleStep2Next}>Seguinte</Button>
            )}
          </div>
        </Card>
      )}

      {/* Step 3: Teams (only for 2v2, not RANDOM_PER_ROUND) */}
      {step === 3 && teamSize === 2 && teamMode !== "RANDOM_PER_ROUND" && (
        <Card>
          <h2 className="text-lg font-semibold mb-4">
            Passo 3: {teamMode === "RANDOM_TEAMS" ? "Equipas Aleatórias" : teamMode === "MANUAL_TEAMS" ? "Formar Equipas Manualmente" : "Formar Equipas"}
          </h2>

          {teamMode === "RANDOM_TEAMS" && (
            <div className="flex items-center gap-2 mb-4">
              <Input label="Seed" tooltip="Código que determina a aleatoriedade. Mesmo seed = mesmas equipas." value={randomSeed} onChange={(e) => setRandomSeed(e.target.value)} className="w-32" />
              <Button size="sm" variant="secondary" onClick={generateRandomTeamsLocal}>Regenerar</Button>
            </div>
          )}

          {teamMode === "MANUAL_TEAMS" && unassignedPlayers.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-2 rounded-lg mb-4">
              <strong>Por atribuir ({unassignedPlayers.length}):</strong> {unassignedPlayers.map((p) => p.nickname || p.fullName).join(", ")}
            </div>
          )}

          <div className="space-y-3">
            {teams.map((team, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-surface-alt rounded-lg border border-border">
                <input value={team.name} onChange={(e) => setTeams((prev) => { const next = [...prev]; next[idx] = { ...next[idx], name: e.target.value }; return next; })}
                  className="w-28 text-sm font-medium border-b border-transparent hover:border-border focus:border-primary focus:outline-none bg-transparent" />
                <div className="flex-1 flex gap-2">
                  <select value={team.player1Id} onChange={(e) => updateTeamPlayer(idx, "player1Id", e.target.value)} className="flex-1 rounded border border-border bg-white px-2 py-1 text-sm focus:border-primary focus:outline-none">
                    {teamMode === "MANUAL_TEAMS" && !team.player1Id && <option value="">-- Selecionar --</option>}
                    {titularPlayers.map((p) => <option key={p.id} value={p.id}>{p.nickname || p.fullName}</option>)}
                  </select>
                  <span className="text-text-muted text-sm self-center">&amp;</span>
                  <select value={team.player2Id ?? ""} onChange={(e) => updateTeamPlayer(idx, "player2Id", e.target.value)} className="flex-1 rounded border border-border bg-white px-2 py-1 text-sm focus:border-primary focus:outline-none">
                    {teamMode === "MANUAL_TEAMS" && !team.player2Id && <option value="">-- Selecionar --</option>}
                    {titularPlayers.map((p) => <option key={p.id} value={p.id}>{p.nickname || p.fullName}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>

          {suplentePlayers.length > 0 && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <p className="text-sm font-medium text-amber-800 mb-1">Suplentes ({suplentePlayers.length})</p>
              {suplentePlayers.map((p, i) => (
                <p key={p.id} className="text-xs text-amber-700">#{i + 1} — {p.nickname || p.fullName}</p>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <Button variant="ghost" onClick={() => setStep(2)}>Anterior</Button>
            <Button onClick={() => { if (!validateStep3()) return; setError(null); setStep(reviewStep); }}>Seguinte</Button>
          </div>
        </Card>
      )}

      {/* Review step */}
      {step === reviewStep && (
        <Card>
          <h2 className="text-lg font-semibold mb-4">
            Passo {reviewStep}: {editMode ? "Confirmar Alterações" : "Confirmar e Criar"}
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-border"><span className="text-text-muted">Nome</span><span className="font-medium">{name}</span></div>
            <div className="flex justify-between py-2 border-b border-border"><span className="text-text-muted">Data</span><span className="font-medium">{startDate ? new Date(startDate + "T00:00:00").toLocaleDateString("pt-PT", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) : "—"}</span></div>
            <div className="flex justify-between py-2 border-b border-border"><span className="text-text-muted">Modo de Jogo</span><span className="font-medium">{teamSize === 1 ? "Individual (1v1)" : "Pares (2v2)"}</span></div>
            <div className="flex justify-between py-2 border-b border-border"><span className="text-text-muted">Campos</span><span className="font-medium">{courtNames.slice(0, courtsCount).join(", ")}</span></div>
            <div className="flex justify-between py-2 border-b border-border"><span className="text-text-muted">Formato</span><span className="font-medium">{matchesPerPair === 1 ? "RR Simples" : "RR Duplo"}</span></div>
            <div className="flex justify-between py-2 border-b border-border"><span className="text-text-muted">Sets</span><span className="font-medium">{numberOfSets === 1 ? "1 Set" : numberOfSets === 2 ? "2 Sets" : "Melhor de 3"}</span></div>
            {teamSize === 2 && <div className="flex justify-between py-2 border-b border-border"><span className="text-text-muted">Modo Equipas</span><span className="font-medium">{teamModeLabel(teamMode)}</span></div>}
            {teamMode === "RANDOM_PER_ROUND" && (
              <div className="flex justify-between py-2 border-b border-border"><span className="text-text-muted">Rondas</span><span className="font-medium">{numberOfRounds} rondas (equipas aleatórias por ronda)</span></div>
            )}
            {teamMode === "RANKED_SPLIT" && rankedSplitSubMode === "per_round" && (
              <div className="flex justify-between py-2 border-b border-border"><span className="text-text-muted">Rondas</span><span className="font-medium">{numberOfRounds} rondas (por grupo, equipas aleatórias por ronda)</span></div>
            )}
            <div className="py-2">
              {teamMode === "RANKED_SPLIT" ? (
                <div className="bg-purple-50 border border-purple-200 text-purple-800 text-sm px-4 py-3 rounded-lg">
                  {titularIds.length} jogadores divididos em 2 grupos de {Math.floor(titularIds.length / 2)} por classificação.
                  Equipas {rankedSplitSubMode === "per_round" ? `aleatórias por ronda (${numberOfRounds} rondas)` : "fixas aleatórias"} dentro de cada grupo.
                  Grupo A joga só contra Grupo A, Grupo B só contra Grupo B.
                </div>
              ) : teamMode === "RANDOM_PER_ROUND" ? (
                <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 text-sm px-4 py-3 rounded-lg">
                  As equipas serão geradas automaticamente em cada ronda. {titularIds.length} jogadores titulares, {numberOfRounds} ronda(s) com equipas diferentes.
                </div>
              ) : teams.length > 0 ? (
                <>
                  <span className="text-text-muted block mb-2">{teamSize === 1 ? `Jogadores (${teams.length})` : `Equipas (${teams.length})`}</span>
                  <div className="space-y-1">
                    {teams.map((t, i) => (
                      <div key={i} className="text-sm pl-2">
                        <span className="font-medium">{t.name}:</span>{" "}
                        {teamSize === 1 ? getPlayerName(t.player1Id) : `${getPlayerName(t.player1Id)} & ${getPlayerName(t.player2Id ?? "")}`}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-lg">
                  Sem jogadores atribuídos. Poderá editar o torneio para adicionar jogadores mais tarde.
                </div>
              )}
            </div>
            {suplentePlayers.length > 0 && (
              <div className="py-2 border-t border-border">
                <span className="text-text-muted block mb-2">Suplentes ({suplentePlayers.length})</span>
                {suplentePlayers.map((p, i) => (
                  <div key={p.id} className="text-sm pl-2 text-amber-700">#{i + 1} — {p.nickname || p.fullName}</div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="ghost" onClick={() => setStep(teams.length === 0 && teamMode !== "RANDOM_PER_ROUND" && teamMode !== "RANKED_SPLIT" ? 2 : (skipsTeamStep ? 2 : 3))}>Anterior</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading
                ? (editMode ? (needsRegeneration ? "A regenerar..." : "A guardar...") : "A criar torneio...")
                : (editMode
                    ? (needsRegeneration ? "Guardar e Regenerar Calendário" : "Guardar Alterações")
                    : (teams.length > 0 || teamMode === "RANDOM_PER_ROUND" || teamMode === "RANKED_SPLIT" ? "Criar Torneio e Gerar Calendário" : "Criar Torneio")
                  )
              }
            </Button>
            {editMode && !needsRegeneration && (
              <span className="text-xs text-emerald-600 self-center">O calendário existente será preservado</span>
            )}
            {editMode && needsRegeneration && (teams.length > 0 || teamMode === "RANDOM_PER_ROUND" || teamMode === "RANKED_SPLIT") && (
              <span className="text-xs text-amber-600 self-center">O calendário será regenerado</span>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
