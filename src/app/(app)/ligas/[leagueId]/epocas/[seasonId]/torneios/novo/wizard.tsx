"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createTournament, generateSchedule, updateTournament } from "@/lib/actions";

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
      startDate?: string;
      courtsCount: number;
      matchesPerPair: number;
      numberOfSets: number;
      teamMode: string;
      teamSize: number;
      randomSeed?: string;
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

  // Total steps: 1v1 skips step 3
  const totalSteps = teamSize === 1 ? 3 : 4;
  const reviewStep = teamSize === 1 ? 3 : 4;

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

  const handleSubmit = async () => {
    // Only validate teams if there are any
    if (teams.length > 0) {
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
      const payload = {
        name,
        startDate: startDate || undefined,
        courtsCount,
        courtNames,
        matchesPerPair,
        numberOfSets,
        teamSize,
        teamMode: teamSize === 1 ? "FIXED_TEAMS" : teamMode,
        randomSeed: teamMode === "RANDOM_TEAMS" && teamSize === 2 ? randomSeed : undefined,
        teams,
        allPlayerIds: selectionOrder,
      };

      if (editMode) {
        await updateTournament({ tournamentId: editMode.tournamentId, ...payload });
        if (teams.length > 0) await generateSchedule(editMode.tournamentId);
        router.push(`/torneios/${editMode.tournamentId}`);
      } else {
        const tournament = await createTournament({ leagueId, seasonId, ...payload });
        if (teams.length > 0) await generateSchedule(tournament.id);
        router.push(`/torneios/${tournament.id}`);
      }
    } catch (e) {
      setError((e as Error).message);
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
    switch (mode) { case "RANDOM_TEAMS": return "Aleatórias"; case "MANUAL_TEAMS": return "Manuais"; default: return "Fixas"; }
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
    setError(null);
    if (teamSize === 1) { init1v1Teams(); setStep(reviewStep); }
    else { if (teamMode === "RANDOM_TEAMS") generateRandomTeamsLocal(); else if (teamMode === "MANUAL_TEAMS") initManualTeams(); else initFixedTeams(); setStep(3); }
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
            <Input label="Nome do Torneio" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Torneio Janeiro" required />

            <div>
              <label className="block text-sm font-medium text-text mb-1">Data do Torneio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">Modo de Jogo</label>
              <div className="flex gap-3">
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
              <label className="block text-sm font-medium text-text mb-1">Número de Campos</label>
              <select value={courtsCount} onChange={(e) => handleCourtsCountChange(parseInt(e.target.value))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>{n} {n === 1 ? "campo" : "campos"}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-text">Nomes dos Campos</label>
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
              <label className="block text-sm font-medium text-text mb-1">Formato</label>
              <div className="flex gap-3">
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
              <label className="block text-sm font-medium text-text mb-1">Sets por Jogo</label>
              <div className="flex gap-3">
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
                <label className="block text-sm font-medium text-text mb-1">Modo de Equipas</label>
                <div className="flex flex-wrap gap-3">
                  {(["FIXED_TEAMS", "RANDOM_TEAMS", "MANUAL_TEAMS"] as const).map((mode) => (
                    <label key={mode} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" checked={teamMode === mode} onChange={() => setTeamMode(mode)} className="text-primary focus:ring-primary" />
                      {mode === "FIXED_TEAMS" ? "Equipas Fixas" : mode === "RANDOM_TEAMS" ? "Equipas Aleatórias" : "Equipas Manuais"}
                    </label>
                  ))}
                </div>
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

      {/* Step 3: Teams (only for 2v2) */}
      {step === 3 && teamSize === 2 && (
        <Card>
          <h2 className="text-lg font-semibold mb-4">
            Passo 3: {teamMode === "RANDOM_TEAMS" ? "Equipas Aleatórias" : teamMode === "MANUAL_TEAMS" ? "Formar Equipas Manualmente" : "Formar Equipas"}
          </h2>

          {teamMode === "RANDOM_TEAMS" && (
            <div className="flex items-center gap-2 mb-4">
              <Input label="Seed" value={randomSeed} onChange={(e) => setRandomSeed(e.target.value)} className="w-32" />
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
            <div className="py-2">
              {teams.length > 0 ? (
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
            <Button variant="ghost" onClick={() => setStep(teams.length === 0 ? 2 : (teamSize === 1 ? 2 : 3))}>Anterior</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (editMode ? "A guardar..." : "A criar torneio...") : (editMode ? (teams.length > 0 ? "Guardar e Regenerar Calendário" : "Guardar Alterações") : (teams.length > 0 ? "Criar Torneio e Gerar Calendário" : "Criar Torneio"))}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
