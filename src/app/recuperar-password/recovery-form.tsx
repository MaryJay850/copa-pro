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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-center">
          <p className="text-sm text-emerald-700">
            Se o email existir no sistema, receberá uma palavra-passe temporária para aceder à sua conta.
          </p>
        </div>
        <p className="text-xs text-slate-500 text-center">
          Verifique a sua caixa de entrada (e spam).
        </p>
        <div className="text-center">
          <Link href="/login" className="text-sm text-emerald-600 hover:underline font-medium">
            Voltar ao login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4"
    >
      <p className="text-sm text-slate-600">
        Introduza o seu email e receberá uma palavra-passe temporária.
      </p>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          placeholder="email@exemplo.pt"
        />
      </div>
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "A enviar..." : "Recuperar palavra-passe"}
      </button>
      <p className="text-xs text-slate-500 text-center">
        <Link href="/login" className="text-emerald-600 hover:underline font-medium">
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}
