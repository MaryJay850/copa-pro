"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export function AuthNav() {
  const { data: session, status } = useSession();

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

  const role = (session.user as { role?: string }).role;

  return (
    <div className="flex items-center gap-3">
      {role === "ADMINISTRADOR" && (
        <Link
          href="/admin"
          className="text-text-muted hover:text-text transition-colors text-xs font-medium"
        >
          Admin
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
