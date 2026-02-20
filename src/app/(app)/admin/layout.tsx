import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as { role?: string }).role;
  if (role !== "ADMINISTRADOR") redirect("/dashboard");

  return (
    <div>
      <div className="border-b border-border bg-surface mb-6">
        <div className="flex items-center gap-6 text-sm">
          <Link
            href="/admin"
            className="py-3 border-b-2 border-transparent text-text-muted hover:text-text hover:border-primary transition-colors"
          >
            Visão Geral
          </Link>
          <Link
            href="/admin/utilizadores"
            className="py-3 border-b-2 border-transparent text-text-muted hover:text-text hover:border-primary transition-colors"
          >
            Utilizadores
          </Link>
          <Link
            href="/admin/ligas"
            className="py-3 border-b-2 border-transparent text-text-muted hover:text-text hover:border-primary transition-colors"
          >
            Ligas
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}
