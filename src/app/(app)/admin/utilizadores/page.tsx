export const dynamic = "force-dynamic";

import { getUsers, getUnlinkedPlayers } from "@/lib/actions";
import { UsersTable } from "./users-table";

export default async function AdminUsersPage() {
  const [users, unlinkedPlayers] = await Promise.all([
    getUsers(),
    getUnlinkedPlayers(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Gestão de Utilizadores</h1>
      <UsersTable users={users} unlinkedPlayers={unlinkedPlayers} />
    </div>
  );
}
