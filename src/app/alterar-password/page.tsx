import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!(session.user as any).mustChangePassword) {
    redirect("/dashboard");
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
          <p className="text-sm text-text-muted mt-2">Alterar palavra-passe</p>
        </div>
        <div className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-3 mb-4 text-center">
          <p className="text-sm text-accent font-medium">
            A sua palavra-passe é temporária. Defina uma nova palavra-passe para continuar.
          </p>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
