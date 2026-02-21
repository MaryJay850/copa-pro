"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/actions";
import { sanitizeError } from "@/lib/error-utils";
import Link from "next/link";

const COUNTRY_CODES = [
  { code: "+351", label: "🇵🇹 +351" },
  { code: "+34", label: "🇪🇸 +34" },
  { code: "+55", label: "🇧🇷 +55" },
  { code: "+33", label: "🇫🇷 +33" },
  { code: "+44", label: "🇬🇧 +44" },
  { code: "+49", label: "🇩🇪 +49" },
  { code: "+39", label: "🇮🇹 +39" },
  { code: "+1", label: "🇺🇸 +1" },
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

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Nome completo *
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          placeholder="João Silva"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Alcunha <span className="text-slate-400">(opcional)</span>
        </label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          placeholder="Joãozinho"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Telemóvel *
        </label>
        <div className="flex gap-2">
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-28"
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
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            placeholder="932539702"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          placeholder="email@exemplo.pt"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Palavra-passe *
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          placeholder="Mínimo 6 caracteres"
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
        {loading ? "A criar conta..." : "Criar Conta"}
      </button>
      <p className="text-xs text-slate-500 text-center">
        Já tem conta?{" "}
        <Link
          href={callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login"}
          className="text-emerald-600 hover:underline font-medium"
        >
          Entrar
        </Link>
      </p>
    </form>
  );
}
