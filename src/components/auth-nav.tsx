"use client";

import { useSession } from "next-auth/react";
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
          className="text-text-muted hover:text-text transition-colors text-sm"
        >
          Entrar
        </Link>
        <Link
          href="/registar"
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark transition-colors"
        >
          Criar Conta
        </Link>
      </div>
    );
  }

  const displayName = (session.user as any)?.playerName || session.user?.email?.split("@")[0] || "Utilizador";
  const plan = (session.user as any)?.plan;

  return (
    <div className="flex items-center gap-2.5">
      <Link
        href="/perfil"
        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text hover:bg-surface-hover transition-colors"
      >
        <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold uppercase">
          {displayName.charAt(0)}
        </span>
        <span className="hidden sm:inline max-w-[120px] truncate">
          {displayName}
        </span>
        {plan && plan !== "FREE" && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">
            {plan === "CLUB" ? "Club" : "Pro"}
          </span>
        )}
      </Link>
    </div>
  );
}
