"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createEasyMix } from "@/lib/actions";
import { toast } from "sonner";

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
  const [players, setPlayers] = useState<string[]>([]);

  const inputClass = "w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors";

  const addPlayer = () => {
    const trimmed = playerInput.trim();
    if (trimmed && !players.includes(trimmed)) {
      setPlayers([...players, trimmed]);
      setPlayerInput("");
    }
  };

  const removePlayer = (name: string) => {
    setPlayers(players.filter((p) => p !== name));
  };

  const handleCreate = async () => {
    if (players.length < 4) {
      toast.error("Mínimo de 4 jogadores.");
      return;
    }
    setLoading(true);
    try {
      const result = await createEasyMix({
        name,
        playerNames: players,
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
              <p className="text-sm text-text-muted mt-0.5">Cria um torneio rápido e partilha com amigos</p>
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
              {["Configuração", "Jogadores"].map((label, i) => (
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
                    {i + 1 < step ? "✓" : i + 1}
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
              <p><span className="text-text font-semibold">Nome:</span> {name || "—"}</p>
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
                Configuração Rápida
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Nome do Torneio</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Ex: Padel Sábado" required />
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
                  <strong>Modo:</strong> Pares aleatórios a cada ronda (2v2). Equipas mudam em cada ronda para que todos joguem com todos.
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

              {/* Add player input */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={playerInput}
                  onChange={(e) => setPlayerInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPlayer(); } }}
                  className={inputClass}
                  placeholder="Nome do jogador..."
                />
                <Button onClick={addPlayer} disabled={!playerInput.trim()}>Adicionar</Button>
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
                        <span className="font-medium">{p}</span>
                      </div>
                      <button onClick={() => removePlayer(p)} className="text-red-400 hover:text-red-600 text-xs">
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {players.length > maxTitulars && (
                <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-4">
                  Tens {players.length} jogadores mas apenas {maxTitulars} podem jogar em simultâneo ({courtsCount} campos x 4). Os restantes serão suplentes que rodam.
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
