export const dynamic = "force-dynamic";

import { getEasyMix } from "@/lib/actions";
import { notFound } from "next/navigation";
import { EasyMixView } from "./easy-mix-view";

export default async function EasyMixPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tournament = await getEasyMix(slug);

  if (!tournament) notFound();

  return <EasyMixView tournament={tournament} />;
}
