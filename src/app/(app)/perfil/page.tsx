export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserProfileData } from "@/lib/actions";
import { ProfileForm } from "./profile-form";
import Link from "next/link";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const profile = await getUserProfileData();

  const initials = session.user.name
    ? session.user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : session.user.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in-up">
      <div>
        <div className="flex items-center gap-2 text-sm text-text-muted mb-2 font-medium">
          <Link href="/dashboard" className="hover:text-primary transition-colors">Painel</Link>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </div>

        {/* Profile header with avatar */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="text-2xl font-extrabold text-white">{initials}</span>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">O Meu Perfil</h1>
            <p className="text-sm text-text-muted font-medium mt-0.5">
              Gerir os seus dados pessoais e palavra-passe.
            </p>
          </div>
        </div>
      </div>

      <ProfileForm profile={profile} />
    </div>
  );
}
