"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getPendingRequestsCount } from "@/lib/actions";

export function AuthNav() {
  const { data: session, status } = useSession();
  const [pendingCount, setPendingCount] = useState(0);

  const role = session ? (session.user as { role?: string }).role : undefined;

  useEffect(() => {
    if (role === "ADMINISTRADOR" || role === "GESTOR") {
      getPendingRequestsCount().then(setPendingCount).catch(() => {});
    }
  }, [role]);

  if (status === "loading") {
    return <div className="w-20 h-4 bg-slate-200 rounded animate-pulse" />;
  }

  if (!session) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="text-text-muted hover:text-text transition-colors"
        >
          Entrar
        </Link>
        <Link
          href="/registar"
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          Criar Conta
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {role === "ADMINISTRADOR" && (
        <Link
          href="/admin"
          className="relative text-text-muted hover:text-text transition-colors text-xs font-medium"
        >
          Admin
          {pendingCount > 0 && (
            <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {pendingCount > 99 ? "99+" : pendingCount}
            </span>
          )}
        </Link>
      )}
      {role === "GESTOR" && pendingCount > 0 && (
        <Link
          href="/ligas"
          className="relative text-text-muted hover:text-text transition-colors text-xs font-medium"
        >
          Pedidos
          <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {pendingCount > 99 ? "99+" : pendingCount}
          </span>
        </Link>
      )}
      <span className="text-xs text-text-muted hidden sm:inline">
        {session.user?.email}
      </span>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text hover:border-text transition-colors"
      >
        Sair
      </button>
    </div>
  );
}
