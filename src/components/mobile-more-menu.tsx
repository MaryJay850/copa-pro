"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

interface MenuItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}

interface MenuSection {
  title?: string;
  items: MenuItem[];
}

/* ── Icons ── */
const icons = {
  profile: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  notifications: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
  plans: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  management: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  shield: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  leagues: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  clubs: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  analytics: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  pricing: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  audit: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  config: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  logout: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  ),
};

export function MobileMoreMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const role = (session?.user as any)?.role ?? "JOGADOR";
  const playerId = (session?.user as any)?.playerId;
  const isAdmin = role === "ADMINISTRADOR";
  const isManager = role === "GESTOR" || isAdmin;
  const displayName = (session?.user as any)?.playerName || session?.user?.email?.split("@")[0] || "Utilizador";

  // Lock body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.classList.add("mobile-menu-open");
    } else {
      document.body.classList.remove("mobile-menu-open");
    }
    return () => document.body.classList.remove("mobile-menu-open");
  }, [open]);

  // Close on route change
  useEffect(() => {
    onClose();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigate = (href: string) => {
    router.push(href);
    onClose();
  };

  /* ── Build menu sections ── */
  const sections: MenuSection[] = [];

  // Personal
  sections.push({
    items: [
      ...(playerId
        ? [{ label: "O Meu Perfil", href: `/jogadores/${playerId}`, icon: icons.profile }]
        : []),
      { label: "Planos & Subscricao", href: "/planos", icon: icons.plans },
      { label: "Definicoes da Conta", href: "/perfil", icon: icons.settings },
    ],
  });

  // Management
  if (isManager) {
    sections.push({
      title: "Gestao",
      items: [
        { label: "Painel de Gestao", href: "/gestor", icon: icons.management },
      ],
    });
  }

  // Admin
  if (isAdmin) {
    sections.push({
      title: "Administracao",
      items: [
        { label: "Visao Geral", href: "/admin", icon: icons.shield },
        { label: "Utilizadores", href: "/admin/utilizadores", icon: icons.users },
        { label: "Ligas", href: "/admin/ligas", icon: icons.leagues },
        { label: "Clubes", href: "/admin/clubes", icon: icons.clubs },
        { label: "Analytics", href: "/admin/analytics", icon: icons.analytics },
        { label: "Planos & Precos", href: "/admin/planos", icon: icons.pricing },
        { label: "Auditoria", href: "/admin/auditoria", icon: icons.audit },
        { label: "Configuracoes", href: "/admin/configuracoes", icon: icons.config },
      ],
    });
  }

  // Logout
  sections.push({
    items: [
      {
        label: "Sair",
        icon: icons.logout,
        danger: true,
        onClick: () => signOut({ callbackUrl: "/" }),
      },
    ],
  });

  if (!open) return null;

  return (
    <div className="mobile-only fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        style={{ animation: "mobileMenuFadeIn 0.2s ease-out" }}
      />

      {/* Bottom sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl"
        style={{
          backgroundColor: "var(--color-surface)",
          paddingBottom: "env(safe-area-inset-bottom, 16px)",
          animation: "mobileMenuSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div
            className="w-10 h-1 rounded-full"
            style={{ backgroundColor: "var(--color-border)" }}
          />
        </div>

        {/* User info */}
        <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <span
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold uppercase"
            style={{
              background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
              color: "white",
            }}
          >
            {displayName.charAt(0)}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text truncate">{displayName}</p>
            <p className="text-xs text-text-muted capitalize">{role.toLowerCase()}</p>
          </div>
        </div>

        {/* Menu sections */}
        <div className="py-2">
          {sections.map((section, sIdx) => (
            <div key={sIdx}>
              {section.title && (
                <div className="px-5 pt-3 pb-1">
                  <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-text-muted">
                    {section.title}
                  </span>
                </div>
              )}
              {sIdx > 0 && !section.title && (
                <div className="mx-5 my-1" style={{ borderTop: "1px solid var(--color-border)" }} />
              )}
              {section.items.map((item, iIdx) => {
                const isActive = item.href && (pathname === item.href || pathname.startsWith(item.href + "/"));

                return (
                  <button
                    key={iIdx}
                    onClick={() => {
                      if (item.onClick) {
                        item.onClick();
                      } else if (item.href) {
                        navigate(item.href);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
                      item.danger
                        ? "text-danger hover:bg-danger/5"
                        : isActive
                        ? "text-primary bg-primary/5"
                        : "text-text hover:bg-surface-hover"
                    }`}
                  >
                    <span className={`flex-shrink-0 ${item.danger ? "text-danger" : isActive ? "text-primary" : "text-text-muted"}`}>
                      {item.icon}
                    </span>
                    <span className="text-[14px] font-medium">{item.label}</span>
                    {isActive && (
                      <span
                        className="ml-auto w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: "var(--color-primary)" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
