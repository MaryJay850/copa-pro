"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";

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
      <AppSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      {/* Main content area */}
      <div
        className={`transition-all duration-300 ${
          mounted && !sidebarCollapsed
            ? "lg:ml-[var(--sidebar-width)]"
            : "lg:ml-[var(--sidebar-collapsed-width)]"
        }`}
      >
        <AppTopbar onMenuToggle={toggleSidebar} />
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
