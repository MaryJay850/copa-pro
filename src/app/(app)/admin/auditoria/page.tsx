export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/auth-guards";
import { AuditLogViewer } from "./audit-viewer";
import Link from "next/link";

export default async function AuditPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-text-muted mb-1">
          <Link href="/admin" className="hover:text-text">Admin</Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-bold">Registo de Auditoria</h1>
        <p className="text-sm text-text-muted mt-1">Historico de todas as acoes na plataforma.</p>
      </div>
      <AuditLogViewer />
    </div>
  );
}
