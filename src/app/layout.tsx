import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CopaPro - Gestão de Ligas de Padel",
  description: "Crie e gira torneios de padel com Round Robin, equipas de 2 e rankings individuais por época.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <body className="bg-surface-alt text-text min-h-screen antialiased">
        <header className="bg-surface border-b border-border sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/ligas" className="text-xl font-bold text-primary tracking-tight">
              CopaPro
            </a>
            <nav className="flex items-center gap-4 text-sm">
              <a href="/ligas" className="text-text-muted hover:text-text transition-colors">
                Ligas
              </a>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
