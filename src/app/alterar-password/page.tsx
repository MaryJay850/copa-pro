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
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Copa<span className="text-emerald-600">Pro</span>
            </h1>
          </Link>
          <p className="text-sm text-slate-500 mt-1">Alterar palavra-passe</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-center">
          <p className="text-sm text-amber-700">
            A sua palavra-passe é temporária. Defina uma nova palavra-passe para continuar.
          </p>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
