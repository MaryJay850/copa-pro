"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { createTournament, generateSchedule, updateTournament } from "@/lib/actions";

interface Player {
  id: string;
  fullName: string;
  nickname: string | null;
}

interface TeamPair {
  name: string;
  player1Id: string;
  player2Id: string;
}

type TeamMode = "FIXED_TEAMS" | "RANDOM_TEAMS" | "MANUAL_TEAMS";

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
      courtsCount: number;
      matchesPerPair: number;
      numberOfSets: number;
      teamMode: string;
      randomSeed?: string;
      teams: { name: string; player1Id: string; player2Id: string }[];
      selectedPlayerIds: string[];
    };
  };
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [name, setName] = useState(editMode?.initialData.name ?? "");
  const [courtsCount, setCourtsCount] = useState(editMode?.initialData.courtsCount ?? 2);
  const [matchesPerPair, setMatchesPerPair] = useState(editMode?.initialData.matchesPerPair ?? 1);
  const [numberOfSets, setNumberOfSets] = useState(editMode?.initialData.numberOfSets ?? 1);
  const [teamMode, setTeamMode] = useState<TeamMode>(
    (editMode?.initialData.teamMode as TeamMode) ?? "FIXED_TEAMS"
  );

  // Step 2
  const [players] = useState<Player[]>(existingPlayers);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(
    new Set(editMode?.initialData.selectedPlayerIds ?? [])
  );

  // Step 3
  const [teams, setTeams] = useState<TeamPair[]>(editMode?.initialData.teams ?? []);
  const [randomSeed, setRandomSeed] = useState(
    editMode?.initialData.randomSeed ?? Math.random().toString(36).substring(2, 8)
  );

  const selectedPlayers = players.filter((p) => selectedPlayerIds.has(p.id));

  // Compute unassigned players for MANUAL_TEAMS mode
  const assignedPlayerIds = new Set(teams.flatMap((t) => [t.player1Id, t.player2Id].filter(Boolean)));
  const unassignedPlayers = selectedPlayers.filter((p) => !assignedPlayerIds.has(p.id));

  const togglePlayer = (id: string) => {
    const next = new Set(selectedPlayerIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedPlayerIds(next);
  };

  const generateRandomTeamsLocal = () => {
    if (selectedPlayers.length < 4 || selectedPlayers.length % 2 !== 0) {
      setError("Número par de jogadores necessário (mínimo 4).");
      return;
    }

    const shuffled = [...selectedPlayers];
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
      const p1 = shuffled[i];
      const p2 = shuffled[i + 1];
      newTeams.push({
        name: `Equipa ${newTeams.length + 1}`,
        player1Id: p1.id,
        player2Id: p2.id,
      });
    }
    setTeams(newTeams);
    setError(null);
  };

  const initFixedTeams = () => {
    if (selectedPlayers.length < 4 || selectedPlayers.length % 2 !== 0) {
      setError("Número par de jogadores necessário (mínimo 4).");
      return;
    }

    const newTeams: TeamPair[] = [];
    for (let i = 0; i < selectedPlayers.length; i += 2) {
      newTeams.push({
        name: `Equipa ${newTeams.length + 1}`,
        player1Id: selectedPlayers[i].id,
        player2Id: selectedPlayers[i + 1].id,
      });
    }
    setTeams(newTeams);
    setError(null);
  };

  const initManualTeams = () => {
    if (selectedPlayers.length < 4 || selectedPlayers.length % 2 !== 0) {
      setError("Número par de jogadores necessário (mínimo 4).");
      return;
    }
    const numTeams = selectedPlayers.length / 2;
    const newTeams: TeamPair[] = [];
    for (let i = 0; i < numTeams; i++) {
      newTeams.push({
        name: `Equipa ${i + 1}`,
        player1Id: "",
        player2Id: "",
      });
    }
    setTeams(newTeams);
    setError(null);
  };

  const updateTeamPlayer = (teamIdx: number, slot: "player1Id" | "player2Id", playerId: string) => {
    setTeams((prev) => {
      const next = [...prev];
      next[teamIdx] = { ...next[teamIdx], [slot]: playerId };
      return next;
    });
  };

  const handleSubmit = async () => {
    // Validate no duplicate players across teams
    const usedIds = new Set<string>();
    for (const t of teams) {
      if (!t.player1Id || !t.player2Id) {
        setError("Todos os lugares das equipas devem ser preenchidos.");
        return;
      }
      if (usedIds.has(t.player1Id) || usedIds.has(t.player2Id)) {
        setError("Um jogador não pode estar em múltiplas equipas.");
        return;
      }
      if (t.player1Id === t.player2Id) {
        setError("Uma equipa não pode ter o mesmo jogador duas vezes.");
        return;
      }
      usedIds.add(t.player1Id);
      usedIds.add(t.player2Id);
    }

    setLoading(true);
    setError(null);
    try {
      if (editMode) {
        await updateTournament({
          tournamentId: editMode.tournamentId,
          name,
          courtsCount,
          matchesPerPair,
          numberOfSets,
          teamMode,
          randomSeed: teamMode === "RANDOM_TEAMS" ? randomSeed : undefined,
          teams,
        });
        await generateSchedule(editMode.tournamentId);
        router.push(`/torneios/${editMode.tournamentId}`);
      } else {
        const tournament = await createTournament({
          leagueId,
          seasonId,
          name,
          courtsCount,
          matchesPerPair,
          numberOfSets,
          teamMode,
          randomSeed: teamMode === "RANDOM_TEAMS" ? randomSeed : undefined,
          teams,
        });
        await generateSchedule(tournament.id);
        router.push(`/torneios/${tournament.id}`);
      }
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  };

  const getPlayerName = (id: string) => {
    const p = players.find((p) => p.id === id);
    return p ? (p.nickname || p.fullName) : "?";
  };

  const validateStep3 = () => {
    if (teamMode === "MANUAL_TEAMS") {
      const hasEmpty = teams.some((t) => !t.player1Id || !t.player2Id);
      if (hasEmpty) {
        setError("Todos os lugares das equipas devem ser preenchidos.");
        return false;
      }
      const usedIds = new Set<string>();
      for (const t of teams) {
        if (usedIds.has(t.player1Id) || usedIds.has(t.player2Id) || t.player1Id === t.player2Id) {
          setError("Cada jogador só pode estar numa equipa.");
          return false;
        }
        usedIds.add(t.player1Id);
        usedIds.add(t.player2Id);
      }
    }
    return true;
  };

  const teamModeLabel = (mode: string) => {
    switch (mode) {
      case "RANDOM_TEAMS": return "Aleatórias";
      case "MANUAL_TEAMS": return "Manuais";
      default: return "Fixas";
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Steps indicator */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              s <= step ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Step 1: Basic info */}
      {step === 1 && (
        <Card>
          <h2 className="text-lg font-semibold mb-4">Passo 1: Informações Básicas</h2>
          <div className="space-y-4">
            <Input
              label="Nome do Torneio"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Torneio Janeiro"
              required
            />
            <div>
              <label className="block text-sm font-medium text-text mb-1">Número de Campos</label>
              <select
                value={courtsCount}
                onChange={(e) => setCourtsCount(parseInt(e.target.value))}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>{n} {n === 1 ? "campo" : "campos"}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Formato</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    value={1}
                    checked={matchesPerPair === 1}
                    onChange={() => setMatchesPerPair(1)}
                    className="text-primary focus:ring-primary"
                  />
                  Round Robin Simples
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    value={2}
                    checked={matchesPerPair === 2}
                    onChange={() => setMatchesPerPair(2)}
                    className="text-primary focus:ring-primary"
                  />
                  Round Robin Duplo
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Sets por Jogo</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={numberOfSets === 1}
                    onChange={() => setNumberOfSets(1)}
                    className="text-primary focus:ring-primary"
                  />
                  1 Set
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={numberOfSets === 2}
                    onChange={() => setNumberOfSets(2)}
                    className="text-primary focus:ring-primary"
                  />
                  2 Sets
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={numberOfSets === 3}
                    onChange={() => setNumberOfSets(3)}
                    className="text-primary focus:ring-primary"
                  />
                  Melhor de 3
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Modo de Equipas</label>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={teamMode === "FIXED_TEAMS"}
                    onChange={() => setTeamMode("FIXED_TEAMS")}
                    className="text-primary focus:ring-primary"
                  />
                  Equipas Fixas
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={teamMode === "RANDOM_TEAMS"}
                    onChange={() => setTeamMode("RANDOM_TEAMS")}
                    className="text-primary focus:ring-primary"
                  />
                  Equipas Aleatórias
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={teamMode === "MANUAL_TEAMS"}
                    onChange={() => setTeamMode("MANUAL_TEAMS")}
                    className="text-primary focus:ring-primary"
                  />
                  Equipas Manuais
                </label>
              </div>
            </div>
            <Button onClick={() => { if (name.trim()) setStep(2); else setError("Nome é obrigatório."); }}>
              Seguinte
            </Button>
          </div>
        </Card>
      )}
      {/* Step 2: Players */}
      {step === 2 && (
        <Card>
          <h2 className="text-lg font-semibold mb-4">Passo 2: Jogadores</h2>
          <p className="text-sm text-text-muted mb-3">
            Selecione os membros da liga para este torneio ({selectedPlayerIds.size} selecionados).
            Precisa de um número par (mínimo 4).
          </p>

          {players.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-lg mb-3">
              Nenhum membro na liga. Adicione membros na página de{" "}
              <a href={`/ligas/${leagueId}/membros`} className="underline font-medium">
                Gestão de Membros
              </a>{" "}
              antes de criar um torneio.
            </div>
          )}

          {/* Player list */}
          <div className="space-y-1 max-h-64 overflow-y-auto border border-border rounded-lg p-2">
            {players.map((p) => (
              <label
                key={p.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm hover:bg-surface-alt ${
                  selectedPlayerIds.has(p.id) ? "bg-blue-50 text-primary font-medium" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedPlayerIds.has(p.id)}
                  onChange={() => togglePlayer(p.id)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                {p.fullName}
                {p.nickname && <span className="text-text-muted text-xs">({p.nickname})</span>}
              </label>
            ))}
            {players.length === 0 && (
              <p className="text-sm text-text-muted py-2 text-center">Sem membros na liga.</p>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Button variant="ghost" onClick={() => setStep(1)}>Anterior</Button>
            <Button onClick={() => {
              if (selectedPlayerIds.size < 4) { setError("Selecione pelo menos 4 jogadores."); return; }
              if (selectedPlayerIds.size % 2 !== 0) { setError("Selecione um número par de jogadores."); return; }
              setError(null);
              if (teamMode === "RANDOM_TEAMS") generateRandomTeamsLocal();
              else if (teamMode === "MANUAL_TEAMS") initManualTeams();
              else initFixedTeams();
              setStep(3);
            }}>
              Seguinte
            </Button>
          </div>
        </Card>
      )}
      {/* Step 3: Teams */}
      {step === 3 && (
        <Card>
          <h2 className="text-lg font-semibold mb-4">
            Passo 3: {teamMode === "RANDOM_TEAMS" ? "Equipas Aleatórias" : teamMode === "MANUAL_TEAMS" ? "Formar Equipas Manualmente" : "Formar Equipas"}
          </h2>

          {teamMode === "RANDOM_TEAMS" && (
            <div className="flex items-center gap-2 mb-4">
              <Input
                label="Seed"
                value={randomSeed}
                onChange={(e) => setRandomSeed(e.target.value)}
                className="w-32"
              />
              <Button size="sm" variant="secondary" onClick={generateRandomTeamsLocal}>
                Regenerar
              </Button>
            </div>
          )}

          {teamMode === "MANUAL_TEAMS" && unassignedPlayers.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-2 rounded-lg mb-4">
              <strong>Jogadores por atribuir ({unassignedPlayers.length}):</strong>{" "}
              {unassignedPlayers.map((p) => p.nickname || p.fullName).join(", ")}
            </div>
          )}

          <div className="space-y-3">
            {teams.map((team, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-surface-alt rounded-lg border border-border">
                <input
                  value={team.name}
                  onChange={(e) => {
                    setTeams((prev) => {
                      const next = [...prev];
                      next[idx] = { ...next[idx], name: e.target.value };
                      return next;
                    });
                  }}
                  className="w-28 text-sm font-medium border-b border-transparent hover:border-border focus:border-primary focus:outline-none bg-transparent"
                />
                <div className="flex-1 flex gap-2">
                  <select
                    value={team.player1Id}
                    onChange={(e) => updateTeamPlayer(idx, "player1Id", e.target.value)}
                    className="flex-1 rounded border border-border bg-white px-2 py-1 text-sm focus:border-primary focus:outline-none"
                  >
                    {teamMode === "MANUAL_TEAMS" && !team.player1Id && (
                      <option value="">-- Selecionar --</option>
                    )}
                    {selectedPlayers.map((p) => (
                      <option key={p.id} value={p.id}>{p.nickname || p.fullName}</option>
                    ))}
                  </select>
                  <span className="text-text-muted text-sm self-center">&amp;</span>
                  <select
                    value={team.player2Id}
                    onChange={(e) => updateTeamPlayer(idx, "player2Id", e.target.value)}
                    className="flex-1 rounded border border-border bg-white px-2 py-1 text-sm focus:border-primary focus:outline-none"
                  >
                    {teamMode === "MANUAL_TEAMS" && !team.player2Id && (
                      <option value="">-- Selecionar --</option>
                    )}
                    {selectedPlayers.map((p) => (
                      <option key={p.id} value={p.id}>{p.nickname || p.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <Button variant="ghost" onClick={() => setStep(2)}>Anterior</Button>
            <Button onClick={() => {
              if (!validateStep3()) return;
              setError(null);
              setStep(4);
            }}>
              Seguinte
            </Button>
          </div>
        </Card>
      )}
      {/* Step 4: Review & Create */}
      {step === 4 && (
        <Card>
          <h2 className="text-lg font-semibold mb-4">
            Passo 4: {editMode ? "Confirmar Alterações" : "Confirmar e Criar"}
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-muted">Nome</span>
              <span className="font-medium">{name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-muted">Campos</span>
              <span className="font-medium">{courtsCount}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-muted">Formato</span>
              <span className="font-medium">{matchesPerPair === 1 ? "RR Simples" : "RR Duplo"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-muted">Sets por Jogo</span>
              <span className="font-medium">
                {numberOfSets === 1 ? "1 Set" : numberOfSets === 2 ? "2 Sets" : "Melhor de 3"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-muted">Modo</span>
              <span className="font-medium">{teamModeLabel(teamMode)}</span>
            </div>
            <div className="py-2">
              <span className="text-text-muted block mb-2">Equipas ({teams.length})</span>
              <div className="space-y-1">
                {teams.map((t, i) => (
                  <div key={i} className="text-sm pl-2">
                    <span className="font-medium">{t.name}:</span>{" "}
                    {getPlayerName(t.player1Id)} & {getPlayerName(t.player2Id)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button variant="ghost" onClick={() => setStep(3)}>Anterior</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading
                ? (editMode ? "A guardar..." : "A criar torneio...")
                : (editMode ? "Guardar e Regenerar Calendário" : "Criar Torneio e Gerar Calendário")}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
