"use client";

import { useState, useTransition } from "react";
import { createLeagueInvite, deactivateLeagueInvite } from "@/lib/actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

interface Invite {
  id: string;
  token: string;
  expiresAt: string;
  maxUses: number | null;
  useCount: number;
  isActive: boolean;
  createdAt: string;
  _count: { usages: number };
}

export function InviteLinkCard({
  leagueId,
  invites: initialInvites,
}: {
  leagueId: string;
  invites: Invite[];
}) {
  const [showPanel, setShowPanel] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCreateInvite = () => {
    startTransition(async () => {
      try {
        const result = await createLeagueInvite(leagueId);
        // Copy to clipboard immediately
        const url = `${window.location.origin}/convite/${result.token}`;
        await navigator.clipboard.writeText(url);
        setCopiedToken(result.token);
        setTimeout(() => setCopiedToken(null), 3000);
        router.refresh();
      } catch (e) {
        alert((e as Error).message || "Erro ao criar convite.");
      }
    });
  };

  const handleCopyLink = async (token: string) => {
    const url = `${window.location.origin}/convite/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleDeactivate = (inviteId: string) => {
    startTransition(async () => {
      try {
        await deactivateLeagueInvite(inviteId);
        router.refresh();
      } catch (e) {
        alert((e as Error).message || "Erro ao desativar convite.");
      }
    });
  };

  const activeInvites = initialInvites.filter(
    (inv) => inv.isActive && new Date(inv.expiresAt) > new Date()
  );

  return (
    <div>
      <div className="flex items-center gap-2">
        <Button
          onClick={handleCreateInvite}
          disabled={isPending}
          size="sm"
        >
          {isPending ? "A criar..." : "Criar Convite"}
        </Button>
        {activeInvites.length > 0 && (
          <Button
            onClick={() => setShowPanel(!showPanel)}
            size="sm"
            variant="secondary"
          >
            {showPanel ? "Fechar" : `Ver Convites (${activeInvites.length})`}
          </Button>
        )}
      </div>

      {copiedToken && (
        <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          Link copiado para a área de transferência!
        </p>
      )}

      {showPanel && activeInvites.length > 0 && (
        <div className="mt-3 space-y-2">
          {activeInvites.map((invite) => {
            const expiresAt = new Date(invite.expiresAt);
            const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
            const isExpired = daysLeft === 0;

            return (
              <Card key={invite.id} className="!p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-xs text-slate-500 truncate block max-w-[180px]">
                        /convite/{invite.token.slice(0, 8)}...
                      </code>
                      {isExpired ? (
                        <Badge variant="default">Expirado</Badge>
                      ) : (
                        <Badge variant="success">{daysLeft}d restantes</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {invite._count.usages} {invite._count.usages === 1 ? "utilização" : "utilizações"}
                      {invite.maxUses ? ` / ${invite.maxUses} máx.` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyLink(invite.token)}
                      className="p-1.5 rounded-md hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700"
                      title="Copiar link"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeactivate(invite.id)}
                      disabled={isPending}
                      className="p-1.5 rounded-md hover:bg-red-50 transition-colors text-slate-400 hover:text-red-500"
                      title="Desativar convite"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
