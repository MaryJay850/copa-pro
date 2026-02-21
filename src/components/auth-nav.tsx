"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { getPendingRequestsCount } from "@/lib/actions";

export function AuthNav() {
  const { data: session, status } = useSession();
  const [pendingCount, setPendingCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const role = session ? (session.user as { role?: string }).role : undefined;
  const playerName = session
    ? (session.user as { playerName?: string | null }).playerName
    : undefined;

  useEffect(() => {
    if (role === "ADMINISTRADOR" || role === "GESTOR") {
      getPendingRequestsCount().then(setPendingCount).catch(() => {});
    }
  }, [role]);

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

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

  const displayName = playerName || session.user?.email?.split("@")[0] || "Utilizador";

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

      {/* User dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-alt transition-colors"
        >
          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold uppercase">
            {displayName.charAt(0)}
          </span>
          <span className="hidden sm:inline max-w-[120px] truncate">
            {displayName}
          </span>
          <svg
            className={`w-3 h-3 text-text-muted transition-transform ${menuOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-56 bg-surface border border-border rounded-lg shadow-lg z-50 py-1">
            {/* User info header */}
            <div className="px-3 py-2 border-b border-border">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-xs text-text-muted truncate">{session.user?.email}</p>
                <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium shrink-0">
                  {(session.user as any)?.plan === "CLUB" ? "Club" : (session.user as any)?.plan === "PRO" ? "Pro" : "Free"}
                </span>
              </div>
            </div>

            {/* Menu items */}
            <Link
              href="/perfil"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-alt transition-colors"
            >
              <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              O Meu Perfil
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-alt transition-colors"
            >
              <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Painel
            </Link>

            {/* Player stats link */}
            {(session.user as any).playerId && (
              <Link
                href={`/jogadores/${(session.user as any).playerId}`}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-alt transition-colors"
              >
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Estatisticas
              </Link>
            )}

            <div className="border-t border-border my-1" />

            <button
              onClick={() => {
                setMenuOpen(false);
                signOut({ callbackUrl: "/" });
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sair
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
