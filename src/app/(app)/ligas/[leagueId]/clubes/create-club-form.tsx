"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClub } from "@/lib/actions/club-actions";
import { sanitizeError } from "@/lib/error-utils";

export function CreateClubForm({ leagueId }: { leagueId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        await createClub(leagueId, name.trim());
        toast.success("Clube criado com sucesso.");
        setName("");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(sanitizeError(err, "Erro ao criar clube."));
      }
    });
  };

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <span className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Clube
        </span>
      </Button>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3">Novo Clube</h3>
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Nome do clube..."
          className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          autoFocus
        />
        <Button size="sm" onClick={handleSubmit} disabled={isPending || !name.trim()}>
          {isPending ? "A criar..." : "Criar"}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => { setOpen(false); setName(""); }}>
          Cancelar
        </Button>
      </div>
    </Card>
  );
}
