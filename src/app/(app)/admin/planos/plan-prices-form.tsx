"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  upsertPlanPrice,
  togglePlanPriceActive,
  type PlanPriceRow,
} from "@/lib/actions/plan-price-actions";
import { sanitizeError } from "@/lib/error-utils";

const PLAN_LABELS: Record<string, string> = {
  PRO: "Pro",
  CLUB: "Club",
};

const INTERVAL_LABELS: Record<string, string> = {
  month: "Mensal",
  year: "Anual",
};

type PriceFormState = {
  amount: string;
  stripePriceId: string;
};

// All possible plan+interval combinations
const PLAN_SLOTS: Array<{ plan: "PRO" | "CLUB"; interval: "month" | "year" }> = [
  { plan: "PRO", interval: "month" },
  { plan: "PRO", interval: "year" },
  { plan: "CLUB", interval: "month" },
  { plan: "CLUB", interval: "year" },
];

export function PlanPricesForm({ prices }: { prices: PlanPriceRow[] }) {
  const router = useRouter();

  // Build initial form state from existing prices
  const buildInitialState = () => {
    const state: Record<string, PriceFormState> = {};
    for (const slot of PLAN_SLOTS) {
      const key = `${slot.plan}_${slot.interval}`;
      const existing = prices.find(
        (p) => p.plan === slot.plan && p.interval === slot.interval
      );
      state[key] = {
        amount: existing ? String(existing.amount) : "",
        stripePriceId: existing?.stripePriceId ?? "",
      };
    }
    return state;
  };

  const [formState, setFormState] = useState(buildInitialState);
  const [saving, setSaving] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const getExisting = (plan: string, interval: string) =>
    prices.find((p) => p.plan === plan && p.interval === interval);

  const handleSave = async (plan: "PRO" | "CLUB", interval: "month" | "year") => {
    const key = `${plan}_${interval}`;
    const state = formState[key];
    setSaving(key);
    try {
      const amount = parseFloat(state.amount.replace(",", "."));
      if (isNaN(amount) || amount < 0) {
        toast.error("Valor do preço inválido.");
        return;
      }
      await upsertPlanPrice({
        plan,
        interval,
        amount,
        stripePriceId: state.stripePriceId.trim(),
      });
      toast.success(`Preço ${PLAN_LABELS[plan]} ${INTERVAL_LABELS[interval]} guardado!`);
      router.refresh();
    } catch (err) {
      toast.error(sanitizeError(err, "Erro ao guardar preço."));
    } finally {
      setSaving(null);
    }
  };

  const handleToggle = async (plan: "PRO" | "CLUB", interval: "month" | "year", active: boolean) => {
    const key = `${plan}_${interval}`;
    setToggling(key);
    try {
      await togglePlanPriceActive(plan, interval, active);
      toast.success(`Preço ${active ? "ativado" : "desativado"}.`);
      router.refresh();
    } catch (err) {
      toast.error(sanitizeError(err, "Erro ao alterar estado."));
    } finally {
      setToggling(null);
    }
  };

  const updateField = (key: string, field: keyof PriceFormState, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  // Group by plan
  const grouped: Record<string, typeof PLAN_SLOTS> = {
    PRO: PLAN_SLOTS.filter((s) => s.plan === "PRO"),
    CLUB: PLAN_SLOTS.filter((s) => s.plan === "CLUB"),
  };

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Como funciona:</strong> Configure o valor de cada plano, a recorrência (mensal/anual) e o respetivo ID do Stripe Price.
          O ID do Stripe Price pode ser encontrado no{" "}
          <span className="font-medium">Stripe Dashboard → Products → Prices</span>.
          O formato é <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded text-xs">price_XXXXXXX</code>.
        </p>
      </Card>

      {/* Plan FREE info */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="font-semibold text-text-primary">Plano Free</h3>
            <p className="text-sm text-text-muted">0€ — Sem subscrição Stripe necessária.</p>
          </div>
          <Badge variant="success" className="ml-auto">Sempre ativo</Badge>
        </div>
      </Card>

      {/* Plan cards */}
      {Object.entries(grouped).map(([planKey, slots]) => (
        <Card key={planKey}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CardTitle>{PLAN_LABELS[planKey]}</CardTitle>
            </div>
          </CardHeader>

          <div className="space-y-4">
            {slots.map((slot) => {
              const key = `${slot.plan}_${slot.interval}`;
              const existing = getExisting(slot.plan, slot.interval);
              const state = formState[key];
              const isActive = existing?.active ?? false;
              const hasChanges =
                state.amount !== String(existing?.amount ?? "") ||
                state.stripePriceId !== (existing?.stripePriceId ?? "");

              return (
                <div
                  key={key}
                  className={`rounded-lg border p-4 space-y-3 ${
                    isActive
                      ? "border-border bg-surface-alt"
                      : "border-border/50 bg-gray-50 dark:bg-gray-900/50 opacity-60"
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {INTERVAL_LABELS[slot.interval]}
                      </span>
                      {existing && (
                        <Badge variant={isActive ? "success" : "default"}>
                          {isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      )}
                    </div>
                    {existing && (
                      <button
                        type="button"
                        onClick={() => handleToggle(slot.plan, slot.interval, !isActive)}
                        disabled={toggling === key}
                        className="text-xs text-text-muted hover:text-text underline transition-colors"
                      >
                        {toggling === key
                          ? "..."
                          : isActive
                          ? "Desativar"
                          : "Ativar"}
                      </button>
                    )}
                  </div>

                  {/* Form fields */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1">
                        Valor (€)
                      </label>
                      <input
                        type="text"
                        value={state.amount}
                        onChange={(e) => updateField(key, "amount", e.target.value)}
                        placeholder="Ex: 4.99"
                        className="w-full rounded border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1">
                        Stripe Price ID
                      </label>
                      <input
                        type="text"
                        value={state.stripePriceId}
                        onChange={(e) => updateField(key, "stripePriceId", e.target.value)}
                        placeholder="price_..."
                        className="w-full rounded border border-border bg-surface px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Save button */}
                  {hasChanges && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => handleSave(slot.plan, slot.interval)}
                        disabled={saving === key}
                      >
                        {saving === key ? "A guardar..." : "Guardar"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
