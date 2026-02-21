import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RegisterForm } from "./register-form";
import Link from "next/link";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const session = await auth();
  const { callbackUrl } = await searchParams;

  if (session?.user) {
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
          <p className="text-sm text-slate-500 mt-1">Criar conta</p>
        </div>
        <RegisterForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
