import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserPlanLimits } from "@/lib/plan-guards";
import { PlansPanel } from "./plans-panel";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { plan, limits } = await getUserPlanLimits();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Planos & Subscrição</h1>
        <p className="text-sm text-text-muted mt-1">
          Gira o seu plano e aceda a mais funcionalidades.
        </p>
      </div>
      <PlansPanel currentPlan={plan} userEmail={session.user.email ?? ""} />
    </div>
  );
}
