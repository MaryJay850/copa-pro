"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createCheckoutSession, createBillingPortalSession } from "@/lib/stripe-actions";
import { sanitizeError } from "@/lib/error-utils";

type Plan = "FREE" | "PRO" | "CLUB";

const PLANS = [
  {
    id: "FREE" as Plan,
    name: "Free",
    description: "Para experimentar e ligas pequenas",
    priceMonthly: "0€",
    priceYearly: null,
    features: [
      "1 liga",
      "1 época ativa",
      "2 torneios por época",
      "Até 8 equipas por torneio",
      "Até 2 campos",
      "Ranking individual completo",
      "Registo de resultados",
      "Perfil de jogador",
      "Dashboard com filtros",
      "Dark mode",
    ],
  },
  {
    id: "PRO" as Plan,
    name: "Pro",
    description: "Para gestores de liga sérios",
    priceMonthly: "4,99€",
    priceYearly: "39,99€",
    popular: true,
    features: [
      "Tudo do Free, mais:",
      "Torneios e épocas ilimitadas",
      "Equipas e campos ilimitados",
      "Equipas aleatórias com seed",
      "Double Round Robin",
      "Sistema Elo completo + gráfico",
      "Head-to-Head entre jogadores",
      "Submissão de resultados por jogadores",
      "Calendário de disponibilidade",
      "Substituição automática de jogadores",
      "Export PDF e iCalendar",
      "Notificações em tempo real",
      "Clonagem de torneios e épocas",
    ],
  },
  {
    id: "CLUB" as Plan,
    name: "Club",
    description: "Para clubes e organizações",
    priceMonthly: "14,99€",
    priceYearly: "119,99€",
    features: [
      "Tudo do Pro, mais:",
      "Ligas ilimitadas",
      "Integração WhatsApp automática",
      "Grupo WhatsApp com sync bidirecional",
      "Mensagens automáticas (resultados, rankings)",
      "Import CSV de jogadores",
      "Painel de administração completo",
      "Analytics avançados com gráficos",
      "Registo de auditoria",
      "Configurações do sistema",
      "Gestão de múltiplos gestores",
      "Horários de campos personalizados",
      "Suporte prioritário",
    ],
  },
];

export function PlansPanel({
  currentPlan,
  userEmail,
}: {
  currentPlan: Plan;
  userEmail: string;
}) {
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Show success/cancel toast from Stripe redirect
  const success = searchParams.get("success");
  const cancelled = searchParams.get("cancelled");

  if (success === "true") {
    toast.success("Subscrição ativada com sucesso! 🎉");
    // Clean URL
    router.replace("/planos");
  }
  if (cancelled === "true") {
    toast.info("Checkout cancelado.");
    router.replace("/planos");
  }

  const handleUpgrade = (plan: "PRO" | "CLUB") => {
    startTransition(async () => {
      try {
        const url = await createCheckoutSession(plan, interval);
        window.location.href = url;
      } catch (err) {
        toast.error(sanitizeError(err, "Erro ao processar o upgrade. Tente novamente."));
      }
    });
  };

  const handleManageBilling = () => {
    startTransition(async () => {
      try {
        const url = await createBillingPortalSession();
        window.location.href = url;
      } catch (err) {
        toast.error(sanitizeError(err, "Erro ao aceder ao portal de pagamento."));
      }
    });
  };

  const planOrder: Plan[] = ["FREE", "PRO", "CLUB"];
  const currentIndex = planOrder.indexOf(currentPlan);

  return (
    <div className="space-y-6">
      {/* Current plan badge */}
      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-muted">Plano atual:</span>
          <Badge variant="success" className="text-sm">
            {PLANS.find((p) => p.id === currentPlan)?.name ?? currentPlan}
          </Badge>
        </div>
        {currentPlan !== "FREE" && (
          <Button variant="secondary" size="sm" onClick={handleManageBilling} disabled={isPending}>
            Gerir Subscrição
          </Button>
        )}
      </Card>

      {/* Interval toggle */}
      <div className="flex items-center justify-center gap-2">
        <button
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            interval === "month"
              ? "bg-primary text-white"
              : "bg-surface-secondary text-text-muted hover:text-text-primary"
          }`}
          onClick={() => setInterval("month")}
        >
          Mensal
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            interval === "year"
              ? "bg-primary text-white"
              : "bg-surface-secondary text-text-muted hover:text-text-primary"
          }`}
          onClick={() => setInterval("year")}
        >
          Anual <span className="text-xs opacity-75">(poupe 33%)</span>
        </button>
      </div>

      {/* Plan cards */}
      <div className="grid lg:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrentPlan = plan.id === currentPlan;
          const planIndex = planOrder.indexOf(plan.id);
          const isDowngrade = planIndex < currentIndex;
          const isUpgrade = planIndex > currentIndex;

          return (
            <Card
              key={plan.id}
              className={`p-6 flex flex-col ${
                plan.popular ? "ring-2 ring-primary shadow-lg" : ""
              } ${isCurrentPlan ? "bg-primary/5" : ""}`}
            >
              {plan.popular && (
                <div className="flex justify-center -mt-9 mb-3">
                  <Badge variant="success" className="text-xs font-bold px-3 py-1">
                    Popular
                  </Badge>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-bold text-text-primary">{plan.name}</h3>
                <p className="text-sm text-text-muted mt-1">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-extrabold text-text-primary">
                  {interval === "year" && plan.priceYearly
                    ? plan.priceYearly
                    : plan.priceMonthly}
                </span>
                {plan.id !== "FREE" && (
                  <span className="text-sm text-text-muted">
                    /{interval === "year" ? "ano" : "mês"}
                  </span>
                )}
              </div>

              <ul className="space-y-2 text-sm text-text-secondary mb-6 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    {i === 0 && plan.id !== "FREE" ? (
                      <span className="text-primary font-bold text-xs mt-0.5">★</span>
                    ) : (
                      <svg
                        className="w-4 h-4 mt-0.5 text-primary shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    )}
                    <span className={i === 0 && plan.id !== "FREE" ? "font-semibold text-primary" : ""}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {isCurrentPlan ? (
                <Button variant="secondary" disabled className="w-full">
                  Plano Atual
                </Button>
              ) : isUpgrade ? (
                <Button
                  onClick={() => handleUpgrade(plan.id as "PRO" | "CLUB")}
                  disabled={isPending}
                  className="w-full"
                >
                  {isPending ? "A processar..." : `Upgrade para ${plan.name}`}
                </Button>
              ) : isDowngrade ? (
                <Button variant="secondary" onClick={handleManageBilling} disabled={isPending} className="w-full">
                  Gerir Subscrição
                </Button>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
