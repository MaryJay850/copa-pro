"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateSystemSetting } from "@/lib/actions";

type Setting = {
  id: string;
  key: string;
  value: string;
  label: string;
  type: string;
};

const SETTING_INFO: Record<string, { description: string; group: string }> = {
  POINTS_WIN: { description: "Pontos atribuídos por vitória", group: "Pontuação" },
  POINTS_SET: { description: "Pontos atribuídos por set ganho", group: "Pontuação" },
  POINTS_DRAW: { description: "Pontos atribuídos por empate", group: "Pontuação" },
  ELO_K_FACTOR: { description: "Fator K para cálculo Elo (sensibilidade)", group: "Elo" },
  ELO_DEFAULT: { description: "Rating Elo inicial para novos jogadores", group: "Elo" },
  NOTIFICATION_POLL_INTERVAL: { description: "Intervalo de polling de notificações (segundos)", group: "Sistema" },
};

export function SettingsForm({ settings }: { settings: Setting[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, s.value]))
  );
  const [saving, setSaving] = useState<string | null>(null);

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      await updateSystemSetting(key, values[key]);
      toast.success(`${key} atualizado!`);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Erro ao guardar.");
    }
    setSaving(null);
  };

  // Group settings
  const groups = new Map<string, Setting[]>();
  for (const s of settings) {
    const group = SETTING_INFO[s.key]?.group || "Outros";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(s);
  }

  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([group, items]) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle className="text-base">{group}</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {items.map((setting) => {
              const info = SETTING_INFO[setting.key];
              const hasChanged = values[setting.key] !== setting.value;
              return (
                <div key={setting.key} className="flex items-center gap-3 px-3 py-2 bg-surface-alt rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{setting.label || setting.key}</p>
                    {info && <p className="text-xs text-text-muted">{info.description}</p>}
                  </div>
                  <input
                    type={setting.type === "number" ? "number" : "text"}
                    value={values[setting.key] || ""}
                    onChange={(e) =>
                      setValues({ ...values, [setting.key]: e.target.value })
                    }
                    className="w-24 rounded border border-border bg-surface px-2 py-1 text-sm text-right focus:border-primary focus:outline-none"
                  />
                  {hasChanged && (
                    <Button
                      size="sm"
                      onClick={() => handleSave(setting.key)}
                      disabled={saving === setting.key}
                    >
                      {saving === setting.key ? "..." : "Guardar"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
