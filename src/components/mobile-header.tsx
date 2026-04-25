"use client";

import { usePathname, useRouter } from "next/navigation";
import { NotificationBell } from "@/components/notification-bell";
import { DarkModeToggle } from "@/components/dark-mode-toggle";

/* ── Route to title mapping ── */
function getMobileTitle(pathname: string): string {
  // Root pages
  if (pathname === "/dashboard" || pathname === "/") return "Painel";
  if (pathname === "/ligas") return "As Minhas Ligas";
  if (pathname === "/torneios") return "Os Meus Torneios";
  if (pathname === "/easy-mix") return "Easy Mix";
  if (pathname === "/perfil") return "Perfil";
  if (pathname === "/planos") return "Planos";
  if (pathname === "/gestor") return "Gestao";

  // Sub-pages
  if (pathname.startsWith("/ligas/")) {
    if (pathname.includes("/auditoria")) return "Auditoria";
    if (pathname.includes("/torneios/novo")) return "Novo Torneio";
    if (pathname.includes("/epocas/")) return "Epoca";
    if (pathname.includes("/membros")) return "Membros";
    if (pathname.includes("/financeiro")) return "Financeiro";
    if (pathname.includes("/reservas")) return "Reservas";
    if (pathname.includes("/clubes")) {
      if (pathname.includes("/socios")) return "Socios";
      return "Clubes";
    }
    if (pathname.includes("/editar")) return "Editar Liga";
    return "Liga";
  }
  if (pathname.startsWith("/torneios/")) {
    if (pathname.includes("/novo")) return "Novo Torneio";
    if (pathname.includes("/editar")) return "Editar Torneio";
    if (pathname.includes("/placar")) return "Placar";
    if (pathname.includes("/imprimir")) return "Imprimir";
    if (pathname.includes("/tv")) return "TV";
    return "Torneio";
  }
  if (pathname.startsWith("/jogadores/")) return "Jogador";

  // Admin pages
  if (pathname.startsWith("/admin")) {
    if (pathname.includes("/utilizadores")) return "Utilizadores";
    if (pathname.includes("/ligas")) return "Ligas";
    if (pathname.includes("/clubes")) return "Clubes";
    if (pathname.includes("/analytics")) return "Analytics";
    if (pathname.includes("/planos")) return "Planos & Precos";
    if (pathname.includes("/auditoria")) return "Auditoria";
    if (pathname.includes("/configuracoes")) return "Configuracoes";
    if (pathname.includes("/importar-clubes")) return "Importar Clubes";
    return "Administracao";
  }

  return "CopaPro";
}

/* ── Root routes (no back button) ── */
const rootRoutes = ["/dashboard", "/", "/ligas", "/torneios", "/easy-mix"];

function isRootPage(pathname: string): boolean {
  return rootRoutes.includes(pathname);
}

export function MobileHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const title = getMobileTitle(pathname);
  const showBack = !isRootPage(pathname);

  return (
    <header
      className="mobile-only sticky top-0 z-40 flex items-center h-14 px-4"
      style={{
        backgroundColor: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Left: back button */}
      <div className="w-10 flex-shrink-0">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="p-1.5 -ml-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
            aria-label="Voltar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Center: page title */}
      <div className="flex-1 text-center min-w-0">
        <h1 className="text-[15px] font-semibold text-text truncate">{title}</h1>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <NotificationBell />
        <DarkModeToggle />
      </div>
    </header>
  );
}
