"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptLeagueInvite } from "@/lib/actions";

export function InviteAccept({ token, leagueName }: { token: string; leagueName: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleAccept = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await acceptLeagueInvite(token);

      if (result.alreadyMember) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/ligas/${result.leagueId}`);
        }, 1500);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/ligas/${result.leagueId}`);
      }, 1500);
    } catch (e) {
      setError((e as Error).message || "Erro ao aceitar convite.");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-center">
        <p className="text-sm text-emerald-700 font-medium">
          ✓ Juntaste-te à liga {leagueName}!
        </p>
        <p className="text-xs text-emerald-600 mt-1">
          A redirecionar...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
          {error}
        </p>
      )}
      <button
        onClick={handleAccept}
        disabled={loading}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "A aceitar..." : "Aceitar Convite"}
      </button>
    </div>
  );
}
