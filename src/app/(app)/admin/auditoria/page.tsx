export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/auth-guards";
import { AuditLogViewer } from "./audit-viewer";

export default async function AuditPage() {
  await requireAdmin();

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold">Registo de Auditoria</h1>
        <p className="text-sm text-text-muted mt-1">Historico de todas as acoes na plataforma.</p>
      </div>
      <AuditLogViewer />
    </div>
  );
}
