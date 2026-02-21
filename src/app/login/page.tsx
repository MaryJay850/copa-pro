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
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Copa<span className="text-emerald-600">Pro</span>
            </h1>
          </Link>
          <p className="text-sm text-slate-500 mt-1">Iniciar sessão</p>
        </div>
        {registered && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-4 text-center">
            <p className="text-sm text-emerald-700">Conta criada com sucesso! Faça login.</p>
          </div>
        )}
        {passwordChanged && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-4 text-center">
            <p className="text-sm text-emerald-700">Palavra-passe alterada com sucesso! Faça login.</p>
          </div>
        )}
        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
