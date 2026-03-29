"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, FieldLabel } from "@/components/ui/tooltip";
import { createTournament, generateSchedule, updateTournament, updateTournamentBasic, getPlayersWithRanking, saveTemplate, getTemplates, deleteTemplate } from "@/lib/actions";
import { getClubsForLeague, getAvailableCourtsForClub } from "@/lib/actions/club-actions";
import { sanitizeError } from "@/lib/error-utils";

type ClubCourt = { id: string; name: string; quality: "GOOD" | "MEDIUM" | "BAD"; orderIndex: number };

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

type TeamMode = "FIXED_TEAMS" | "RANDOM_TEAMS" | "MANUAL_TEAMS" | "RANDOM_PER_ROUND" | "RANKED_SPLIT" | "AMERICANO";

export function TournamentWizard({
  leagueId,
  seasonId,
  existingPlayers,
  editMode,
  leagueName,
  seasonName,
}: {
  leagueId: string | null;
  seasonId: string | null;
  existingPlayers: Player[];
  leagueName?: string;
  seasonName?: string;
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
      clubId?: string;
      courtIds?: string[];
      courtGroupLabels?: Record<string, string>;
      format?: string;
      numberOfGroups?: number;
      teamsAdvancing?: number;
      hasQuarterFinals?: boolean;
      hasSemiFinals?: boolean;
      hasThirdPlace?: boolean;
      knockoutSets?: number;
      tiebreakerCriteria?: string;
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

  // Club & Court selection
  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([]);
  const [clubsLoaded, setClubsLoaded] = useState(false);
  const [clubId, setClubId] = useState<string>(editMode?.initialData.clubId ?? "");
  const [clubCourts, setClubCourts] = useState<ClubCourt[]>([]);
  const [selectedCourtIds, setSelectedCourtIds] = useState<string[]>(editMode?.initialData.courtIds ?? []);
  const [courtGroupLabels, setCourtGroupLabels] = useState<Record<string, string>>(editMode?.initialData.courtGroupLabels ?? {});

  // GROUP_KNOCKOUT config
  const [tournamentFormat, setTournamentFormat] = useState<"ROUND_ROBIN" | "GROUP_KNOCKOUT">(
    (editMode?.initialData.format as any) ?? "ROUND_ROBIN"
  );
  const [numberOfGroups, setNumberOfGroups] = useState(editMode?.initialData.numberOfGroups ?? 2);
  const [teamsAdvancing, setTeamsAdvancing] = useState(editMode?.initialData.teamsAdvancing ?? 1);
  const [hasQuarterFinals, setHasQuarterFinals] = useState(editMode?.initialData.hasQuarterFinals ?? false);
  const [hasSemiFinals, setHasSemiFinals] = useState(editMode?.initialData.hasSemiFinals ?? false);
  const [hasThirdPlace, setHasThirdPlace] = useState(editMode?.initialData.hasThirdPlace ?? false);
  const [knockoutSets, setKnockoutSets] = useState(editMode?.initialData.knockoutSets ?? 1);
  const [tiebreakerCriteria, setTiebreakerCriteria] = useState<string[]>(
    editMode?.initialData.tiebreakerCriteria
      ? JSON.parse(editMode.initialData.tiebreakerCriteria)
      : ["POINTS", "HEAD_TO_HEAD", "SETS_DIFF", "GAMES_DIFF", "SETS_WON", "GAMES_WON", "RANDOM"]
  );

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

  // Templates
  const [templates, setTemplates] = useState<{ id: string; name: string; config: string }[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  const loadTemplates = useCallback(async () => {
    if (templatesLoaded || !leagueId) return;
    try {
      const t = await getTemplates(leagueId);
      setTemplates(t as any);
      setTemplatesLoaded(true);
    } catch { /* ignore */ }
  }, [leagueId, templatesLoaded]);

  const handleApplyTemplate = (config: string) => {
    try {
      const c = JSON.parse(config);
      if (c.teamMode) setTeamMode(c.teamMode);
      if (c.numberOfSets) setNumberOfSets(c.numberOfSets);
      if (c.matchesPerPair) setMatchesPerPair(c.matchesPerPair);
      if (c.courtsCount) setCourtsCount(c.courtsCount);
      if (c.teamSize) setTeamSize(c.teamSize);
      if (c.numberOfRounds) setNumberOfRounds(c.numberOfRounds);
      if (c.format) setTournamentFormat(c.format);
      if (c.numberOfGroups) setNumberOfGroups(c.numberOfGroups);
      if (c.knockoutSets) setKnockoutSets(c.knockoutSets);
      if (c.rankedSplitSubMode) setRankedSplitSubMode(c.rankedSplitSubMode);
    } catch { /* ignore */ }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    setSavingTemplate(true);
    try {
      const config = JSON.stringify({
        teamMode, numberOfSets, matchesPerPair, courtsCount, teamSize,
        numberOfRounds, format: tournamentFormat, numberOfGroups,
        knockoutSets, rankedSplitSubMode,
      });
      if (!leagueId) return;
      await saveTemplate(leagueId, templateName, config);
      setShowSaveTemplate(false);
      setTemplateName("");
      setTemplatesLoaded(false); // Reload on next open
    } catch { /* ignore */ }
    setSavingTemplate(false);
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteTemplate(id);
      setTemplates((t) => t.filter((x) => x.id !== id));
    } catch { /* ignore */ }
  };

  // Derived values
  const selectedPlayerIds = new Set(selectionOrder);
  const playersPerSide = teamSize;
  const effectiveCourtsCount = selectedCourtIds.length > 0 ? selectedCourtIds.length : courtsCount;
  const maxTitulars = effectiveCourtsCount * 2 * playersPerSide;
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
  const skipsTeamStep = teamSize === 1 || teamMode === "RANDOM_PER_ROUND" || teamMode === "RANKED_SPLIT" || teamMode === "AMERICANO";
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

  const loadClubs = useCallback(async () => {
    if (clubsLoaded || !leagueId) return;
    try {
      const data = await getClubsForLeague(leagueId);
      setClubs(data.map((c: any) => ({ id: c.id, name: c.name })));
      setClubsLoaded(true);
      // Auto-select first club if only one and none selected
      if (data.length === 1 && !clubId) {
        setClubId(data[0].id);
        const courts = await getAvailableCourtsForClub(data[0].id);
        setClubCourts(courts);
      }
    } catch {}
  }, [leagueId, clubsLoaded, clubId]);

  const handleClubChange = async (newClubId: string) => {
    setClubId(newClubId);
    setSelectedCourtIds([]);
    if (newClubId) {
      try {
        const courts = await getAvailableCourtsForClub(newClubId);
        setClubCourts(courts);
      } catch {
        setClubCourts([]);
      }
    } else {
      setClubCourts([]);
    }
  };

  const toggleCourtSelection = (courtId: string) => {
    setSelectedCourtIds((prev) =>
      prev.includes(courtId)
        ? prev.filter((id) => id !== courtId)
        : [...prev, courtId]
    );
  };

  // Load clubs on mount
  useState(() => { loadClubs(); });

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
    (teamMode === "RANDOM_PER_ROUND" || teamMode === "AMERICANO" || (teamMode === "RANKED_SPLIT" && rankedSplitSubMode === "per_round")) &&
    numberOfRounds !== (editMode.initialData.numberOfRounds ?? 3);

  const needsRegeneration = !editMode ? true : (
    courtsCount !== editMode.initialData.courtsCount ||
    matchesPerPair !== editMode.initialData.matchesPerPair ||
    (teamSize === 1 ? "FIXED_TEAMS" : teamMode) !== editMode.initialData.teamMode ||
    teamSize !== editMode.initialData.teamSize ||
    ((teamMode === "RANDOM_PER_ROUND" || teamMode === "RANKED_SPLIT" || teamMode === "AMERICANO") && roundsChanged) ||
    (["RANDOM_TEAMS", "RANDOM_PER_ROUND", "RANKED_SPLIT", "AMERICANO"].includes(teamMode) && randomSeed !== editMode.initialData.randomSeed) ||
    // Player set changed (added/removed players)
    selectionOrder.length !== editMode.initialData.selectedPlayerIds.length ||
    !selectionOrder.every((id) => editMode.initialData.selectedPlayerIds.includes(id))
  );

  const handleSubmit = async () => {
    // For RANDOM_PER_ROUND and RANKED_SPLIT, skip team validation — teams are generated server-side
    if (teamMode !== "RANDOM_PER_ROUND" && teamMode !== "RANKED_SPLIT" && teamMode !== "AMERICANO" && teams.length > 0) {
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
      const needsRounds = teamMode === "RANDOM_PER_ROUND" || teamMode === "AMERICANO" || (teamMode === "RANKED_SPLIT" && rankedSplitSubMode === "per_round");
      const needsSeed = ["RANDOM_TEAMS", "RANDOM_PER_ROUND", "RANKED_SPLIT", "AMERICANO"].includes(teamMode);
      // Derive court names from selected club courts for backward compat
      const selectedCourts = clubCourts.filter((c) => selectedCourtIds.includes(c.id));
      const derivedCourtNames = selectedCourts.map((c) => c.name);
      const payload = {
        name,
        startDate: startDate || undefined,
        courtsCount: selectedCourtIds.length > 0 ? selectedCourtIds.length : courtsCount,
        courtNames: selectedCourtIds.length > 0 ? derivedCourtNames : courtNames,
        clubId: clubId || undefined,
        courtIds: selectedCourtIds.length > 0 ? selectedCourtIds : undefined,
        courtGroupLabels: (teamMode === "RANKED_SPLIT" || tournamentFormat === "GROUP_KNOCKOUT") && Object.keys(courtGroupLabels).length > 0 ? courtGroupLabels : undefined,
        format: tournamentFormat,
        ...(tournamentFormat === "GROUP_KNOCKOUT" ? {
          numberOfGroups,
          teamsAdvancing,
          hasQuarterFinals,
          hasSemiFinals,
          hasThirdPlace,
          knockoutSets,
          tiebreakerCriteria: JSON.stringify(tiebreakerCriteria),
        } : {}),
        matchesPerPair,
        numberOfSets,
        teamSize,
        teamMode: effectiveTeamMode,
        randomSeed: needsSeed && teamSize === 2 ? randomSeed : undefined,
        numberOfRounds: needsRounds ? numberOfRounds : undefined,
        rankedSplitSubMode: teamMode === "RANKED_SPLIT" ? rankedSplitSubMode : undefined,
        teams: (teamMode === "RANDOM_PER_ROUND" || teamMode === "RANKED_SPLIT" || teamMode === "AMERICANO") ? [] : teams,
        allPlayerIds: selectionOrder,
      };

      if (editMode) {
        if (needsRegeneration) {
          // Structural change: full reset + regenerate schedule
          await updateTournament({ tournamentId: editMode.tournamentId, ...payload });
          const hasTeamsOrPerRound = teams.length > 0 || teamMode === "RANDOM_PER_ROUND" || teamMode === "RANKED_SPLIT" || teamMode === "AMERICANO";
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
        const tournament = await createTournament({ leagueId: leagueId!, seasonId: seasonId!, ...payload });
        const hasTeamsOrPerRound = teams.length > 0 || teamMode === "RANDOM_PER_ROUND" || teamMode === "RANKED_SPLIT" || teamMode === "AMERICANO";
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
      case "AMERICANO": return "Americano";
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
    if (teamMode === "RANDOM_PER_ROUND" || teamMode === "AMERICANO" || (teamMode === "RANKED_SPLIT" && rankedSplitSubMode === "per_round")) {
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
    } else if (teamMode === "RANDOM_PER_ROUND" || teamMode === "AMERICANO") {
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

  const stepLabels = [
    { num: 1, label: "Configuração", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { num: 2, label: "Jogadores", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    ...(!skipsTeamStep ? [{ num: 3, label: "Equipas", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> }] : []),
    { num: reviewStep, label: "Confirmar", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ─── Top Header Card ─── */}
      <div className="rounded-lg shadow-card bg-surface border border-border overflow-hidden">
        <div className="h-28" style={{ background: "linear-gradient(to right, #5766da, #7c6fe0, #a78bfa)" }} />

        <div className="px-6 pb-6 relative">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border-4 border-surface absolute -top-10 left-6" style={{ background: "linear-gradient(to bottom right, #5766da, #8b9cf7)" }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>

          <div className="pt-14 flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Name & breadcrumb */}
            <div className="flex-1">
              <div className="flex items-center gap-2 text-xs text-text-muted mb-1 font-medium">
                <Link href="/ligas" className="hover:text-primary transition-colors">Ligas</Link>
                <span>&rsaquo;</span>
                <Link href={`/ligas/${leagueId}`} className="hover:text-primary transition-colors">{leagueName || "Liga"}</Link>
                <span>&rsaquo;</span>
                <Link href={`/ligas/${leagueId}/epocas/${seasonId}`} className="hover:text-primary transition-colors">{seasonName || "Época"}</Link>
                <span>&rsaquo;</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-extrabold tracking-tight">{editMode ? "Editar Torneio" : "Novo Torneio"}</h1>
                <Badge variant="info">Passo {step} de {totalSteps}</Badge>
              </div>
            </div>

            {/* Step progress bar */}
            <div className="flex items-center gap-1.5 min-w-[180px]">
              {stepBars.map((s) => (
                <div key={s} className={`h-2 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-border"}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Body: Sidebar + Content ─── */}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Left Sidebar */}
        <div className="space-y-5">
          {/* Step Navigation */}
          <Card className="py-5 px-5">
            <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-4">Passos</h3>
            <div className="space-y-1.5">
              {stepLabels.map((sl) => {
                const isCurrent = step === sl.num;
                const isCompleted = step > sl.num;
                return (
                  <button
                    key={sl.num}
                    onClick={() => {
                      // Only allow navigating to completed steps
                      if (isCompleted) setStep(sl.num);
                    }}
                    disabled={!isCompleted && !isCurrent}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isCurrent
                        ? "bg-primary/10 text-primary"
                        : isCompleted
                          ? "text-text hover:bg-surface-hover cursor-pointer"
                          : "text-text-muted/50 cursor-default"
                    }`}
                  >
                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      isCurrent
                        ? "bg-primary text-white"
                        : isCompleted
                          ? "bg-success/20 text-success"
                          : "bg-border text-text-muted/50"
                    }`}>
                      {isCompleted ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      ) : sl.num}
                    </span>
                    {sl.label}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Info Card */}
          <Card className="py-5 px-5">
            <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-4">Resumo</h3>
            <div className="space-y-3">
              {name && (
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-text-muted">Nome</p>
                    <p className="text-sm font-medium text-text truncate">{name}</p>
                  </div>
                </div>
              )}
              {startDate && (
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-text-muted">Data</p>
                    <p className="text-sm font-medium text-text">{new Date(startDate + "T00:00:00").toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-text-muted">Jogadores</p>
                  <p className="text-sm font-medium text-text">{selectionOrder.length > 0 ? `${selectionOrder.length} selecionados` : "Nenhum"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-text-muted">Campos</p>
                  <p className="text-sm font-medium text-text">{effectiveCourtsCount}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Links */}
          <Card className="py-5 px-5">
            <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-4">Ligações</h3>
            <div className="space-y-1.5">
              <Link
                href={`/ligas/${leagueId}`}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-text hover:bg-surface-hover transition-colors"
              >
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {leagueName || "Liga"}
              </Link>
              <Link
                href={`/ligas/${leagueId}/epocas/${seasonId}`}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-text hover:bg-surface-hover transition-colors"
              >
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {seasonName || "Época"}
              </Link>
            </div>
          </Card>
        </div>

        {/* Right Content Area */}
        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>
          )}

          {/* Step 1: Basic info */}
          {step === 1 && (
            <Card className="py-5 px-6">
              <h2 className="text-base font-bold mb-5 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Configuração do Torneio
              </h2>

              {/* Template selector */}
              {!editMode && (
                <div className="mb-5 p-3 bg-surface-alt rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Usar Modelo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      defaultValue=""
                      onFocus={loadTemplates}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const tpl = templates.find((t) => t.id === e.target.value);
                        if (tpl) handleApplyTemplate(tpl.config);
                      }}
                    >
                      <option value="">Sem modelo (começar do zero)</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    {templates.length > 0 && (
                      <button
                        type="button"
                        className="text-xs text-red-500 hover:text-red-700 whitespace-nowrap"
                        onClick={() => {
                          const sel = (document.querySelector('select') as HTMLSelectElement)?.value;
                          if (sel) handleDeleteTemplate(sel);
                        }}
                      >
                        Apagar
                      </button>
                    )}
                  </div>
                </div>
              )}

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

            {/* Club & Court Selection */}
            <div>
              <FieldLabel label="Clube" tooltip="Selecione o clube onde o torneio sera realizado. Os campos do clube ficam disponiveis para selecao." htmlFor="club-select" />
              <select
                id="club-select"
                value={clubId}
                onChange={(e) => handleClubChange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Selecionar clube...</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {clubsLoaded && clubs.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Nenhum clube associado. <a href={`/ligas/${leagueId}?modo=editar#clubes`} className="underline font-medium">Associar clube</a>
                </p>
              )}
            </div>

            {clubId && clubCourts.length > 0 && (
              <div>
                <FieldLabel label="Campos" tooltip="Selecione os campos que serao usados neste torneio. A qualidade afeta a distribuicao dos jogos." />
                <div className="space-y-1.5 mt-1">
                  {clubCourts.map((court) => {
                    const isSelected = selectedCourtIds.includes(court.id);
                    const qualityColor = court.quality === "GOOD" ? "text-green-600" : court.quality === "MEDIUM" ? "text-amber-600" : "text-red-600";
                    const qualityLabel = court.quality === "GOOD" ? "Bom" : court.quality === "MEDIUM" ? "Medio" : "Mau";
                    return (
                      <label
                        key={court.id}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                          isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-surface-alt/50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleCourtSelection(court.id)}
                          className="text-primary focus:ring-primary rounded"
                        />
                        <span className="text-sm font-medium flex-1">{court.name}</span>
                        <span className={`text-xs font-semibold ${qualityColor}`}>{qualityLabel}</span>
                      </label>
                    );
                  })}
                </div>
                {selectedCourtIds.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Selecione pelo menos 1 campo.</p>
                )}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs px-3 py-2 rounded-lg">
              Capacidade: <strong>{maxTitulars} jogadores titulares</strong> ({effectiveCourtsCount} {effectiveCourtsCount === 1 ? "campo" : "campos"} &times; {playersPerSide * 2} jogadores/campo)
            </div>

            {/* Court group assignment for RANKED_SPLIT */}
            {teamMode === "RANKED_SPLIT" && selectedCourtIds.length >= 2 && (
              <div>
                <FieldLabel label="Campos por Grupo" tooltip="Atribua cada campo a um grupo. A distribuicao deve ser equilibrada em qualidade." />
                <div className="space-y-1.5 mt-1">
                  {clubCourts.filter((c) => selectedCourtIds.includes(c.id)).map((court) => {
                    const qualityColor = court.quality === "GOOD" ? "text-green-600" : court.quality === "MEDIUM" ? "text-amber-600" : "text-red-600";
                    return (
                      <div key={court.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border">
                        <span className="text-sm font-medium flex-1">{court.name}</span>
                        <span className={`text-xs font-semibold ${qualityColor}`}>
                          {court.quality === "GOOD" ? "Bom" : court.quality === "MEDIUM" ? "Medio" : "Mau"}
                        </span>
                        <select
                          value={courtGroupLabels[court.id] || ""}
                          onChange={(e) => setCourtGroupLabels((prev) => ({ ...prev, [court.id]: e.target.value }))}
                          className="rounded-lg border border-border px-2 py-1 text-xs font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="">Auto</option>
                          <option value="A">Grupo A</option>
                          <option value="B">Grupo B</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tournament Format */}
            <div>
              <FieldLabel label="Tipo de Torneio" tooltip="Round Robin: todos jogam contra todos. Fase de Grupos + Eliminatorias: grupos com classificacao seguida de eliminatorias." />
              <div className="flex gap-3 mt-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" checked={tournamentFormat === "ROUND_ROBIN"} onChange={() => setTournamentFormat("ROUND_ROBIN")} className="text-primary focus:ring-primary" />
                  Round Robin
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" checked={tournamentFormat === "GROUP_KNOCKOUT"} onChange={() => setTournamentFormat("GROUP_KNOCKOUT")} className="text-primary focus:ring-primary" />
                  Fase de Grupos + Eliminatorias
                </label>
              </div>
            </div>

            {/* GROUP_KNOCKOUT configuration */}
            {tournamentFormat === "GROUP_KNOCKOUT" && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 space-y-3">
                <p className="text-sm text-purple-800 font-semibold">Configuracao de Grupos + Eliminatorias</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-purple-700">Numero de Grupos</label>
                    <select value={numberOfGroups} onChange={(e) => setNumberOfGroups(parseInt(e.target.value))} className="mt-1 w-full rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-sm">
                      {[2, 3, 4, 6, 8].map((n) => <option key={n} value={n}>{n} grupos</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-purple-700">Equipas que avancam por grupo</label>
                    <select value={teamsAdvancing} onChange={(e) => setTeamsAdvancing(parseInt(e.target.value))} className="mt-1 w-full rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-sm">
                      {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>

                {/* Validation */}
                {(() => {
                  const total = numberOfGroups * teamsAdvancing;
                  const validTotals = [2, 4, 8];
                  const isValid = validTotals.includes(total);
                  const needsSF = total >= 4;
                  const needsQF = total >= 8;
                  return (
                    <>
                      {!isValid && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
                          Configuracao invalida: {numberOfGroups} grupos &times; {teamsAdvancing} equipas = {total}. O total deve ser 2, 4 ou 8.
                        </div>
                      )}
                      {isValid && (
                        <div className="space-y-2">
                          <div className="bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-2 rounded-lg">
                            {total} equipas avancam para eliminatorias
                            {needsQF && " (Quartos + Semi + Final)"}
                            {!needsQF && needsSF && " (Semi + Final)"}
                            {!needsQF && !needsSF && " (Final)"}
                          </div>

                          <div className="flex flex-wrap gap-3">
                            {needsQF && (
                              <label className="flex items-center gap-2 text-xs cursor-pointer">
                                <input type="checkbox" checked={hasQuarterFinals} onChange={(e) => setHasQuarterFinals(e.target.checked)} className="text-primary focus:ring-primary rounded" />
                                Quartos de Final
                              </label>
                            )}
                            {needsSF && (
                              <label className="flex items-center gap-2 text-xs cursor-pointer">
                                <input type="checkbox" checked={hasSemiFinals} onChange={(e) => setHasSemiFinals(e.target.checked)} className="text-primary focus:ring-primary rounded" />
                                Semi-Finais
                              </label>
                            )}
                            <label className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="checkbox" checked={hasThirdPlace} onChange={(e) => setHasThirdPlace(e.target.checked)} className="text-primary focus:ring-primary rounded" />
                              3o/4o Lugar
                            </label>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-purple-700">Sets nas Eliminatorias</label>
                            <div className="flex gap-3 mt-1">
                              {[1, 2, 3].map((n) => (
                                <label key={n} className="flex items-center gap-2 text-xs cursor-pointer">
                                  <input type="radio" checked={knockoutSets === n} onChange={() => setKnockoutSets(n)} className="text-primary focus:ring-primary" />
                                  {n === 1 ? "1 Set" : n === 2 ? "2 Sets" : "Melhor de 3"}
                                </label>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-purple-700">Criterios de Desempate (por ordem de prioridade)</label>
                            <div className="space-y-1 mt-1">
                              {tiebreakerCriteria.map((c, i) => {
                                const labels: Record<string, string> = {
                                  POINTS: "Pontos", HEAD_TO_HEAD: "Confronto Direto", SETS_DIFF: "Diferenca de Sets",
                                  GAMES_DIFF: "Diferenca de Games", SETS_WON: "Sets Ganhos", GAMES_WON: "Games Ganhos", RANDOM: "Sorteio",
                                };
                                return (
                                  <div key={c} className="flex items-center gap-2 text-xs bg-white rounded-lg border border-purple-100 px-2 py-1">
                                    <span className="text-purple-400 font-bold w-4">{i + 1}.</span>
                                    <span className="flex-1">{labels[c] || c}</span>
                                    <button disabled={i === 0} onClick={() => { const arr = [...tiebreakerCriteria]; [arr[i-1], arr[i]] = [arr[i], arr[i-1]]; setTiebreakerCriteria(arr); }} className="text-purple-400 hover:text-purple-600 disabled:opacity-30">&uarr;</button>
                                    <button disabled={i === tiebreakerCriteria.length - 1} onClick={() => { const arr = [...tiebreakerCriteria]; [arr[i], arr[i+1]] = [arr[i+1], arr[i]]; setTiebreakerCriteria(arr); }} className="text-purple-400 hover:text-purple-600 disabled:opacity-30">&darr;</button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

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
                  {(["FIXED_TEAMS", "RANDOM_TEAMS", "MANUAL_TEAMS", "RANDOM_PER_ROUND", "RANKED_SPLIT", "AMERICANO"] as const).map((mode) => (
                    <label key={mode} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" checked={teamMode === mode} onChange={() => { setTeamMode(mode); if (mode === "RANKED_SPLIT" && !rankingLoaded && seasonId) { getPlayersWithRanking(seasonId).then((data) => { setRankingData(data); setRankingLoaded(true); }).catch(() => {}); } }} className="text-primary focus:ring-primary" />
                      {mode === "FIXED_TEAMS" ? "Equipas Fixas" : mode === "RANDOM_TEAMS" ? "Equipas Aleatórias" : mode === "MANUAL_TEAMS" ? "Equipas Manuais" : mode === "RANDOM_PER_ROUND" ? "Aleatórias por Ronda" : mode === "RANKED_SPLIT" ? "Aleatórias por Nível" : "Americano"}
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

            {teamSize === 2 && teamMode === "AMERICANO" && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 space-y-3">
                <p className="text-sm text-emerald-800">
                  Pares mudam a cada ronda por ranking. Ranking individual.
                  Na ronda 1, os pares s&atilde;o aleat&oacute;rios. Nas rondas seguintes, os jogadores s&atilde;o emparelhados por classifica&ccedil;&atilde;o.
                </p>
                <div>
                  <FieldLabel label="N&uacute;mero de Rondas" tooltip="Quantas rondas ter&aacute; o torneio Americano. Cada ronda gera equipas com base no ranking atual." htmlFor="num-rounds-americano" />
                  <div className="flex items-center gap-3 mt-1">
                    <input
                      id="num-rounds-americano"
                      type="number"
                      min={1}
                      max={maxPossibleRounds}
                      value={numberOfRounds}
                      onChange={(e) => setNumberOfRounds(Math.max(1, Math.min(maxPossibleRounds, parseInt(e.target.value) || 1)))}
                      className="w-20 rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <span className="text-xs text-emerald-600">
                      M&aacute;ximo: {maxPossibleRounds} rondas
                      {titularIds.length > 0 && ` (para ${titularIds.length} jogadores)`}
                    </span>
                  </div>
                </div>
                <Input
                  label="Seed"
                  tooltip="C&oacute;digo que determina a aleatoriedade da ronda 1. Mesmo seed = mesmos pares iniciais."
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
        <Card className="py-5 px-6">
          <h2 className="text-base font-bold mb-5 flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Jogadores
          </h2>
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

          {teamMode === "AMERICANO" && titularIds.length >= 4 && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-2 rounded-lg mb-3">
              Formato Americano: <strong>{numberOfRounds}</strong> ronda(s). Ranking individual, pares por ranking.
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

      {/* Step 3: Teams (only for 2v2, not RANDOM_PER_ROUND/AMERICANO) */}
      {step === 3 && teamSize === 2 && teamMode !== "RANDOM_PER_ROUND" && teamMode !== "AMERICANO" && (
        <Card className="py-5 px-6">
          <h2 className="text-base font-bold mb-5 flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            {teamMode === "RANDOM_TEAMS" ? "Equipas Aleatórias" : teamMode === "MANUAL_TEAMS" ? "Formar Equipas Manualmente" : "Formar Equipas"}
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
        <Card className="py-5 px-6">
          <h2 className="text-base font-bold mb-5 flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {editMode ? "Confirmar Alterações" : "Confirmar e Criar"}
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-border"><span className="text-text-muted">Nome</span><span className="font-medium">{name}</span></div>
            <div className="flex justify-between py-2 border-b border-border"><span className="text-text-muted">Data</span><span className="font-medium">{startDate ? new Date(startDate + "T00:00:00").toLocaleDateString("pt-PT", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) : "—"}</span></div>
            <div className="flex justify-between py-2 border-b border-border"><span className="text-text-muted">Modo de Jogo</span><span className="font-medium">{teamSize === 1 ? "Individual (1v1)" : "Pares (2v2)"}</span></div>
            <div className="flex justify-between py-2 border-b border-border"><span className="text-text-muted">Campos</span><span className="font-medium">{selectedCourtIds.length > 0 ? clubCourts.filter((c) => selectedCourtIds.includes(c.id)).map((c) => c.name).join(", ") : courtNames.slice(0, courtsCount).join(", ")}</span></div>
            <div className="flex justify-between py-2 border-b border-border"><span className="text-text-muted">Formato</span><span className="font-medium">{matchesPerPair === 1 ? "RR Simples" : "RR Duplo"}</span></div>
            <div className="flex justify-between py-2 border-b border-border"><span className="text-text-muted">Sets</span><span className="font-medium">{numberOfSets === 1 ? "1 Set" : numberOfSets === 2 ? "2 Sets" : "Melhor de 3"}</span></div>
            {teamSize === 2 && <div className="flex justify-between py-2 border-b border-border"><span className="text-text-muted">Modo Equipas</span><span className="font-medium">{teamModeLabel(teamMode)}</span></div>}
            {(teamMode === "RANDOM_PER_ROUND" || teamMode === "AMERICANO") && (
              <div className="flex justify-between py-2 border-b border-border"><span className="text-text-muted">Rondas</span><span className="font-medium">{numberOfRounds} rondas ({teamMode === "AMERICANO" ? "formato Americano" : "equipas aleatórias por ronda"})</span></div>
            )}
            {teamMode === "RANKED_SPLIT" && rankedSplitSubMode === "per_round" && (
              <div className="flex justify-between py-2 border-b border-border"><span className="text-text-muted">Rondas</span><span className="font-medium">{numberOfRounds} rondas (por grupo, equipas aleatórias por ronda)</span></div>
            )}
            <div className="py-2">
              {teamMode === "AMERICANO" ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-lg">
                  Formato Americano: {titularIds.length} jogadores, {numberOfRounds} ronda(s). Ranking individual. Pares mudam a cada ronda com base no ranking.
                  Apenas a ronda 1 é gerada inicialmente. As rondas seguintes são geradas após concluir a anterior.
                </div>
              ) : teamMode === "RANKED_SPLIT" ? (
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
          {/* Save as template */}
          {!editMode && (
            <div className="mt-4 p-3 bg-surface-alt rounded-lg border border-border">
              {showSaveTemplate ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Nome do modelo..."
                    className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                  />
                  <Button size="sm" onClick={handleSaveTemplate} disabled={savingTemplate || !templateName.trim()}>
                    {savingTemplate ? "..." : "Guardar"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowSaveTemplate(false)}>Cancelar</Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSaveTemplate(true)}
                  className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Guardar como modelo reutilizável
                </button>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <Button variant="ghost" onClick={() => setStep(teams.length === 0 && teamMode !== "RANDOM_PER_ROUND" && teamMode !== "RANKED_SPLIT" && teamMode !== "AMERICANO" ? 2 : (skipsTeamStep ? 2 : 3))}>Anterior</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading
                ? (editMode ? (needsRegeneration ? "A regenerar..." : "A guardar...") : "A criar torneio...")
                : (editMode
                    ? (needsRegeneration ? "Guardar e Regenerar Calendário" : "Guardar Alterações")
                    : (teams.length > 0 || teamMode === "RANDOM_PER_ROUND" || teamMode === "RANKED_SPLIT" || teamMode === "AMERICANO" ? "Criar Torneio e Gerar Calendário" : "Criar Torneio")
                  )
              }
            </Button>
            {editMode && !needsRegeneration && (
              <span className="text-xs text-emerald-600 self-center">O calendário existente será preservado</span>
            )}
            {editMode && needsRegeneration && (teams.length > 0 || teamMode === "RANDOM_PER_ROUND" || teamMode === "RANKED_SPLIT" || teamMode === "AMERICANO") && (
              <span className="text-xs text-amber-600 self-center">O calendário será regenerado</span>
            )}
          </div>
        </Card>
      )}

        </div>
      </div>
    </div>
  );
}
