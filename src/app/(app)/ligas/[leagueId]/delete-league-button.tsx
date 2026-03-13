"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteLeague } from "@/lib/actions";
import { toast } from "sonner";
import { sanitizeError } from "@/lib/error-utils";

export function DeleteLeagueButton({
  leagueId,
  leagueName,
}: {
  leagueId: string;
  leagueName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteLeague(leagueId);
      toast.success("Liga eliminada com sucesso.");
      router.push("/ligas");
    } catch (e) {
      toast.error(sanitizeError(e, "Erro ao eliminar liga."));
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
        Eliminar Liga
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-sm text-red-700 flex-1">
        Eliminar <strong>{leagueName}</strong> e tudo associado (épocas, torneios, resultados)?
      </p>
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
  );
}
