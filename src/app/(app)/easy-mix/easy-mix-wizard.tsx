"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createEasyMix, searchPlayers } from "@/lib/actions";
import { toast } from "sonner";

type PlayerEntry = {
  name: string;
  playerId?: string;
  userId?: string;
  nickname?: string | null;
};

export function EasyMixWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Config
  const [name, setName] = useState("");
  const [courtsCount, setCourtsCount] = useState(2);
  const [numberOfSets, setNumberOfSets] = useState(1);
  const [numberOfRounds, setNumberOfRounds] = useState(5);

  // Players
  const [playerInput, setPlayerInput] = useState("");
  const [players, setPlayers] = useState<PlayerEntry[]>([]);

  // Search
  const [suggestions, setSuggestions] = useState<{ id: string; fullName: string; nickname: string | null; userId: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const inputClass = "w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors";

  const allRegistered = players.length > 0 && players.every((p) => !!p.playerId);
  const hasAdHoc = players.some((p) => !p.playerId);

  // Debounced search
  const handleInputChange = useCallback((value: string) => {
    setPlayerInput(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await searchPlayers(value.trim());
        // Filter out players already added
        const existingIds = new Set(players.filter((p) => p.playerId).map((p) => p.playerId));
        setSuggestions(results.filter((r) => !existingIds.has(r.id)));
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
      setSearching(false);
    }, 300);
  }, [players]);

  // Close suggestions on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addRegisteredPlayer = (player: { id: string; fullName: string; nickname: string | null; userId: string }) => {
    if (players.some((p) => p.playerId === player.id)) return;
    setPlayers([...players, { name: player.fullName, playerId: player.id, userId: player.userId, nickname: player.nickname }]);
    setPlayerInput("");
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const addAdHocPlayer = () => {
    const trimmed = playerInput.trim();
    if (!trimmed) return;
    if (players.some((p) => p.name === trimmed && !p.playerId)) {
      toast.error("Jogador com este nome ja existe.");
      return;
    }
    setPlayers([...players, { name: trimmed }]);
    setPlayerInput("");
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removePlayer = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (players.length < 4) {
      toast.error("Minimo de 4 jogadores.");
      return;
    }
    setLoading(true);
    try {
      const result = await createEasyMix({
        name,
        players: players.map((p) => ({ name: p.name, playerId: p.playerId })),
        courtsCount,
        numberOfSets,
        numberOfRounds,
      });
      toast.success("Torneio criado! A redirecionar...");
      router.push(`/mix/${result.slug}`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar torneio.");
    }
    setLoading(false);
  };

  const maxTitulars = courtsCount * 4;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="rounded-lg shadow-card bg-surface border border-border overflow-hidden">
        <div className="h-28" style={{ background: "linear-gradient(to right, #10b981, #06b6d4, #6366f1)" }} />
        <div className="px-6 pb-6 relative">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border-4 border-surface absolute -top-10 left-6" style={{ background: "linear-gradient(to bottom right, #10b981, #06b6d4)" }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="pt-14 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-xl font-extrabold tracking-tight">Easy Mix</h1>
              <p className="text-sm text-text-muted mt-0.5">Cria um torneio rapido e partilha com amigos</p>
            </div>
            <Badge variant="info">Passo {step} de 2</Badge>
          </div>
          {/* Progress bar */}
          <div className="mt-4 h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(step / 2) * 100}%`,
                background: "linear-gradient(to right, #10b981, #06b6d4)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <div className="space-y-5">
          <Card className="py-5 px-5">
            <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-4">Passos</h3>
            <div className="space-y-1.5">
              {["Configuracao", "Jogadores"].map((label, i) => (
                <button
                  key={i}
                  onClick={() => (i + 1 < step ? setStep(i + 1) : undefined)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    step === i + 1
                      ? "bg-emerald-50 text-emerald-700"
                      : i + 1 < step
                      ? "text-text hover:bg-surface-hover"
                      : "text-text-muted"
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step === i + 1 ? "bg-emerald-500 text-white" : i + 1 < step ? "bg-emerald-100 text-emerald-600" : "bg-border text-text-muted"
                  }`}>
                    {i + 1 < step ? "\u2713" : i + 1}
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </Card>

          {/* Summary */}
          <Card className="py-5 px-5">
            <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-4">Resumo</h3>
            <div className="text-xs space-y-2 text-text-muted font-medium">
              <p><span className="text-text font-semibold">Nome:</span> {name || "\u2014"}</p>
              <p><span className="text-text font-semibold">Campos:</span> {courtsCount}</p>
              <p><span className="text-text font-semibold">Sets:</span> {numberOfSets}</p>
              <p><span className="text-text font-semibold">Rondas:</span> {numberOfRounds}</p>
              <p><span className="text-text font-semibold">Jogadores:</span> {players.length}</p>
              <p><span className="text-text font-semibold">Capacidade:</span> {maxTitulars} titulares</p>
            </div>
          </Card>
        </div>

        {/* Content */}
        <div>
          {step === 1 && (
            <Card className="py-5 px-6">
              <h2 className="text-base font-bold mb-5 flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Configuracao Rapida
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Nome do Torneio</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Ex: Padel Sabado" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Campos</label>
                    <input type="number" min={1} max={20} value={courtsCount} onChange={(e) => setCourtsCount(Math.max(1, Number(e.target.value)))} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Sets por Jogo</label>
                    <select value={numberOfSets} onChange={(e) => setNumberOfSets(Number(e.target.value))} className={inputClass}>
                      <option value={1}>1 Set</option>
                      <option value={2}>2 Sets</option>
                      <option value={3}>Best of 3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Rondas</label>
                    <input type="number" min={1} max={20} value={numberOfRounds} onChange={(e) => setNumberOfRounds(Math.max(1, Number(e.target.value)))} className={inputClass} />
                  </div>
                </div>
                <div className="bg-emerald-50 rounded-lg px-4 py-3 text-xs text-emerald-700">
                  <strong>Modo:</strong> Pares aleatorios a cada ronda (2v2). Equipas mudam em cada ronda para que todos joguem com todos.
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={() => { if (name.trim()) setStep(2); else toast.error("Insere um nome."); }}>
                  Seguinte
                </Button>
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card className="py-5 px-6">
              <h2 className="text-base font-bold mb-5 flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Jogadores ({players.length})
              </h2>

              {/* ELO info banner */}
              {players.length > 0 && (
                <div className={`rounded-lg px-4 py-3 text-xs mb-4 ${
                  allRegistered
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}>
                  {allRegistered
                    ? "\u2713 Todos os jogadores registados \u2014 ELO sera atualizado"
                    : "\u26A0 Existem jogadores sem conta \u2014 ELO nao sera atualizado"}
                </div>
              )}

              {/* Info text */}
              <div className="bg-blue-50 rounded-lg px-4 py-3 text-xs text-blue-700 mb-4 border border-blue-200">
                Se todos os jogadores forem registados, o ELO sera atualizado. Jogadores sem conta nao afetam o ELO.
              </div>

              {/* Add player input with autocomplete */}
              <div className="relative mb-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={playerInput}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (suggestions.length > 0) {
                            addRegisteredPlayer(suggestions[0]);
                          } else if (playerInput.trim()) {
                            addAdHocPlayer();
                          }
                        }
                      }}
                      onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                      className={inputClass}
                      placeholder="Pesquisar jogador registado ou escrever nome..."
                    />
                    {searching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => {
                      if (suggestions.length > 0) {
                        addRegisteredPlayer(suggestions[0]);
                      } else {
                        addAdHocPlayer();
                      }
                    }}
                    disabled={!playerInput.trim()}
                  >
                    Adicionar
                  </Button>
                </div>

                {/* Autocomplete suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-50 left-0 right-16 mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto"
                  >
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => addRegisteredPlayer(s)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-hover text-sm text-left transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{s.fullName}</span>
                          {s.nickname && <span className="text-text-muted text-xs">({s.nickname})</span>}
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          Registado
                        </span>
                      </button>
                    ))}
                    {playerInput.trim() && (
                      <button
                        onClick={addAdHocPlayer}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-hover text-sm text-left transition-colors border-t border-border"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">&quot;{playerInput.trim()}&quot;</span>
                          <span className="text-text-muted text-xs">(sem conta)</span>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          Sem conta
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {/* Show ad-hoc option when no suggestions and input has text */}
                {showSuggestions === false && !searching && playerInput.trim().length >= 2 && suggestions.length === 0 && (
                  <div className="text-xs text-text-muted mt-1">
                    Nenhum jogador registado encontrado. Pressiona Enter ou &quot;Adicionar&quot; para adicionar como jogador sem conta.
                  </div>
                )}
              </div>

              {/* Player list */}
              {players.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-sm">
                  Adiciona pelo menos 4 jogadores para criar o torneio.
                </div>
              ) : (
                <div className="grid gap-1.5 mb-4">
                  {players.map((p, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-surface-alt rounded-lg text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                        <span className="font-medium">{p.name}</span>
                        {p.nickname && <span className="text-text-muted text-xs">({p.nickname})</span>}
                        {p.playerId ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                            Registado
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            Sem conta
                          </span>
                        )}
                      </div>
                      <button onClick={() => removePlayer(i)} className="text-red-400 hover:text-red-600 text-xs">
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {players.length > maxTitulars && (
                <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-4">
                  Tens {players.length} jogadores mas apenas {maxTitulars} podem jogar em simultaneo ({courtsCount} campos x 4). Os restantes serao suplentes que rodam.
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="ghost" onClick={() => setStep(1)}>Anterior</Button>
                <Button onClick={handleCreate} disabled={loading || players.length < 4}>
                  {loading ? "A criar torneio..." : `Criar Torneio (${players.length} jogadores)`}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
