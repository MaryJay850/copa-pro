export const dynamic = "force-dynamic";

import { getSystemSettings } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth-guards";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getSystemSettings();

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold">Configurações do Sistema</h1>
        <p className="text-sm text-text-muted mt-1">Defina os parâmetros globais da plataforma.</p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
