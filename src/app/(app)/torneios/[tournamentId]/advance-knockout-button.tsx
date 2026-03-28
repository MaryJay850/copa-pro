"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { advanceToKnockout } from "@/lib/actions/group-knockout-actions";
import { sanitizeError } from "@/lib/error-utils";

export function AdvanceToKnockoutButton({ tournamentId }: { tournamentId: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);
  const router = useRouter();

  const handleAdvance = () => {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }

    startTransition(async () => {
      try {
        await advanceToKnockout(tournamentId);
        toast.success("Eliminatorias geradas com sucesso!");
        setConfirmed(false);
        router.refresh();
      } catch (err) {
        toast.error(sanitizeError(err, "Erro ao gerar eliminatorias."));
        setConfirmed(false);
      }
    });
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl">
      <div className="flex-1">
        <p className="text-sm font-semibold text-purple-800">Fase de grupos concluida!</p>
        <p className="text-xs text-purple-600 mt-0.5">
          {confirmed
            ? "Clique novamente para confirmar. O bracket sera gerado com seeding aleatorio."
            : "Avance para as eliminatorias para gerar o bracket."}
        </p>
      </div>
      <Button
        onClick={handleAdvance}
        disabled={isPending}
        variant={confirmed ? "default" : "secondary"}
      >
        {isPending ? "A gerar..." : confirmed ? "Confirmar" : "Avancar para Eliminatorias"}
      </Button>
      {confirmed && (
        <Button variant="ghost" onClick={() => setConfirmed(false)} disabled={isPending}>
          Cancelar
        </Button>
      )}
    </div>
  );
}
