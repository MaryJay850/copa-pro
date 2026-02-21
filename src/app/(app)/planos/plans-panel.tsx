"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  createCheckoutSession,
  createBillingPortalSession,
  cancelSubscription,
  reactivateSubscription,
  type SubscriptionInfo,
} from "@/lib/stripe-actions";
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

const planOrder: Plan[] = ["FREE", "PRO", "CLUB"];

export function PlansPanel({
  currentPlan,
  subscriptionInfo,
  userEmail,
  showSuccess,
  showCancelled,
}: {
  currentPlan: Plan;
  subscriptionInfo: SubscriptionInfo;
  userEmail: string;
  showSuccess?: boolean;
  showCancelled?: boolean;
}) {
  const [interval, setInterval] = useState<"month" | "year">(
    subscriptionInfo.interval ?? "month"
  );
  const [isPending, startTransition] = useTransition();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const router = useRouter();

  // Show success/cancel toast from Stripe redirect
  useEffect(() => {
    if (showSuccess) {
      toast.success("Subscrição ativada com sucesso! 🎉");
      router.replace("/planos");
    }
    if (showCancelled) {
      toast.info("Checkout cancelado.");
      router.replace("/planos");
    }
  }, [showSuccess, showCancelled, router]);

  const currentIndex = planOrder.indexOf(currentPlan);
  const subInterval = subscriptionInfo.interval;
  const hasActiveSub = subscriptionInfo.hasActiveSubscription;
  const isCancelPending = hasActiveSub && subscriptionInfo.cancelAtPeriodEnd;

  const redirectTo = (url: string) => {
    if (typeof window !== "undefined") {
      window.location.href = url;
    }
  };

  const handleUpgrade = (plan: "PRO" | "CLUB", selectedInterval: "month" | "year") => {
    startTransition(async () => {
      try {
        const url = await createCheckoutSession(plan, selectedInterval);
        redirectTo(url);
      } catch (err) {
        toast.error(sanitizeError(err, "Erro ao processar o upgrade. Tente novamente."));
      }
    });
  };

  const handleManageBilling = () => {
    startTransition(async () => {
      try {
        const url = await createBillingPortalSession();
        redirectTo(url);
      } catch (err) {
        toast.error(sanitizeError(err, "Erro ao aceder ao portal de pagamento."));
      }
    });
  };

  const handleCancelSubscription = () => {
    startTransition(async () => {
      try {
        const { endsAt } = await cancelSubscription();
        const endDate = new Date(endsAt).toLocaleDateString("pt-PT", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        toast.success(`Subscrição cancelada. Manterá acesso ao plano até ${endDate}.`);
        setShowCancelConfirm(false);
        router.refresh();
      } catch (err) {
        toast.error(sanitizeError(err, "Erro ao cancelar subscrição."));
      }
    });
  };

  const handleReactivate = () => {
    startTransition(async () => {
      try {
        await reactivateSubscription();
        toast.success("Subscrição reativada com sucesso!");
        router.refresh();
      } catch (err) {
        toast.error(sanitizeError(err, "Erro ao reativar subscrição."));
      }
    });
  };

  /**
   * Determines what button to show for each plan card.
   *
   * Rules:
   * - FREE user → can subscribe to any paid plan (any interval)
   * - Paid user, same plan + same interval → "Plano Atual" (disabled)
   * - Paid user, same plan + monthly → yearly shows "Mudar para Anual"
   * - Paid user, same plan + yearly → monthly is managed via billing portal
   * - Paid user, higher plan → "Upgrade para X"
   * - Paid user, lower paid plan → "Gerir Subscrição" (billing portal)
   * - Paid user, FREE card → "Cancelar Subscrição"
   */
  function getButtonConfig(planId: Plan, displayInterval: "month" | "year") {
    const planIndex = planOrder.indexOf(planId);

    // FREE card
    if (planId === "FREE") {
      if (currentPlan === "FREE") {
        return { label: "Plano Atual", disabled: true, variant: "secondary" as const, action: () => {} };
      }
      // Already scheduled to cancel → show that
      if (isCancelPending) {
        return {
          label: `Free a partir de ${formatDate(subscriptionInfo.currentPeriodEnd) ?? "..."}`,
          disabled: true,
          variant: "secondary" as const,
          action: () => {},
        };
      }
      // Has paid plan → show cancel
      return {
        label: "Cancelar Subscrição",
        disabled: false,
        variant: "destructive" as const,
        action: () => setShowCancelConfirm(true),
      };
    }

    // Paid plan card — user is FREE
    if (currentPlan === "FREE") {
      return {
        label: `Subscrever ${PLANS.find(p => p.id === planId)?.name}`,
        disabled: false,
        variant: "default" as const,
        action: () => handleUpgrade(planId as "PRO" | "CLUB", displayInterval),
      };
    }

    // User has an active paid plan
    if (planId === currentPlan) {
      // Same plan
      if (subInterval === displayInterval) {
        // Exact same plan + interval
        return { label: "Plano Atual", disabled: true, variant: "secondary" as const, action: () => {} };
      }
      // Same plan, different interval
      if (displayInterval === "year" && subInterval === "month") {
        return {
          label: "Mudar para Anual (poupe 33%)",
          disabled: false,
          variant: "default" as const,
          action: () => handleUpgrade(planId as "PRO" | "CLUB", "year"),
        };
      }
      if (displayInterval === "month" && subInterval === "year") {
        // Anual → Mensal = downgrade de billing cycle
        return {
          label: "Gerir Subscrição",
          disabled: false,
          variant: "secondary" as const,
          action: handleManageBilling,
        };
      }
    }

    // Different plan — upgrade
    if (planIndex > currentIndex) {
      return {
        label: `Upgrade para ${PLANS.find(p => p.id === planId)?.name}`,
        disabled: false,
        variant: "default" as const,
        action: () => handleUpgrade(planId as "PRO" | "CLUB", displayInterval),
      };
    }

    // Downgrade to lower paid plan → manage via billing portal
    return {
      label: "Gerir Subscrição",
      disabled: false,
      variant: "secondary" as const,
      action: handleManageBilling,
    };
  }

  // Format date for display
  const formatDate = (isoDate: string | null) => {
    if (!isoDate) return null;
    return new Date(isoDate).toLocaleDateString("pt-PT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Current subscription info */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-muted">Plano atual:</span>
            <Badge variant="success" className="text-sm">
              {PLANS.find((p) => p.id === currentPlan)?.name ?? currentPlan}
              {hasActiveSub && subInterval && (
                <span className="ml-1 opacity-75">
                  ({subInterval === "year" ? "Anual" : "Mensal"})
                </span>
              )}
            </Badge>
            {isCancelPending && (
              <Badge variant="warning" className="text-xs">
                Cancela em {formatDate(subscriptionInfo.currentPeriodEnd)}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isCancelPending && (
              <Button variant="default" size="sm" onClick={handleReactivate} disabled={isPending}>
                Reativar Subscrição
              </Button>
            )}
            {hasActiveSub && (
              <Button variant="secondary" size="sm" onClick={handleManageBilling} disabled={isPending}>
                Gerir Subscrição
              </Button>
            )}
          </div>
        </div>
        {hasActiveSub && subscriptionInfo.currentPeriodEnd && !isCancelPending && (
          <p className="text-xs text-text-muted">
            Próxima renovação: {formatDate(subscriptionInfo.currentPeriodEnd)}
          </p>
        )}
        {isCancelPending && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            A subscrição foi cancelada mas mantém acesso ao plano {PLANS.find((p) => p.id === currentPlan)?.name} até {formatDate(subscriptionInfo.currentPeriodEnd)}.
            Após essa data, será automaticamente alterado para o plano Free.
          </p>
        )}
      </Card>

      {/* Cancel confirmation */}
      {showCancelConfirm && (
        <Card className="p-4 border-amber-300 bg-amber-50 dark:bg-amber-950/20 space-y-3">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Tem a certeza que deseja cancelar a subscrição?
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400/80">
            Manterá o acesso ao plano {PLANS.find((p) => p.id === currentPlan)?.name} até ao
            fim do período de faturação atual
            {subscriptionInfo.currentPeriodEnd && (
              <> ({formatDate(subscriptionInfo.currentPeriodEnd)})</>
            )}.
            Após essa data, o plano será automaticamente alterado para Free.
          </p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancelSubscription}
              disabled={isPending}
            >
              {isPending ? "A cancelar..." : "Sim, Cancelar no Fim do Período"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCancelConfirm(false)}
              disabled={isPending}
            >
              Não, manter plano
            </Button>
          </div>
        </Card>
      )}

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
          const isCurrentExact =
            plan.id === currentPlan &&
            (plan.id === "FREE" || subInterval === interval);
          const btnConfig = getButtonConfig(plan.id, interval);

          return (
            <Card
              key={plan.id}
              className={`p-6 flex flex-col ${
                plan.popular ? "ring-2 ring-primary shadow-lg" : ""
              } ${isCurrentExact ? "bg-primary/5" : ""}`}
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
                    <span
                      className={
                        i === 0 && plan.id !== "FREE" ? "font-semibold text-primary" : ""
                      }
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                variant={btnConfig.variant}
                onClick={btnConfig.action}
                disabled={btnConfig.disabled || isPending}
                className="w-full"
              >
                {isPending && !btnConfig.disabled ? "A processar..." : btnConfig.label}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
