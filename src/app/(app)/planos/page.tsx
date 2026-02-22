import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserPlanLimits } from "@/lib/plan-guards";
import { getSubscriptionInfo, syncPlanFromStripe } from "@/lib/stripe-actions";
import { getActivePlanPrices, seedDefaultPlanPrices } from "@/lib/actions/plan-price-actions";
import { PlansPanel } from "./plans-panel";

export const dynamic = "force-dynamic";

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; cancelled?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;

  // If returning from successful checkout, sync plan from Stripe as fallback
  if (params.success === "true") {
    await syncPlanFromStripe();
  }

  // Seed default prices if table is empty
  await seedDefaultPlanPrices();

  const [{ plan }, subInfo, planPrices] = await Promise.all([
    getUserPlanLimits(),
    getSubscriptionInfo(),
    getActivePlanPrices(),
  ]);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Planos & Subscrição</h1>
        <p className="text-sm text-text-muted mt-1">
          Gira o seu plano e aceda a mais funcionalidades.
        </p>
      </div>
      <PlansPanel
        currentPlan={plan}
        subscriptionInfo={subInfo}
        userEmail={session.user.email ?? ""}
        showSuccess={params.success === "true"}
        showCancelled={params.cancelled === "true"}
        planPrices={planPrices}
      />
    </div>
  );
}
