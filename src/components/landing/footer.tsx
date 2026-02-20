export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold text-slate-900 tracking-tight">
              Copa<span className="text-emerald-600">Pro</span>
            </span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-slate-800 transition-colors">
              Sobre
            </a>
            <a href="#" className="hover:text-slate-800 transition-colors">
              Contacto
            </a>
            <a href="#" className="hover:text-slate-800 transition-colors">
              Termos
            </a>
            <a href="#" className="hover:text-slate-800 transition-colors">
              Política de Privacidade
            </a>
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-400">
            &copy; {year} CopaPro. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
