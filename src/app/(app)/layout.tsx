"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { MobileBottomTabs } from "@/components/mobile-bottom-tabs";
import { MobileHeader } from "@/components/mobile-header";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // collapsed on mobile by default
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // On desktop, start expanded
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    setSidebarCollapsed(!isDesktop);
  }, []);

  const toggleSidebar = () => setSidebarCollapsed(prev => !prev);

  return (
    <div className="min-h-screen bg-surface-alt text-text">
      {/* Desktop sidebar — hidden on mobile */}
      <AppSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      {/* Mobile header — hidden on desktop */}
      <MobileHeader />

      {/* Main content area */}
      <div
        className={`transition-all duration-300 ${
          mounted && !sidebarCollapsed
            ? "lg:ml-[var(--sidebar-width)]"
            : "lg:ml-[var(--sidebar-collapsed-width)]"
        }`}
      >
        {/* Desktop topbar — hidden on mobile */}
        <AppTopbar onMenuToggle={toggleSidebar} />
        <main className="p-4 lg:p-8 pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar — hidden on desktop */}
      <MobileBottomTabs />
    </div>
  );
}
