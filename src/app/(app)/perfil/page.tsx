export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserProfileData } from "@/lib/actions";
import { ProfileContent } from "./profile-content";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const profile = await getUserProfileData();

  return <ProfileContent profile={profile} />;
}
