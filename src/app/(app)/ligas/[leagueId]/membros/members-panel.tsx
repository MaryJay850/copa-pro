"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  searchUsers,
  addPlayerToLeague,
  removePlayerFromLeague,
} from "@/lib/actions";
import { sanitizeError } from "@/lib/error-utils";

type Member = {
  id: string;
  userId: string;
  status: string;
  user: {
    id: string;
    email: string;
    phone: string;
    player: { fullName: string; nickname: string | null } | null;
  };
};

type SearchResult = {
  id: string;
  email: string;
  phone: string;
  player: { fullName: string; nickname: string | null } | null;
};

export function MembersPanel({
  leagueId,
  initialMembers,
}: {
  leagueId: string;
  initialMembers: Member[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const memberUserIds = new Set(initialMembers.map((m) => m.userId));

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    setIsSearching(true);
    try {
      const results = await searchUsers(searchQuery.trim());
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
    setIsSearching(false);
  };

  const handleAdd = (userId: string) => {
    startTransition(async () => {
      try {
        await addPlayerToLeague(userId, leagueId);
        setSearchResults((prev) => prev.filter((u) => u.id !== userId));
        toast.success("Membro adicionado com sucesso.");
        router.refresh();
      } catch (err) {
        toast.error(sanitizeError(err, "Erro ao processar pedido."));
      }
    });
  };

  const handleRemove = (userId: string, name: string) => {
    if (!confirm(`Remover ${name} da liga?`)) return;
    startTransition(async () => {
      try {
        await removePlayerFromLeague(userId, leagueId);
        toast.success("Membro removido.");
        router.refresh();
      } catch (err) {
        toast.error(sanitizeError(err, "Erro ao remover membro."));
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Search & Add */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-3">Adicionar Utilizador</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Pesquisar por nome ou email..."
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          <Button
            size="sm"
            onClick={handleSearch}
            disabled={isSearching || searchQuery.trim().length < 2}
          >
            {isSearching ? "..." : "Pesquisar"}
          </Button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {searchResults.map((user) => {
              const isMember = memberUserIds.has(user.id);
              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.player?.fullName ?? user.email}
                    </p>
                    <p className="text-xs text-text-muted">{user.email}</p>
                    {user.phone && (
                      <p className="text-xs text-text-muted">{user.phone}</p>
                    )}
                  </div>
                  {isMember ? (
                    <Badge variant="success">Já é membro</Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleAdd(user.id)}
                      disabled={isPending}
                    >
                      {isPending ? "..." : "Adicionar"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {searchResults.length === 0 && searchQuery.trim().length >= 2 && !isSearching && (
          <p className="text-xs text-text-muted mt-2">
            Sem resultados. O utilizador precisa de estar registado na plataforma.
          </p>
        )}
      </Card>

      {/* Current Members */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-3">
          Membros ({initialMembers.length})
        </h2>
        {initialMembers.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">
            Nenhum membro adicionado.
          </p>
        ) : (
          <div className="space-y-2">
            {initialMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {member.user.player?.fullName ?? member.user.email}
                  </p>
                  <p className="text-xs text-text-muted">{member.user.email}</p>
                  {member.user.phone && (
                    <p className="text-xs text-text-muted">{member.user.phone}</p>
                  )}
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() =>
                    handleRemove(
                      member.userId,
                      member.user.player?.fullName ?? member.user.email
                    )
                  }
                  disabled={isPending}
                >
                  Remover
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
