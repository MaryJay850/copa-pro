"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptLeagueInvite } from "@/lib/actions";
import { sanitizeError } from "@/lib/error-utils";

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
      setError(sanitizeError(e, "Erro ao aceitar convite."));
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="bg-success/10 border border-success/20 rounded-xl px-4 py-3 text-center animate-fade-in-up">
        <p className="text-sm text-success font-medium">
          Juntaste-te à liga {leagueName}!
        </p>
        <p className="text-xs text-success/80 mt-1">
          A redirecionar...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl px-3 py-2 text-center">
          {error}
        </p>
      )}
      <button
        onClick={handleAccept}
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-light px-4 py-2.5 text-sm font-semibold text-white hover:shadow-md hover:shadow-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
      >
        {loading ? "A aceitar..." : "Aceitar Convite"}
      </button>
    </div>
  );
}
