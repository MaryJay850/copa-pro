export const dynamic = "force-dynamic";

import { getScoreboardData } from "@/lib/actions";
import { notFound } from "next/navigation";
import { ScoreboardClient } from "./scoreboard-client";

export default async function ScoreboardPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;

  let tournament;
  try {
    tournament = await getScoreboardData(tournamentId);
  } catch {
    notFound();
  }

  if (!tournament) notFound();

  return <ScoreboardClient tournament={tournament} />;
}
