export const dynamic = "force-dynamic";

import { getUsers, getUnlinkedPlayers } from "@/lib/actions";
import { UsersTable } from "./users-table";

export default async function AdminUsersPage() {
  const [users, unlinkedPlayers] = await Promise.all([
    getUsers(),
    getUnlinkedPlayers(),
  ]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold">Gestão de Utilizadores</h1>
        <p className="text-sm text-text-muted mt-1">Gerir contas, papéis e permissões dos utilizadores.</p>
      </div>
      <UsersTable users={users} unlinkedPlayers={unlinkedPlayers} />
    </div>
  );
}
