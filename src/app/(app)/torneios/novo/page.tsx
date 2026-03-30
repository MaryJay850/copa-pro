export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TournamentWizard } from "@/app/(app)/ligas/[leagueId]/epocas/[seasonId]/torneios/novo/wizard";

export default async function NovoTorneioAvulsoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <TournamentWizard
      leagueId={null}
      seasonId={null}
      existingPlayers={[]}
    />
  );
}
