"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { updateLeague } from "@/lib/actions";
import { sanitizeError } from "@/lib/error-utils";

export function EditLeagueForm({
  leagueId,
  currentName,
  currentLocation,
}: {
  leagueId: string;
  currentName: string;
  currentLocation: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [location, setLocation] = useState(currentLocation || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const hasChanges = name !== currentName || location !== (currentLocation || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await updateLeague(leagueId, { name, location: location || undefined });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(sanitizeError(err, "Erro ao guardar liga."));
    }
    setLoading(false);
  };

  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Editar
      </Button>
    );
  }

  return (
    <Card className="p-4 border-primary/30">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da liga *"
          required
          className="rounded-lg border border-border px-3 py-2 text-sm flex-1"
        />
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Localização"
          className="rounded-lg border border-border px-3 py-2 text-sm flex-1"
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={loading || !hasChanges} size="sm">
            {loading ? "A guardar..." : "Guardar"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </div>
      </form>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </Card>
  );
}
