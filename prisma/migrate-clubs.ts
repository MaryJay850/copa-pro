/**
 * Migration script: Move courts from tournament-owned to club-owned model.
 *
 * Run after `prisma db push` to migrate existing data:
 *   npx tsx prisma/migrate-clubs.ts
 *
 * What it does:
 * 1. For each league, creates a "Padel Factory Carregado" club
 * 2. Collects all unique courts from tournaments in that league
 * 3. Creates club-level courts with quality (Campo 1-3: GOOD, Campo 4: MEDIUM, Campo 5-6: BAD)
 * 4. Creates TournamentCourt junction records linking tournaments to club courts
 * 5. Updates Match.courtId to point to the new club court
 * 6. Sets Tournament.clubId
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
type CourtQuality = "GOOD" | "MEDIUM" | "BAD";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter } as any);

function inferQuality(name: string): CourtQuality {
  const lower = name.toLowerCase();
  if (lower.includes("5") || lower.includes("6")) return "BAD";
  if (lower.includes("4")) return "MEDIUM";
  return "GOOD";
}

async function main() {
  console.log("Starting club migration...");

  const leagues = await prisma.league.findMany({
    include: {
      tournaments: {
        include: {
          courts: true,
          matches: true,
        },
      },
    },
  });

  for (const league of leagues) {
    console.log(`\nLeague: ${league.name}`);

    // Check if club already exists for this league
    const existingClub = await prisma.club.findFirst({
      where: { leagueId: league.id },
    });

    if (existingClub) {
      console.log(`  Club already exists: ${existingClub.name} — skipping`);
      continue;
    }

    // Create club
    const club = await prisma.club.create({
      data: {
        leagueId: league.id,
        name: "Padel Factory Carregado",
      },
    });
    console.log(`  Created club: ${club.name} (${club.id})`);

    // Collect all unique court names across tournaments
    const courtNameSet = new Map<string, { quality: CourtQuality; orderIndex: number }>();
    let idx = 0;
    for (const tournament of league.tournaments) {
      for (const court of tournament.courts) {
        if (!courtNameSet.has(court.name)) {
          courtNameSet.set(court.name, {
            quality: inferQuality(court.name),
            orderIndex: idx++,
          });
        }
      }
    }

    // Create club-level courts
    const clubCourts = new Map<string, string>(); // name -> clubCourtId
    for (const [name, meta] of courtNameSet) {
      const clubCourt = await prisma.court.create({
        data: {
          clubId: club.id,
          name,
          quality: meta.quality,
          orderIndex: meta.orderIndex,
          isAvailable: true,
        },
      });
      clubCourts.set(name, clubCourt.id);
      console.log(`  Created court: ${name} (${meta.quality})`);
    }

    // For each tournament, create TournamentCourt junctions and update matches
    for (const tournament of league.tournaments) {
      // Set clubId on tournament
      await prisma.tournament.update({
        where: { id: tournament.id },
        data: { clubId: club.id },
      });

      for (const oldCourt of tournament.courts) {
        const newCourtId = clubCourts.get(oldCourt.name);
        if (!newCourtId) continue;

        // Create TournamentCourt junction
        await prisma.tournamentCourt.upsert({
          where: {
            tournamentId_courtId: {
              tournamentId: tournament.id,
              courtId: newCourtId,
            },
          },
          update: {},
          create: {
            tournamentId: tournament.id,
            courtId: newCourtId,
          },
        });

        // Update matches to point to new court
        await prisma.match.updateMany({
          where: {
            tournamentId: tournament.id,
            courtId: oldCourt.id,
          },
          data: {
            courtId: newCourtId,
          },
        });
      }

      // Update courtsCount to match tournamentCourts
      const tcCount = await prisma.tournamentCourt.count({
        where: { tournamentId: tournament.id },
      });
      await prisma.tournament.update({
        where: { id: tournament.id },
        data: { courtsCount: tcCount },
      });

      console.log(`  Migrated tournament: ${tournament.name} (${tournament.courts.length} courts)`);
    }

    // Delete old tournament-owned courts (now orphaned)
    for (const tournament of league.tournaments) {
      for (const oldCourt of tournament.courts) {
        // Only delete if it's the old tournament-owned court (has tournamentId, no clubId)
        try {
          await prisma.court.delete({ where: { id: oldCourt.id } });
        } catch {
          // May fail if already deleted or has references — skip
        }
      }
    }
  }

  console.log("\nMigration complete!");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
