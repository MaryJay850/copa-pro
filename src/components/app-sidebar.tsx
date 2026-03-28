"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// Icons as inline SVGs
const icons = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  leagues: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  stats: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  management: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  clubs: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  requests: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  ),
  admin: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  analytics: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  audit: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  config: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  ),
  plans: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  profile: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  logout: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
};

export function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const role = (session?.user as any)?.role;
  const playerId = (session?.user as any)?.playerId;
  const isAdmin = role === "ADMINISTRADOR";
  const isManager = role === "GESTOR" || isAdmin;

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    if (href === "/admin") return pathname === "/admin" && !pathname.startsWith("/admin/");
    return pathname === href || pathname.startsWith(href + "/");
  };

  function getNavSections(): NavSection[] {
    const sections: NavSection[] = [
      {
        title: "GERAL",
        items: [
          { href: "/dashboard", label: "Painel", icon: icons.dashboard },
          { href: "/ligas", label: "As Minhas Ligas", icon: icons.leagues },
        ],
      },
    ];

    if (isManager) {
      sections.push({
        title: "GESTÃO",
        items: [
          { href: "/gestor", label: "Ligas & Torneios", icon: icons.management },
        ],
      });
    }

    if (isAdmin) {
      sections.push({
        title: "ADMINISTRAÇÃO",
        items: [
          { href: "/admin", label: "Visão Geral", icon: icons.admin },
          { href: "/admin/utilizadores", label: "Utilizadores", icon: icons.users },
          { href: "/admin/ligas", label: "Ligas", icon: icons.leagues },
          { href: "/admin/analytics", label: "Analytics", icon: icons.analytics },
          { href: "/admin/planos", label: "Planos", icon: icons.plans },
          { href: "/admin/auditoria", label: "Auditoria", icon: icons.audit },
          { href: "/admin/configuracoes", label: "Configurações", icon: icons.config },
        ],
      });
    }

    return sections;
  }

  const navSections = getNavSections();

  const displayName = (session?.user as any)?.playerName || session?.user?.email?.split("@")[0] || "Utilizador";

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-screen z-50 flex flex-col transition-all duration-300 ease-in-out ${
          collapsed ? "-translate-x-full lg:translate-x-0 lg:w-[var(--sidebar-collapsed-width)]" : "w-[var(--sidebar-width)]"
        }`}
        style={{ backgroundColor: "var(--color-sidebar)" }}
      >
        {/* Logo area */}
        <div
          className="flex items-center h-[var(--topbar-height)] px-5 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--color-sidebar-border)" }}
        >
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow flex-shrink-0">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2C12 2 5 8 5 12s3 8 7 10" />
                <path d="M12 2c0 0 7 6 7 10s-3 8-7 10" />
                <line x1="2" y1="12" x2="22" y2="12" />
              </svg>
            </div>
            {!collapsed && (
              <span className="text-xl font-extrabold tracking-tight text-white">
                Copa<span className="text-primary-light">Pro</span>
              </span>
            )}
          </Link>
        </div>

        {/* Navigation sections */}
        <nav className="flex-1 overflow-y-auto sidebar-scroll py-4 px-3">
          {navSections.map((section) => (
            <div key={section.title} className="mb-5">
              {!collapsed && (
                <div
                  className="px-3 mb-2 text-[11px] font-semibold tracking-wider uppercase"
                  style={{ color: "var(--color-sidebar-text)", opacity: 0.5 }}
                >
                  {section.title}
                </div>
              )}

              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.href);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-all duration-200 ${
                          active
                            ? "text-white bg-white/10"
                            : "hover:bg-white/5"
                        }`}
                        style={{ color: active ? "var(--color-sidebar-text-active)" : "var(--color-sidebar-text)" }}
                        title={collapsed ? item.label : undefined}
                      >
                        <span className={`flex-shrink-0 transition-colors ${active ? "text-primary-light" : ""}`} style={{ opacity: active ? 1 : 0.7 }}>
                          {item.icon}
                        </span>
                        {!collapsed && (
                          <>
                            <span className="flex-1">{item.label}</span>
                            {item.badge && item.badge > 0 && (
                              <span className="bg-danger text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                                {item.badge > 99 ? "99+" : item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer: Planos, Perfil, Sair */}
        <div
          className="flex-shrink-0 px-3 py-3"
          style={{ borderTop: "1px solid var(--color-sidebar-border)" }}
        >
          {/* User info (when expanded) */}
          {!collapsed && session?.user && (
            <div className="flex items-center gap-3 px-3 py-2.5 mb-2">
              <span className="w-8 h-8 rounded-full bg-primary/20 text-primary-light flex items-center justify-center text-sm font-bold uppercase flex-shrink-0">
                {displayName.charAt(0)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{displayName}</p>
                <p className="text-[11px] truncate" style={{ color: "var(--color-sidebar-text)" }}>{session.user.email}</p>
              </div>
            </div>
          )}

          <ul className="space-y-0.5">
            <li>
              <Link
                href="/planos"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                  isActive("/planos") ? "text-white bg-white/10" : "hover:bg-white/5"
                }`}
                style={{ color: isActive("/planos") ? "var(--color-sidebar-text-active)" : "var(--color-sidebar-text)" }}
                title={collapsed ? "Planos" : undefined}
              >
                <span className="flex-shrink-0" style={{ opacity: isActive("/planos") ? 1 : 0.7 }}>
                  {icons.plans}
                </span>
                {!collapsed && <span>Planos & Subscrição</span>}
              </Link>
            </li>
            <li>
              <Link
                href="/perfil"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                  isActive("/perfil") ? "text-white bg-white/10" : "hover:bg-white/5"
                }`}
                style={{ color: isActive("/perfil") ? "var(--color-sidebar-text-active)" : "var(--color-sidebar-text)" }}
                title={collapsed ? "Perfil" : undefined}
              >
                <span className="flex-shrink-0" style={{ opacity: isActive("/perfil") ? 1 : 0.7 }}>
                  {icons.profile}
                </span>
                {!collapsed && <span>Perfil</span>}
              </Link>
            </li>
            <li>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 hover:bg-white/5"
                style={{ color: "#f93b7a" }}
                title={collapsed ? "Sair" : undefined}
              >
                <span className="flex-shrink-0" style={{ opacity: 0.8 }}>
                  {icons.logout}
                </span>
                {!collapsed && <span>Sair</span>}
              </button>
            </li>
          </ul>

          {/* Collapse toggle (desktop) */}
          <div className="hidden lg:flex items-center justify-center mt-2">
            <button
              onClick={onToggle}
              className="p-2 rounded-lg transition-colors hover:bg-white/10 w-full flex items-center justify-center"
              style={{ color: "var(--color-sidebar-text)" }}
              title={collapsed ? "Expandir menu" : "Recolher menu"}
            >
              <svg
                className={`w-4 h-4 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
