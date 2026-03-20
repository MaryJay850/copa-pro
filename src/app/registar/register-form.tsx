"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/actions";
import { sanitizeError } from "@/lib/error-utils";
import Link from "next/link";

const COUNTRY_CODES = [
  { code: "+351", label: "\u{1F1F5}\u{1F1F9} +351" },
  { code: "+34", label: "\u{1F1EA}\u{1F1F8} +34" },
  { code: "+55", label: "\u{1F1E7}\u{1F1F7} +55" },
  { code: "+33", label: "\u{1F1EB}\u{1F1F7} +33" },
  { code: "+44", label: "\u{1F1EC}\u{1F1E7} +44" },
  { code: "+49", label: "\u{1F1E9}\u{1F1EA} +49" },
  { code: "+39", label: "\u{1F1EE}\u{1F1F9} +39" },
  { code: "+1", label: "\u{1F1FA}\u{1F1F8} +1" },
];

export function RegisterForm({ callbackUrl }: { callbackUrl?: string }) {
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [countryCode, setCountryCode] = useState("+351");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("fullName", fullName.trim());
      formData.set("nickname", nickname.trim());
      formData.set("phone", `${countryCode} ${phoneNumber.trim()}`);
      formData.set("email", email.trim());
      formData.set("password", password);

      await registerUser(formData);

      const loginRedirect = callbackUrl
        ? `/login?registered=true&callbackUrl=${encodeURIComponent(callbackUrl)}`
        : "/login?registered=true";
      router.push(loginRedirect);
    } catch (e) {
      setError(sanitizeError(e, "Erro ao criar conta. Tente novamente."));
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
          Nome completo *
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className={inputClass}
          placeholder="João Silva"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text mb-1">
          Alcunha <span className="text-text-muted">(opcional)</span>
        </label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className={inputClass}
          placeholder="Joãozinho"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text mb-1">
          Telemóvel *
        </label>
        <div className="flex gap-2">
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="rounded-xl border border-border bg-surface px-2 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-primary/30 transition-colors w-28"
          >
            {COUNTRY_CODES.map((cc) => (
              <option key={cc.code} value={cc.code}>
                {cc.label}
              </option>
            ))}
          </select>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ""))}
            required
            className={`flex-1 ${inputClass.replace("w-full ", "")}`}
            placeholder="932539702"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-text mb-1">Email *</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={inputClass}
          placeholder="email@exemplo.pt"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text mb-1">
          Palavra-passe *
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className={inputClass}
          placeholder="Mínimo 6 caracteres"
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
        {loading ? "A criar conta..." : "Criar Conta"}
      </button>
      <p className="text-xs text-text-muted text-center">
        Já tem conta?{" "}
        <Link
          href={callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login"}
          className="text-primary hover:underline font-medium"
        >
          Entrar
        </Link>
      </p>
    </form>
  );
}
