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
  accent?: string; // optional accent color for the active indicator
}

interface NavSection {
  title: string;
  items: NavItem[];
  collapsible?: boolean;
}

/* ── Icon set ── */
const i = {
  dashboard: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  leagues: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  tournaments: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  easyMix: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  player: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  management: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  calendar: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  money: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  members: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  shield: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  users: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  clubs: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  analytics: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  plans: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  ),
  audit: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  config: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  profile: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  logout: (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  ),
  chevrons: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
    </svg>
  ),
};

/* ── Role badge colors ── */
const roleBadge: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  JOGADOR: { label: "Jogador", bg: "bg-emerald-500/15", text: "text-emerald-400", dot: "bg-emerald-400" },
  GESTOR: { label: "Gestor", bg: "bg-amber-500/15", text: "text-amber-400", dot: "bg-amber-400" },
  ADMINISTRADOR: { label: "Admin", bg: "bg-rose-500/15", text: "text-rose-400", dot: "bg-rose-400" },
};

/* ── Plan badge ── */
const planBadge: Record<string, { label: string; cls: string }> = {
  PRO: { label: "Pro", cls: "bg-gradient-to-r from-primary/80 to-primary-light/80 text-white" },
  CLUB: { label: "Club", cls: "bg-gradient-to-r from-amber-500/80 to-amber-400/80 text-white" },
};

export function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [adminCollapsed, setAdminCollapsed] = useState(false);

  const role = (session?.user as any)?.role ?? "JOGADOR";
  const plan = (session?.user as any)?.plan ?? "FREE";
  const playerId = (session?.user as any)?.playerId;
  const isAdmin = role === "ADMINISTRADOR";
  const isManager = role === "GESTOR" || isAdmin;

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    if (href === "/admin") return pathname === "/admin" && !pathname.startsWith("/admin/");
    return pathname === href || pathname.startsWith(href + "/");
  };

  const displayName = (session?.user as any)?.playerName || session?.user?.email?.split("@")[0] || "Utilizador";
  const rb = roleBadge[role] ?? roleBadge.JOGADOR;
  const pb = plan !== "FREE" ? planBadge[plan] : null;

  function getNavSections(): NavSection[] {
    const sections: NavSection[] = [];

    /* ── Everyone: Main nav ── */
    sections.push({
      title: "MENU",
      items: [
        { href: "/dashboard", label: "Painel", icon: i.dashboard },
        { href: "/ligas", label: "As Minhas Ligas", icon: i.leagues },
        { href: "/torneios", label: "Os Meus Torneios", icon: i.tournaments },
        { href: "/easy-mix", label: "Easy Mix", icon: i.easyMix, accent: "from-amber-400 to-orange-400" },
        ...(playerId ? [{ href: `/jogadores/${playerId}`, label: "O Meu Perfil", icon: i.player }] : []),
      ],
    });

    /* ── Managers: Management tools ── */
    if (isManager) {
      sections.push({
        title: "GESTÃO",
        items: [
          { href: "/gestor", label: "Painel de Gestão", icon: i.management },
        ],
      });
    }

    /* ── Admin: Platform admin ── */
    if (isAdmin) {
      sections.push({
        title: "ADMINISTRAÇÃO",
        collapsible: true,
        items: [
          { href: "/admin", label: "Visão Geral", icon: i.shield },
          { href: "/admin/utilizadores", label: "Utilizadores", icon: i.users },
          { href: "/admin/ligas", label: "Ligas", icon: i.leagues },
          { href: "/admin/clubes", label: "Clubes", icon: i.clubs },
          { href: "/admin/analytics", label: "Analytics", icon: i.analytics },
          { href: "/admin/planos", label: "Planos & Preços", icon: i.plans },
          { href: "/admin/auditoria", label: "Auditoria", icon: i.audit },
          { href: "/admin/configuracoes", label: "Configurações", icon: i.config },
        ],
      });
    }

    return sections;
  }

  const navSections = getNavSections();

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-screen z-50 flex flex-col transition-all duration-300 ease-in-out ${
          collapsed ? "-translate-x-full lg:translate-x-0 lg:w-[var(--sidebar-collapsed-width)]" : "w-[var(--sidebar-width)]"
        }`}
        style={{ backgroundColor: "var(--color-sidebar)" }}
      >
        {/* ── Logo ── */}
        <div
          className="flex items-center h-[var(--topbar-height)] px-5 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--color-sidebar-border)" }}
        >
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all flex-shrink-0">
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

        {/* ── User Card ── */}
        {!collapsed && session?.user && (
          <div className="px-4 pt-4 pb-2">
            <Link
              href="/perfil"
              className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:bg-white/[0.06] group"
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary-light/30 text-primary-light flex items-center justify-center text-sm font-bold uppercase ring-2 ring-white/10 group-hover:ring-primary-light/30 transition-all">
                  {displayName.charAt(0)}
                </span>
                {/* Online indicator */}
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${rb.dot}`} style={{ borderColor: "var(--color-sidebar)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white truncate leading-tight">{displayName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${rb.bg} ${rb.text}`}>
                    {rb.label}
                  </span>
                  {pb && (
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${pb.cls}`}>
                      {pb.label}
                    </span>
                  )}
                </div>
              </div>
              <svg className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}

        {/* Collapsed user avatar */}
        {collapsed && session?.user && (
          <div className="flex items-center justify-center py-4">
            <Link href="/perfil" title={displayName}>
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/30 to-primary-light/30 text-primary-light flex items-center justify-center text-sm font-bold uppercase">
                {displayName.charAt(0)}
              </span>
            </Link>
          </div>
        )}

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto sidebar-scroll py-2 px-3">
          {navSections.map((section) => {
            const isAdminSection = section.title === "ADMINISTRAÇÃO";
            const isCollapsedSection = isAdminSection && adminCollapsed;
            const sectionItems = isCollapsedSection ? [] : section.items;

            return (
              <div key={section.title} className="mb-4">
                {!collapsed && (
                  <div className="flex items-center justify-between px-3 mb-1.5">
                    <span
                      className="text-[10px] font-bold tracking-[0.12em] uppercase select-none"
                      style={{ color: "var(--color-sidebar-text)", opacity: 0.4 }}
                    >
                      {section.title}
                    </span>
                    {section.collapsible && (
                      <button
                        onClick={() => setAdminCollapsed(!adminCollapsed)}
                        className="p-0.5 rounded hover:bg-white/10 transition-colors"
                        style={{ color: "var(--color-sidebar-text)", opacity: 0.4 }}
                      >
                        <svg
                          className={`w-3 h-3 transition-transform duration-200 ${isCollapsedSection ? "-rotate-90" : ""}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}

                <ul className="space-y-0.5">
                  {sectionItems.map((item) => {
                    const active = isActive(item.href);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`group/item relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                            active
                              ? "bg-white/[0.08]"
                              : "hover:bg-white/[0.04]"
                          }`}
                          style={{ color: active ? "var(--color-sidebar-text-active)" : "var(--color-sidebar-text)" }}
                          title={collapsed ? item.label : undefined}
                        >
                          {/* Active indicator bar */}
                          {active && (
                            <span
                              className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b ${
                                item.accent || "from-primary to-primary-light"
                              }`}
                            />
                          )}

                          <span
                            className={`flex-shrink-0 transition-all duration-200 ${
                              active
                                ? "text-white scale-105"
                                : "opacity-60 group-hover/item:opacity-90"
                            }`}
                          >
                            {item.icon}
                          </span>

                          {!collapsed && (
                            <>
                              <span className="flex-1 truncate">{item.label}</span>
                              {item.badge && item.badge > 0 && (
                                <span className="bg-danger/90 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-sm">
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
            );
          })}
        </nav>

        {/* ── Footer ── */}
        <div
          className="flex-shrink-0 px-3 py-3 space-y-0.5"
          style={{ borderTop: "1px solid var(--color-sidebar-border)" }}
        >
          {/* Plans */}
          <Link
            href="/planos"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
              isActive("/planos") ? "bg-white/[0.08] text-white" : "hover:bg-white/[0.04]"
            }`}
            style={{ color: isActive("/planos") ? "var(--color-sidebar-text-active)" : "var(--color-sidebar-text)" }}
            title={collapsed ? "Planos & Subscrição" : undefined}
          >
            <span className="flex-shrink-0" style={{ opacity: isActive("/planos") ? 1 : 0.6 }}>{i.plans}</span>
            {!collapsed && <span>Planos & Subscrição</span>}
          </Link>

          {/* Profile (only when collapsed — expanded shows user card at top) */}
          {collapsed && (
            <Link
              href="/perfil"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                isActive("/perfil") ? "bg-white/[0.08] text-white" : "hover:bg-white/[0.04]"
              }`}
              style={{ color: isActive("/perfil") ? "var(--color-sidebar-text-active)" : "var(--color-sidebar-text)" }}
              title="Perfil"
            >
              <span className="flex-shrink-0" style={{ opacity: isActive("/perfil") ? 1 : 0.6 }}>{i.profile}</span>
            </Link>
          )}

          {/* Profile link — when expanded, as small text link */}
          {!collapsed && (
            <Link
              href="/perfil"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                isActive("/perfil") ? "bg-white/[0.08] text-white" : "hover:bg-white/[0.04]"
              }`}
              style={{ color: isActive("/perfil") ? "var(--color-sidebar-text-active)" : "var(--color-sidebar-text)" }}
            >
              <span className="flex-shrink-0" style={{ opacity: isActive("/perfil") ? 1 : 0.6 }}>{i.profile}</span>
              <span>Definições da Conta</span>
            </Link>
          )}

          {/* Logout */}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 hover:bg-red-500/10 group/logout"
            style={{ color: "var(--color-sidebar-text)" }}
            title={collapsed ? "Sair" : undefined}
          >
            <span className="flex-shrink-0 opacity-60 group-hover/logout:opacity-100 group-hover/logout:text-rose-400 transition-all">{i.logout}</span>
            {!collapsed && <span className="group-hover/logout:text-rose-400 transition-colors">Sair</span>}
          </button>

          {/* Collapse toggle (desktop) */}
          <div className="hidden lg:flex items-center justify-center pt-1">
            <button
              onClick={onToggle}
              className="p-2 rounded-lg transition-all duration-200 hover:bg-white/10 w-full flex items-center justify-center"
              style={{ color: "var(--color-sidebar-text)" }}
              title={collapsed ? "Expandir menu" : "Recolher menu"}
            >
              <svg
                className={`w-4 h-4 transition-transform duration-300 opacity-40 hover:opacity-70 ${collapsed ? "rotate-180" : ""}`}
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
