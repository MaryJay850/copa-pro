export const dynamic = "force-dynamic";

import { getSeasonAuditData } from "@/lib/actions/audit-ranking-actions";
import { AuditContent } from "./audit-content";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ leagueId: string; seasonId: string }>;
}) {
  const { leagueId, seasonId } = await params;

  const auditData = await getSeasonAuditData(seasonId);

  return <AuditContent data={auditData} leagueId={leagueId} />;
}
