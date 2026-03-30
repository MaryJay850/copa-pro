export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/auth-guards";
import { getImportPreview } from "@/lib/actions/seed-clubs";
import { ImportClubsClient } from "./import-client";

export default async function ImportarClubesPage() {
  await requireAdmin();

  const preview = await getImportPreview();

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold">Importar Clubes de Padel</h1>
        <p className="text-sm text-text-muted mt-1">
          Importação automática de clubes de padel em Portugal com campos pré-configurados
        </p>
      </div>

      <ImportClubsClient preview={preview} />
    </div>
  );
}
