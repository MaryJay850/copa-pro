"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { assignLeagueManager, removeLeagueManager } from "@/lib/actions";
import { useRouter } from "next/navigation";

type Manager = { userId: string; name: string };
type UserOption = { id: string; name: string };

export function LeagueManagersPanel({
  leagueId,
  currentManagers,
  allUsers,
}: {
  leagueId: string;
  currentManagers: Manager[];
  allUsers: UserOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedUserId, setSelectedUserId] = useState("");
  const router = useRouter();

  const availableUsers = allUsers.filter(
    (u) => !currentManagers.some((m) => m.userId === u.id)
  );

  const handleAdd = () => {
    if (!selectedUserId) return;
    startTransition(async () => {
      await assignLeagueManager(selectedUserId, leagueId);
      setSelectedUserId("");
      router.refresh();
    });
  };

  const handleRemove = (userId: string) => {
    startTransition(async () => {
      await removeLeagueManager(userId, leagueId);
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-text-muted">Gestores:</p>
      {currentManagers.map((m) => (
        <div
          key={m.userId}
          className="flex items-center justify-between text-xs bg-surface-alt rounded px-2 py-1"
        >
          <span>{m.name}</span>
          <button
            onClick={() => handleRemove(m.userId)}
            disabled={isPending}
            className="text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
          >
            ✕
          </button>
        </div>
      ))}
      {availableUsers.length > 0 && (
        <div className="flex gap-1.5">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="flex-1 text-xs rounded border border-border px-2 py-1"
            disabled={isPending}
          >
            <option value="">Adicionar gestor...</option>
            {availableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!selectedUserId || isPending}
          >
            +
          </Button>
        </div>
      )}
    </div>
  );
}
