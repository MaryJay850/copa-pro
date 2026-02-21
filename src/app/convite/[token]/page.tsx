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
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Copa<span className="text-emerald-600">Pro</span>
            </h1>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900">Convite para Liga</h2>
            <p className="text-sm text-slate-600">
              Foste convidado(a) para a liga
            </p>
            <p className="text-lg font-semibold text-emerald-700">
              {invite.league.name}
            </p>
            {invite.league.location && (
              <p className="text-xs text-slate-500">{invite.league.location}</p>
            )}
          </div>

          {!invite.isValid ? (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-center">
              <p className="text-sm text-red-700 font-medium">
                Este convite já não é válido.
              </p>
              <p className="text-xs text-red-600 mt-1">
                O convite pode ter expirado ou sido desativado.
              </p>
            </div>
          ) : isLoggedIn ? (
            <InviteAccept token={token} leagueName={invite.league.name} />
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 text-center">
                Para aceitar o convite, faz login ou cria uma conta.
              </p>
              <Link
                href={`/login?callbackUrl=/convite/${token}`}
                className="block w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors text-center"
              >
                Entrar
              </Link>
              <Link
                href={`/registar?callbackUrl=/convite/${token}`}
                className="block w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-center"
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
