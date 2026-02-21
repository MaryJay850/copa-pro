export const dynamic = "force-dynamic";

import { getSystemSettings } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth-guards";
import { SettingsForm } from "./settings-form";
import Link from "next/link";

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getSystemSettings();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-text-muted mb-1">
          <Link href="/admin" className="hover:text-text">Admin</Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-bold">Configurações do Sistema</h1>
        <p className="text-sm text-text-muted mt-1">Defina os parâmetros globais da plataforma.</p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
