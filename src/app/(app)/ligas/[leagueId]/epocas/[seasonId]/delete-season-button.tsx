"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteSeason } from "@/lib/actions";
import { toast } from "sonner";
import { sanitizeError } from "@/lib/error-utils";

export function DeleteSeasonButton({
  seasonId,
  seasonName,
  leagueId,
  tournamentCount,
}: {
  seasonId: string;
  seasonName: string;
  leagueId: string;
  tournamentCount: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteSeason(seasonId);
      toast.success("Época eliminada com sucesso.");
      router.push(`/ligas/${leagueId}`);
    } catch (e) {
      toast.error(sanitizeError(e, "Erro ao eliminar época."));
      setDeleting(false);
      setConfirming(false);
    }
  };

  if (!confirming) {
    return (
      <Button
        size="sm"
        variant="ghost"
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
        onClick={() => setConfirming(true)}
      >
        Eliminar Época
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-sm text-red-700">
        Eliminar <strong>{seasonName}</strong> e tudo associado
        {tournamentCount > 0 && ` (${tournamentCount} torneio${tournamentCount !== 1 ? "s" : ""}, resultados e rankings)`}?
      </p>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setConfirming(false)}
          disabled={deleting}
        >
          Cancelar
        </Button>
        <Button
          size="sm"
          className="bg-red-600 hover:bg-red-700 text-white"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? "A eliminar..." : "Sim, eliminar"}
        </Button>
      </div>
    </div>
  );
}
