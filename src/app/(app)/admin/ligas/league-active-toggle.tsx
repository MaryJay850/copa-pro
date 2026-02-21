"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleLeagueActive } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";

export function LeagueActiveToggle({
  leagueId,
  isActive,
}: {
  leagueId: string;
  isActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleToggle = () => {
    startTransition(async () => {
      await toggleLeagueActive(leagueId);
      router.refresh();
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className="disabled:opacity-50 transition-opacity"
      title={isActive ? "Clique para desativar liga" : "Clique para ativar liga"}
    >
      <Badge variant={isActive ? "success" : "danger"}>
        {isPending ? "..." : isActive ? "Ativa" : "Inativa"}
      </Badge>
    </button>
  );
}
