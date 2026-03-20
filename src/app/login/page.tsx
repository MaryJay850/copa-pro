import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import Link from "next/link";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; registered?: string; passwordChanged?: string }> }) {
  const session = await auth();
  const { callbackUrl, registered, passwordChanged } = await searchParams;

  if (session?.user) {
    if ((session.user as any).mustChangePassword) {
      redirect("/alterar-password");
    }
    redirect(callbackUrl || "/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-alt">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-accent/[0.03] pointer-events-none" />

      <div className="relative w-full max-w-sm px-4 animate-fade-in-up">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2C12 2 5 8 5 12s3 8 7 10" />
                <path d="M12 2c0 0 7 6 7 10s-3 8-7 10" />
                <line x1="2" y1="12" x2="22" y2="12" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-text tracking-tight">
              Copa<span className="text-primary">Pro</span>
            </h1>
          </Link>
          <p className="text-sm text-text-muted mt-2">Iniciar sessão</p>
        </div>
        {registered && (
          <div className="bg-success/10 border border-success/20 rounded-xl px-4 py-3 mb-4 text-center">
            <p className="text-sm text-success font-medium">Conta criada com sucesso! Faça login.</p>
          </div>
        )}
        {passwordChanged && (
          <div className="bg-success/10 border border-success/20 rounded-xl px-4 py-3 mb-4 text-center">
            <p className="text-sm text-success font-medium">Palavra-passe alterada com sucesso! Faça login.</p>
          </div>
        )}
        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
