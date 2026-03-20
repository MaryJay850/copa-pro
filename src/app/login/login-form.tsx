"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Email ou palavra-passe incorretos.");
    } else {
      // Check if user must change password
      try {
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();
        if (sessionData?.user?.mustChangePassword) {
          router.push("/alterar-password");
          router.refresh();
          setLoading(false);
          return;
        }
      } catch {
        // If session check fails, proceed normally
      }
      router.push(callbackUrl || "/dashboard");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface rounded-2xl border border-border shadow-sm p-6 space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-text mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-primary/30 transition-colors"
          placeholder="email@exemplo.pt"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text mb-1">
          Palavra-passe
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-primary/30 transition-colors"
          placeholder="••••••••"
        />
        <div className="text-right mt-1">
          <Link href="/recuperar-password" className="text-xs text-primary hover:underline font-medium">
            Esqueceu a palavra-passe?
          </Link>
        </div>
      </div>
      {error && (
        <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl px-3 py-2">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-light px-4 py-2.5 text-sm font-semibold text-white hover:shadow-md hover:shadow-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
      >
        {loading ? "A entrar..." : "Entrar"}
      </button>
      <p className="text-xs text-text-muted text-center">
        Não tem conta?{" "}
        <Link
          href={callbackUrl ? `/registar?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/registar"}
          className="text-primary hover:underline font-medium"
        >
          Criar conta
        </Link>
      </p>
    </form>
  );
}
