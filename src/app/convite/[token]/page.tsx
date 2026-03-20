export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { getInviteByToken } from "@/lib/actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { InviteAccept } from "./invite-accept";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  if (!invite) notFound();

  const session = await auth();
  const isLoggedIn = !!session?.user?.id;

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-alt">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-accent/[0.03] pointer-events-none" />

      <div className="relative w-full max-w-sm px-4 animate-fade-in-up">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2C12 2 5 8 5 12s3 8 7 10" />
                <path d="M12 2c0 0 7 6 7 10s-3 8-7 10" />
                <line x1="2" y1="12" x2="22" y2="12" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-text tracking-tight">
              Copa<span className="text-primary">Pro</span>
            </h1>
          </Link>
        </div>

        <div className="bg-surface rounded-2xl border border-border shadow-sm p-6 space-y-4">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-text">Convite para Liga</h2>
            <p className="text-sm text-text-muted">
              Foste convidado(a) para a liga
            </p>
            <p className="text-lg font-semibold text-primary">
              {invite.league.name}
            </p>
            {invite.league.location && (
              <p className="text-xs text-text-muted">{invite.league.location}</p>
            )}
          </div>

          {!invite.isValid ? (
            <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-center">
              <p className="text-sm text-danger font-medium">
                Este convite já não é válido.
              </p>
              <p className="text-xs text-danger/80 mt-1">
                O convite pode ter expirado ou sido desativado.
              </p>
            </div>
          ) : isLoggedIn ? (
            <InviteAccept token={token} leagueName={invite.league.name} />
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-text-muted text-center">
                Para aceitar o convite, faz login ou cria uma conta.
              </p>
              <Link
                href={`/login?callbackUrl=/convite/${token}`}
                className="block w-full rounded-xl bg-gradient-to-r from-primary to-primary-light px-4 py-2.5 text-sm font-semibold text-white hover:shadow-md hover:shadow-primary/25 transition-all text-center active:scale-[0.98]"
              >
                Entrar
              </Link>
              <Link
                href={`/registar?callbackUrl=/convite/${token}`}
                className="block w-full rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text hover:bg-surface-hover transition-all text-center"
              >
                Criar Conta
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
