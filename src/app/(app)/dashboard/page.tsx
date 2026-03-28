export const dynamic = "force-dynamic";

import { getMyDashboardData } from "@/lib/actions/dashboard-actions";
import { DashboardContent } from "./dashboard-content";

export default async function DashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await getMyDashboardData() as any;

  return <DashboardContent data={data} />;
}
