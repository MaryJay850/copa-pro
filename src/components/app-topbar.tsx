"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { AuthNav } from "@/components/auth-nav";
import { DarkModeToggle } from "@/components/dark-mode-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { PushNotificationButton } from "@/components/push-notification-button";

// Map routes to breadcrumb labels
function getBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  const crumbs: { label: string; href?: string }[] = [];

  if (pathname.startsWith("/dashboard")) {
    crumbs.push({ label: "Painel" });
  } else if (pathname.startsWith("/ligas")) {
    crumbs.push({ label: "Ligas", href: "/ligas" });
    if (pathname.match(/\/ligas\/[^/]+$/)) {
      crumbs.push({ label: "Detalhes" });
    } else if (pathname.includes("/clubes")) {
      crumbs.push({ label: "Clubes" });
    } else if (pathname.includes("/epocas")) {
      crumbs.push({ label: "Epoca" });
      if (pathname.includes("/torneios/novo")) {
        crumbs.push({ label: "Novo Torneio" });
      }
    } else if (pathname.includes("/membros")) {
      crumbs.push({ label: "Membros" });
    }
  } else if (pathname.startsWith("/torneios")) {
    crumbs.push({ label: "Torneios" });
    if (pathname.includes("/editar")) {
      crumbs.push({ label: "Editar" });
    } else if (pathname.includes("/placar")) {
      crumbs.push({ label: "Placar" });
    }
  } else if (pathname.startsWith("/gestor")) {
    crumbs.push({ label: "Gestao" });
  } else if (pathname.startsWith("/planos")) {
    crumbs.push({ label: "Planos" });
  } else if (pathname.startsWith("/perfil")) {
    crumbs.push({ label: "Perfil" });
  } else if (pathname.startsWith("/admin")) {
    crumbs.push({ label: "Administracao", href: "/admin" });
    if (pathname.includes("/utilizadores")) crumbs.push({ label: "Utilizadores" });
    else if (pathname.includes("/ligas")) crumbs.push({ label: "Ligas" });
    else if (pathname.includes("/analytics")) crumbs.push({ label: "Analytics" });
    else if (pathname.includes("/planos")) crumbs.push({ label: "Planos" });
    else if (pathname.includes("/auditoria")) crumbs.push({ label: "Auditoria" });
    else if (pathname.includes("/configuracoes")) crumbs.push({ label: "Configuracoes" });
  } else if (pathname.startsWith("/jogadores")) {
    crumbs.push({ label: "Jogador" });
  }

  return crumbs;
}

export function AppTopbar({ onMenuToggle }: { onMenuToggle: () => void }) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);
  const pageTitle = breadcrumbs[breadcrumbs.length - 1]?.label || "Painel";

  return (
    <header
      className="sticky top-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-border h-[var(--topbar-height)] flex items-center px-4 lg:px-8"
    >
      {/* Left: hamburger + breadcrumbs */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 -ml-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
          aria-label="Menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Page title & breadcrumbs */}
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-text truncate">{pageTitle}</h1>
          {breadcrumbs.length > 1 && (
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <Link href="/dashboard" className="hover:text-primary transition-colors">CopaPro</Link>
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {crumb.href && i < breadcrumbs.length - 1 ? (
                    <Link href={crumb.href} className="hover:text-primary transition-colors">{crumb.label}</Link>
                  ) : (
                    <span className={i === breadcrumbs.length - 1 ? "text-text font-medium" : ""}>{crumb.label}</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2">
          <PushNotificationButton />
          <NotificationBell />
          <DarkModeToggle />
        </div>
        <div className="hidden sm:block h-6 w-px bg-border mx-1" />
        <AuthNav />
      </div>
    </header>
  );
}
