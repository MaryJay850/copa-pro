"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MobileMoreMenu } from "./mobile-more-menu";

const tabs = [
  {
    key: "painel",
    label: "Painel",
    href: "/dashboard",
    match: (p: string) => p === "/dashboard" || p === "/",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    key: "ligas",
    label: "Ligas",
    href: "/ligas",
    match: (p: string) => p.startsWith("/ligas"),
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    key: "torneios",
    label: "Torneios",
    href: "/torneios",
    match: (p: string) => p.startsWith("/torneios"),
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  {
    key: "easymix",
    label: "Easy Mix",
    href: "/easy-mix",
    match: (p: string) => p.startsWith("/easy-mix"),
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    key: "mais",
    label: "Mais",
    href: "#",
    match: (p: string) =>
      p.startsWith("/perfil") ||
      p.startsWith("/planos") ||
      p.startsWith("/gestor") ||
      p.startsWith("/admin") ||
      p.startsWith("/jogadores"),
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export function MobileBottomTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  const activeTab = tabs.find((t) => t.key !== "mais" && t.match(pathname))?.key
    ?? (tabs[4].match(pathname) ? "mais" : "painel");

  const handleTabClick = (tab: typeof tabs[0]) => {
    if (tab.key === "mais") {
      setMoreOpen(true);
    } else {
      setMoreOpen(false);
      router.push(tab.href);
    }
  };

  return (
    <>
      <nav
        className="mobile-only fixed bottom-0 left-0 right-0 z-50"
        style={{
          backgroundColor: "var(--color-surface)",
          borderTop: "1px solid var(--color-border)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex items-stretch h-16">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => handleTabClick(tab)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors duration-200"
                style={{
                  color: isActive ? "var(--color-primary)" : "var(--color-text-muted)",
                }}
              >
                {/* Active dot indicator */}
                {isActive && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-b-full"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  />
                )}
                <span className={`transition-transform duration-200 ${isActive ? "scale-110" : ""}`}>
                  {tab.icon}
                </span>
                <span className="text-[10px] font-semibold leading-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* More menu overlay */}
      <MobileMoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
