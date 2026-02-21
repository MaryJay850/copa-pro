import Link from "next/link";
import { RecoveryForm } from "./recovery-form";

export default function RecoverPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Copa<span className="text-emerald-600">Pro</span>
            </h1>
          </Link>
          <p className="text-sm text-slate-500 mt-1">Recuperar palavra-passe</p>
        </div>
        <RecoveryForm />
      </div>
    </div>
  );
}
