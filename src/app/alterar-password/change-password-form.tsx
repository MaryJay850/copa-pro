"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { changePassword } from "@/lib/actions";
import { sanitizeError } from "@/lib/error-utils";

export function ChangePasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("A palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("As palavras-passe não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("newPassword", newPassword);
      await changePassword(formData);

      // Sign out so user logs in with new password
      await signOut({ redirect: false });
      router.push("/login?passwordChanged=true");
    } catch (err) {
      setError(sanitizeError(err, "Erro ao alterar palavra-passe."));
    }
    setLoading(false);
  };

  const inputClass = "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-primary/30 transition-colors";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface rounded-2xl border border-border shadow-sm p-6 space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-text mb-1">
          Nova palavra-passe
        </label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={6}
          className={inputClass}
          placeholder="Mínimo 6 caracteres"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text mb-1">
          Confirmar palavra-passe
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          className={inputClass}
          placeholder="Repita a palavra-passe"
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
        {loading ? "A guardar..." : "Definir nova palavra-passe"}
      </button>
    </form>
  );
}
