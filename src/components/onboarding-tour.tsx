"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

const STEPS = [
  {
    title: "Bem-vindo ao CopaPro!",
    description:
      "A plataforma completa para gerir ligas e torneios de padel. Vamos mostrar-te as funcionalidades principais.",
  },
  {
    title: "Dashboard",
    description:
      "Aqui ves o ranking, torneios em curso e ultimos resultados.",
  },
  {
    title: "Disponibilidade",
    description:
      "Marca os dias em que estas disponivel para jogar.",
  },
  {
    title: "Perfil",
    description:
      "Consulta as tuas estatisticas e evolucao Elo.",
  },
];

export function OnboardingTour() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem("copapro-onboarding-done");
    if (!done) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem("copapro-onboarding-done", "true");
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-xl shadow-2xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 text-text-muted hover:text-text transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step number */}
        <p className="text-xs text-text-muted mb-1">
          Passo {step + 1} de {STEPS.length}
        </p>

        {/* Title */}
        <h2 className="text-lg font-bold mb-2">{current.title}</h2>

        {/* Description */}
        <p className="text-sm text-text-muted mb-6">{current.description}</p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={dismiss}
            className="text-sm text-text-muted hover:text-text transition-colors"
          >
            Saltar
          </button>

          <button
            onClick={next}
            className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            {step < STEPS.length - 1 ? "Seguinte" : "Comecar"}
          </button>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? "bg-primary" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
