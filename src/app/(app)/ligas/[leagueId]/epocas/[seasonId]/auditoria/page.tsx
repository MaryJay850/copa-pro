export const dynamic = "force-dynamic";

import { isAdmin } from "@/lib/auth-guards";
import { getSeasonAuditData } from "@/lib/actions/audit-ranking-actions";
import { notFound } from "next/navigation";
import { AuditContent } from "./audit-content";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ leagueId: string; seasonId: string }>;
}) {
  const { leagueId, seasonId } = await params;

  const adminUser = await isAdmin();
  if (!adminUser) notFound();

  const auditData = await getSeasonAuditData(seasonId);

  return <AuditContent data={auditData} leagueId={leagueId} />;
}
