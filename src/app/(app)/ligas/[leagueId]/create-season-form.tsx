"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createSeason } from "@/lib/actions";
import { sanitizeError } from "@/lib/error-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";

export function CreateSeasonForm({ leagueId }: { leagueId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allowDraws, setAllowDraws] = useState(false);
  const router = useRouter();

  if (!open) {
    return (
      <Button variant="primary" size="md" onClick={() => setOpen(true)}>
        + Nova Época
      </Button>
    );
  }

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    try {
      formData.set("leagueId", leagueId);
      formData.set("allowDraws", String(allowDraws));
      await createSeason(formData);
      setOpen(false);
      toast.success("Época criada com sucesso.");
      router.refresh();
    } catch (e) {
      toast.error(sanitizeError(e, "Erro ao criar época."));
    }
    setLoading(false);
  };

  return (
    <form action={handleSubmit} className="bg-white rounded-xl border border-border p-4 space-y-3 max-w-md">
      <Input name="name" label="Nome da Época" tooltip="Nome identificador da época. Ex: Época 2026, Primavera 2026" placeholder="Ex: Época 2026" required />
      <Input name="startDate" label="Data de início (opcional)" tooltip="Data em que a época começa. Ajuda a organizar épocas cronologicamente." type="date" />
      <Input name="endDate" label="Data de fim (opcional)" tooltip="Data prevista para o fim da época." type="date" />
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={allowDraws}
          onChange={(e) => setAllowDraws(e.target.checked)}
          className="rounded border-border text-primary focus:ring-primary"
        />
        Permitir empates
        <Tooltip text="Se ativo, os jogos podem terminar empatados. Caso contrário, é obrigatório haver um vencedor." />
      </label>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "A criar..." : "Criar Época"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
