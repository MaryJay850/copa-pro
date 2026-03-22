export const dynamic = "force-dynamic";

import { getDashboardData } from "@/lib/actions";
import { DashboardContent } from "./dashboard-content";

export default async function DashboardPage() {
  const data = await getDashboardData({});

  return <DashboardContent data={data} />;
}
