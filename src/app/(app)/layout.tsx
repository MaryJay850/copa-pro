import { AuthNav } from "@/components/auth-nav";
import { DarkModeToggle } from "@/components/dark-mode-toggle";
import { NotificationBell } from "@/components/notification-bell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface-alt text-text min-h-screen">
      <header className="bg-surface border-b border-border sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-primary tracking-tight">
            Copa<span className="text-emerald-600">Pro</span>
          </a>
          <nav className="flex items-center gap-4 text-sm">
            <a href="/dashboard" className="text-text-muted hover:text-text transition-colors">
              Painel
            </a>
            <a href="/ligas" className="text-text-muted hover:text-text transition-colors">
              Ligas
            </a>
            <a href="/gestor" className="text-text-muted hover:text-text transition-colors">
              Gestao
            </a>
            <NotificationBell />
            <DarkModeToggle />
            <AuthNav />
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
