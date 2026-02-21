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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-text-muted mb-1">
          <Link href="/dashboard" className="hover:text-text">
            Painel
          </Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-bold">O Meu Perfil</h1>
        <p className="text-sm text-text-muted mt-1">
          Gerir os seus dados pessoais e palavra-passe.
        </p>
      </div>

      <ProfileForm profile={profile} />
    </div>
  );
}
