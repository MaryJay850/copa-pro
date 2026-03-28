import { redirect } from "next/navigation";

export default async function EditLeagueRedirect({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params;
  redirect(`/ligas/${leagueId}?modo=editar`);
}
