export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-surface-alt border-t border-border">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary-light flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2C12 2 5 8 5 12s3 8 7 10" />
                <path d="M12 2c0 0 7 6 7 10s-3 8-7 10" />
                <line x1="2" y1="12" x2="22" y2="12" />
              </svg>
            </div>
            <span className="text-lg font-extrabold text-text tracking-tight">
              Copa<span className="text-primary">Pro</span>
            </span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 text-sm text-text-muted">
            <a href="#" className="hover:text-text transition-colors">
              Sobre
            </a>
            <a href="#" className="hover:text-text transition-colors">
              Contacto
            </a>
            <a href="#" className="hover:text-text transition-colors">
              Termos
            </a>
            <a href="#" className="hover:text-text transition-colors">
              Política de Privacidade
            </a>
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-xs text-text-muted">
            &copy; {year} CopaPro. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
