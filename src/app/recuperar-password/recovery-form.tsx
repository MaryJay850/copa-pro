"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordRecovery } from "@/lib/actions";
import { sanitizeError } from "@/lib/error-utils";

export function RecoveryForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await requestPasswordRecovery(email);
      setSent(true);
    } catch (err) {
      setError(sanitizeError(err, "Erro ao processar o pedido."));
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="bg-surface rounded-2xl border border-border shadow-sm p-6 space-y-4">
        <div className="bg-success/10 border border-success/20 rounded-xl px-4 py-3 text-center">
          <p className="text-sm text-success font-medium">
            Se o email existir no sistema, receberá uma palavra-passe temporária para aceder à sua conta.
          </p>
        </div>
        <p className="text-xs text-text-muted text-center">
          Verifique a sua caixa de entrada (e spam).
        </p>
        <div className="text-center">
          <Link href="/login" className="text-sm text-primary hover:underline font-medium">
            Voltar ao login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface rounded-2xl border border-border shadow-sm p-6 space-y-4"
    >
      <p className="text-sm text-text-muted">
        Introduza o seu email e receberá uma palavra-passe temporária.
      </p>
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
        {loading ? "A enviar..." : "Recuperar palavra-passe"}
      </button>
      <p className="text-xs text-text-muted text-center">
        <Link href="/login" className="text-primary hover:underline font-medium">
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}
