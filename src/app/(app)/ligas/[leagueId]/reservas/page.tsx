import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { ReservationCalendar } from "./reservation-calendar";

export const dynamic = "force-dynamic";

export default async function ReservasPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  // Fetch league with clubs and courts
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      leagueClubs: {
        include: {
          club: {
            include: {
              courts: { where: { isAvailable: true }, orderBy: { orderIndex: "asc" } }
            }
          }
        }
      }
    }
  });
  if (!league) notFound();

  // Check manager
  const isManager = await prisma.leagueManager.findFirst({
    where: { leagueId, userId: session.user.id }
  }) !== null || session.user.role === "ADMINISTRADOR";

  const courts = league.leagueClubs.flatMap(lc => lc.club.courts.map(c => ({
    ...c, clubName: lc.club.name
  })));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reservas de Campos</h1>
        <p className="text-sm text-text-muted mt-1">{league.name} — Gerir reservas de campos</p>
      </div>
      <ReservationCalendar
        leagueId={leagueId}
        courts={JSON.parse(JSON.stringify(courts))}
        canManage={isManager}
      />
    </div>
  );
}
