export const dynamic = "force-dynamic";

import { getLeagueMembers, getLeague } from "@/lib/actions";
import { requireLeagueManager } from "@/lib/auth-guards";
import { notFound } from "next/navigation";
import { MembersPanel } from "./members-panel";
import { CsvImport } from "@/components/csv-import";

export default async function LeagueMembersPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;

  await requireLeagueManager(leagueId);

  const league = await getLeague(leagueId);
  if (!league) notFound();

  const members = await getLeagueMembers(leagueId);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold">Membros da Liga</h1>
        <p className="text-sm text-text-muted mt-1">
          Adicione utilizadores registados na plataforma. Ficam automaticamente
          no ranking da época ativa com valores a 0.
        </p>
      </div>

      <CsvImport leagueId={leagueId} />
      <MembersPanel leagueId={leagueId} initialMembers={members} />
    </div>
  );
}
