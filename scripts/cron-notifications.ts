/**
 * Cron Notifications Script
 * Runs daily at 8:00 AM (Europe/Lisbon) via crond.
 *
 * Notification 3: 24h before tournament → email to league managers + admins
 * Notification 4: Day of tournament → email to all confirmed players
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { sendEmail } from "../src/lib/email";
import {
  tournamentReminderManagerEmail,
  tournamentDayPlayerEmail,
} from "../src/lib/email-templates";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * Notification 3: 24h before tournament
 * Sends tournament reminder to league managers and admin users.
 */
async function notifyManagersTournamentTomorrow() {
  const now = new Date();
  const tomorrow = startOfDay(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  const dayAfter = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);

  // Find tournaments starting tomorrow that are still active (DRAFT or RUNNING)
  const tournaments = await prisma.tournament.findMany({
    where: {
      startDate: { gte: tomorrow, lt: dayAfter },
      status: { in: ["DRAFT", "RUNNING"] },
    },
    include: {
      league: {
        include: {
          managers: { include: { user: { select: { email: true } } } },
        },
      },
      inscriptions: {
        orderBy: { orderIndex: "asc" },
        include: { player: { select: { fullName: true } } },
      },
    },
  });

  console.log(`[CRON] Tournaments starting tomorrow: ${tournaments.length}`);

  for (const t of tournaments) {
    // Collect manager emails
    const managerEmails = t.league.managers
      .map((m) => m.user.email)
      .filter(Boolean);

    // Also get admin users
    const admins = await prisma.user.findMany({
      where: { role: "ADMINISTRADOR" },
      select: { email: true },
    });
    const adminEmails = admins.map((a) => a.email).filter(Boolean);

    const allRecipients = [...new Set([...managerEmails, ...adminEmails])];

    if (allRecipients.length === 0) {
      console.log(`[CRON] No recipients for tournament ${t.name}, skipping`);
      continue;
    }

    const inscriptions = t.inscriptions.map((ins) => ({
      playerName: ins.player.fullName,
      status: ins.status,
    }));

    for (const email of allRecipients) {
      try {
        await sendEmail({
          to: email,
          subject: `Lembrete: ${t.name} é amanhã!`,
          html: tournamentReminderManagerEmail({
            tournamentName: t.name,
            leagueName: t.league.name,
            startDate: formatDate(t.startDate!),
            inscriptions,
          }),
        });
      } catch (err) {
        console.error(`[CRON] Error sending reminder to ${email}:`, err);
      }
    }

    console.log(
      `[CRON] Sent tournament reminder for "${t.name}" to ${allRecipients.length} recipients`
    );
  }
}

/**
 * Notification 4: Day of tournament
 * Sends detailed match schedule to all confirmed players.
 */
async function notifyPlayersTournamentToday() {
  const today = startOfDay(new Date());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  // Find tournaments happening today
  const tournaments = await prisma.tournament.findMany({
    where: {
      startDate: { gte: today, lt: tomorrow },
      status: { in: ["RUNNING"] },
    },
    include: {
      league: { select: { name: true } },
      teams: {
        include: {
          player1: { include: { user: { select: { email: true } } } },
          player2: { include: { user: { select: { email: true } } } },
        },
      },
      rounds: { orderBy: { index: "asc" } },
      matches: {
        include: {
          round: { select: { index: true } },
          court: { select: { name: true } },
          teamA: { select: { id: true, name: true } },
          teamB: { select: { id: true, name: true } },
        },
      },
      inscriptions: {
        where: { status: { in: ["TITULAR", "PROMOVIDO"] } },
        include: {
          player: { include: { user: { select: { email: true } } } },
        },
      },
    },
  });

  console.log(`[CRON] Tournaments today: ${tournaments.length}`);

  for (const t of tournaments) {
    // Build a map: playerId → { teamName, partnerName, rounds[] }
    const playerTeamMap = new Map<
      string,
      {
        teamId: string;
        teamName: string;
        partnerName: string | null;
        email: string | null;
        playerName: string;
      }
    >();

    for (const team of t.teams) {
      const p1Email = team.player1?.user?.email || null;
      const p2Email = team.player2?.user?.email || null;
      const p1Name = team.player1?.fullName || "?";
      const p2Name = team.player2?.fullName || null;

      playerTeamMap.set(team.player1Id, {
        teamId: team.id,
        teamName: team.name,
        partnerName: p2Name,
        email: p1Email,
        playerName: p1Name,
      });

      if (team.player2Id) {
        playerTeamMap.set(team.player2Id, {
          teamId: team.id,
          teamName: team.name,
          partnerName: p1Name,
          email: p2Email,
          playerName: p2Name || "?",
        });
      }
    }

    // Build rounds per team
    const teamRoundsMap = new Map<
      string,
      { roundIndex: number; opponent: string; courtName: string }[]
    >();
    for (const m of t.matches) {
      const roundIndex = m.round.index;
      const courtName = m.court?.name || "TBD";

      // For teamA
      if (!teamRoundsMap.has(m.teamAId)) teamRoundsMap.set(m.teamAId, []);
      teamRoundsMap.get(m.teamAId)!.push({
        roundIndex,
        opponent: m.teamB.name,
        courtName,
      });

      // For teamB
      if (!teamRoundsMap.has(m.teamBId)) teamRoundsMap.set(m.teamBId, []);
      teamRoundsMap.get(m.teamBId)!.push({
        roundIndex,
        opponent: m.teamA.name,
        courtName,
      });
    }

    // Send email to each confirmed player
    for (const ins of t.inscriptions) {
      const pInfo = playerTeamMap.get(ins.playerId);
      const email = ins.player?.user?.email;

      if (!email || !pInfo) continue;

      const rounds = (teamRoundsMap.get(pInfo.teamId) || []).sort(
        (a, b) => a.roundIndex - b.roundIndex
      );

      try {
        await sendEmail({
          to: email,
          subject: `Hoje é dia de torneio: ${t.name}!`,
          html: tournamentDayPlayerEmail({
            playerName: pInfo.playerName,
            tournamentName: t.name,
            leagueName: t.league.name,
            teamName: pInfo.teamName,
            teamPartner: pInfo.partnerName,
            rounds,
          }),
        });
      } catch (err) {
        console.error(`[CRON] Error sending day-of email to ${email}:`, err);
      }
    }

    console.log(
      `[CRON] Sent day-of emails for "${t.name}" to ${t.inscriptions.length} players`
    );
  }
}

// ── Main ──
async function main() {
  console.log(`[CRON] Starting notifications at ${new Date().toISOString()}`);

  await notifyManagersTournamentTomorrow();
  await notifyPlayersTournamentToday();

  console.log(`[CRON] Notifications complete at ${new Date().toISOString()}`);
}

main()
  .catch((e) => {
    console.error("[CRON] Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
