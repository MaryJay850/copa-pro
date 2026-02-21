"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createLeague } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateLeagueForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (!open) {
    return (
      <Button variant="primary" size="md" onClick={() => setOpen(true)}>
        + Nova Liga
      </Button>
    );
  }

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    try {
      await createLeague(formData);
      setOpen(false);
      toast.success("Liga criada com sucesso.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setLoading(false);
  };

  return (
    <form action={handleSubmit} className="bg-white rounded-xl border border-border p-4 space-y-3 max-w-md">
      <Input name="name" label="Nome da Liga" placeholder="Ex: Liga Padel Lisboa" required />
      <Input name="location" label="Localização (opcional)" placeholder="Ex: Lisboa, Portugal" />
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "A criar..." : "Criar Liga"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
