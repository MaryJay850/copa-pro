export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/auth-guards";
import { getAllPlanPrices, seedDefaultPlanPrices } from "@/lib/actions/plan-price-actions";
import { PlanPricesForm } from "./plan-prices-form";
import Link from "next/link";

export default async function AdminPlanosPage() {
  await requireAdmin();

  // Seed defaults if table is empty (first visit)
  await seedDefaultPlanPrices();

  const prices = await getAllPlanPrices();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-text-muted mb-1">
          <Link href="/admin" className="hover:text-text">Admin</Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-bold">Preços dos Planos</h1>
        <p className="text-sm text-text-muted mt-1">
          Configure os valores, recorrência e IDs Stripe de cada plano.
        </p>
      </div>
      <PlanPricesForm prices={prices} />
    </div>
  );
}
