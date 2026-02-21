"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  updateUserRole,
  deleteUser,
  createUserManually,
  linkPlayerToUser,
} from "@/lib/actions";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  email: string;
  phone: string;
  role: string;
  playerId: string | null;
  createdAt: string;
  player: { fullName: string; nickname: string | null } | null;
  managedLeagues: { league: { id: string; name: string } }[];
};

type UnlinkedPlayer = {
  id: string;
  fullName: string;
  nickname: string | null;
};

const ROLE_LABELS: Record<string, string> = {
  JOGADOR: "Jogador",
  GESTOR: "Gestor",
  ADMINISTRADOR: "Admin",
};

const ROLE_VARIANTS: Record<string, "info" | "warning" | "success"> = {
  JOGADOR: "info",
  GESTOR: "warning",
  ADMINISTRADOR: "success",
};

export function UsersTable({
  users,
  unlinkedPlayers,
}: {
  users: User[];
  unlinkedPlayers: UnlinkedPlayer[];
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleRoleChange = (userId: string, role: string) => {
    startTransition(async () => {
      await updateUserRole(userId, role as "JOGADOR" | "GESTOR" | "ADMINISTRADOR");
      router.refresh();
    });
  };

  const handleDelete = (userId: string, email: string) => {
    if (!confirm(`Eliminar o utilizador ${email}? O jogador associado será mantido.`)) return;
    startTransition(async () => {
      await deleteUser(userId);
      router.refresh();
    });
  };

  const handleLink = (userId: string, playerId: string) => {
    startTransition(async () => {
      await linkPlayerToUser(userId, playerId);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">{users.length} utilizadores registados</p>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancelar" : "+ Criar Utilizador"}
        </Button>
      </div>

      {showCreate && (
        <CreateUserForm
          onDone={() => {
            setShowCreate(false);
            router.refresh();
          }}
        />
      )}

      <div className="space-y-3">
        {users.map((user) => (
          <Card key={user.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm truncate">
                  {user.player?.fullName ?? user.email}
                </span>
                <Badge variant={ROLE_VARIANTS[user.role] ?? "info"}>
                  {ROLE_LABELS[user.role] ?? user.role}
                </Badge>
              </div>
              <p className="text-xs text-text-muted">{user.email}</p>
              {user.phone && (
                <p className="text-xs text-text-muted">{user.phone}</p>
              )}
              {user.player?.nickname && (
                <p className="text-xs text-text-muted">Alcunha: {user.player.nickname}</p>
              )}
              {!user.playerId && (
                <p className="text-xs text-amber-600 font-medium mt-1">⚠ Sem jogador associado</p>
              )}
              {user.managedLeagues.length > 0 && (
                <p className="text-xs text-text-muted mt-1">
                  Gestor de: {user.managedLeagues.map((ml) => ml.league.name).join(", ")}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!user.playerId && unlinkedPlayers.length > 0 && (
                <select
                  className="text-xs rounded border border-border px-2 py-1"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) handleLink(user.id, e.target.value);
                  }}
                  disabled={isPending}
                >
                  <option value="">Associar jogador...</option>
                  {unlinkedPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName}
                    </option>
                  ))}
                </select>
              )}
              <select
                className="text-xs rounded border border-border px-2 py-1"
                value={user.role}
                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                disabled={isPending}
              >
                <option value="JOGADOR">Jogador</option>
                <option value="GESTOR">Gestor</option>
                <option value="ADMINISTRADOR">Admin</option>
              </select>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(user.id, user.email)}
                disabled={isPending}
              >
                Eliminar
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"JOGADOR" | "GESTOR" | "ADMINISTRADOR">("JOGADOR");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createUserManually({ email, password, fullName, nickname: nickname || undefined, phone: phone || undefined, role });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    }
    setLoading(false);
  };

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nome completo *"
          required
          className="rounded-lg border border-border px-3 py-2 text-sm"
        />
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Alcunha"
          className="rounded-lg border border-border px-3 py-2 text-sm"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email *"
          required
          className="rounded-lg border border-border px-3 py-2 text-sm"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Palavra-passe *"
          required
          minLength={6}
          className="rounded-lg border border-border px-3 py-2 text-sm"
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Telemóvel (ex: +351 932539702)"
          className="rounded-lg border border-border px-3 py-2 text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
          className="rounded-lg border border-border px-3 py-2 text-sm"
        >
          <option value="JOGADOR">Jogador</option>
          <option value="GESTOR">Gestor</option>
          <option value="ADMINISTRADOR">Admin</option>
        </select>
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={loading} size="sm">
            {loading ? "A criar..." : "Criar"}
          </Button>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </form>
    </Card>
  );
}
