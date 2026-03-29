export const dynamic = "force-dynamic";

import { getAllClubs } from "@/lib/actions/club-actions";
import { AdminClubsContent } from "./admin-clubs-content";

export default async function AdminClubsPage() {
  const clubs = await getAllClubs();

  return <AdminClubsContent clubs={clubs} />;
}
