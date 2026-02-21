import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL!;
console.log("Connecting to:", connectionString.replace(/\/\/.*@/, "//***@"));
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Safety check: skip seed if real data already exists
  const existingLeagues = await prisma.league.count();
  if (existingLeagues > 0) {
    console.log(`Database already has ${existingLeagues} league(s). Skipping seed to protect existing data.`);
    console.log("To force re-seed, manually delete all data first.");
    return;
  }

  console.log("Empty database detected, seeding with test data...");

  // Create League
  const league = await prisma.league.create({
    data: { name: "Liga Padel Lisboa", location: "Lisboa, Portugal" },
  });
  console.log("Created league:", league.name);

  // Create Season
  const season = await prisma.season.create({
    data: {
      leagueId: league.id,
      name: "Epoca 2026",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      isActive: true,
      allowDraws: false,
    },
  });
  console.log("Created season:", season.name);

  // Create Players in batch
  const playerNames = [
    "Joao Silva", "Miguel Costa", "Andre Santos", "Ricardo Ferreira",
    "Pedro Almeida", "Tiago Rodrigues", "Bruno Martins", "Diogo Pereira",
  ];
  const players = [];
  for (const name of playerNames) {
    const p = await prisma.player.create({ data: { fullName: name } });
    players.push(p);
  }
  console.log("Created", players.length, "players");

  // Create Tournament 1
  const t1 = await prisma.tournament.create({
    data: {
      leagueId: league.id, seasonId: season.id,
      name: "Torneio Janeiro", startDate: new Date("2026-01-15"),
      format: "ROUND_ROBIN", teamMode: "FIXED_TEAMS",
      teamSize: 2, courtsCount: 2, matchesPerPair: 1, status: "RUNNING",
    },
  });

  // Create courts
  const c1 = await prisma.court.create({ data: { tournamentId: t1.id, name: "Campo 1" } });
  const c2 = await prisma.court.create({ data: { tournamentId: t1.id, name: "Campo 2" } });

  // Create teams
  const teamA = await prisma.team.create({ data: { tournamentId: t1.id, name: "Equipa A", player1Id: players[0].id, player2Id: players[1].id, isRandomGenerated: false } });
  const teamB = await prisma.team.create({ data: { tournamentId: t1.id, name: "Equipa B", player1Id: players[2].id, player2Id: players[3].id, isRandomGenerated: false } });
  const teamC = await prisma.team.create({ data: { tournamentId: t1.id, name: "Equipa C", player1Id: players[4].id, player2Id: players[5].id, isRandomGenerated: false } });
  const teamD = await prisma.team.create({ data: { tournamentId: t1.id, name: "Equipa D", player1Id: players[6].id, player2Id: players[7].id, isRandomGenerated: false } });
  console.log("Created 4 teams");

  // Create rounds
  const r1 = await prisma.round.create({ data: { tournamentId: t1.id, index: 1 } });
  const r2 = await prisma.round.create({ data: { tournamentId: t1.id, index: 2 } });
  const r3 = await prisma.round.create({ data: { tournamentId: t1.id, index: 3 } });

  // Create matches - Round 1 (with results)
  await prisma.match.create({ data: { tournamentId: t1.id, roundId: r1.id, courtId: c1.id, slotIndex: 0, teamAId: teamA.id, teamBId: teamD.id, set1A: 6, set1B: 3, set2A: 6, set2B: 4, status: "FINISHED", resultType: "WIN_A", winnerTeamId: teamA.id } });
  await prisma.match.create({ data: { tournamentId: t1.id, roundId: r1.id, courtId: c2.id, slotIndex: 1, teamAId: teamB.id, teamBId: teamC.id, set1A: 4, set1B: 6, set2A: 6, set2B: 3, set3A: 6, set3B: 4, status: "FINISHED", resultType: "WIN_A", winnerTeamId: teamB.id } });

  // Round 2 (with results)
  await prisma.match.create({ data: { tournamentId: t1.id, roundId: r2.id, courtId: c1.id, slotIndex: 0, teamAId: teamA.id, teamBId: teamC.id, set1A: 3, set1B: 6, set2A: 2, set2B: 6, status: "FINISHED", resultType: "WIN_B", winnerTeamId: teamC.id } });
  await prisma.match.create({ data: { tournamentId: t1.id, roundId: r2.id, courtId: c2.id, slotIndex: 1, teamAId: teamB.id, teamBId: teamD.id, set1A: 6, set1B: 2, set2A: 6, set2B: 1, status: "FINISHED", resultType: "WIN_A", winnerTeamId: teamB.id } });

  // Round 3 (scheduled, no results)
  await prisma.match.create({ data: { tournamentId: t1.id, roundId: r3.id, courtId: c1.id, slotIndex: 0, teamAId: teamA.id, teamBId: teamB.id, status: "SCHEDULED", resultType: "UNDECIDED" } });
  await prisma.match.create({ data: { tournamentId: t1.id, roundId: r3.id, courtId: c2.id, slotIndex: 1, teamAId: teamC.id, teamBId: teamD.id, status: "SCHEDULED", resultType: "UNDECIDED" } });
  console.log("Created tournament 1 with 3 rounds, 6 matches");

  // Tournament 2 (Draft)
  await prisma.tournament.create({
    data: {
      leagueId: league.id, seasonId: season.id,
      name: "Torneio Fevereiro", startDate: new Date("2026-02-15"),
      format: "ROUND_ROBIN", teamMode: "RANDOM_TEAMS",
      teamSize: 2, courtsCount: 1, matchesPerPair: 1,
      status: "DRAFT", randomSeed: "feb2026",
    },
  });
  console.log("Created tournament 2 (Draft)");

  // Compute rankings from finished matches
  const finished = await prisma.match.findMany({
    where: { tournament: { seasonId: season.id }, status: "FINISHED" },
    include: { teamA: true, teamB: true },
  });

  const pMap = new Map<string, { pointsTotal: number; matchesPlayed: number; wins: number; draws: number; losses: number; setsWon: number; setsLost: number }>();

  for (const m of finished) {
    const sets: { a: number; b: number }[] = [];
    if (m.set1A !== null && m.set1B !== null) sets.push({ a: m.set1A, b: m.set1B });
    if (m.set2A !== null && m.set2B !== null) sets.push({ a: m.set2A, b: m.set2B });
    if (m.set3A !== null && m.set3B !== null) sets.push({ a: m.set3A, b: m.set3B });

    let sA = 0, sB = 0;
    for (const s of sets) { if (s.a > s.b) sA++; else if (s.b > s.a) sB++; }

    const spA = sA * 2, spB = sB * 2;
    let mpA = 0, mpB = 0, wA = 0, wB = 0, lA = 0, lB = 0;
    if (m.resultType === "WIN_A") { mpA = 3; wA = 1; lB = 1; }
    else if (m.resultType === "WIN_B") { mpB = 3; wB = 1; lA = 1; }

    for (const pid of [m.teamA.player1Id, m.teamA.player2Id]) {
      const e = pMap.get(pid) || { pointsTotal: 0, matchesPlayed: 0, wins: 0, draws: 0, losses: 0, setsWon: 0, setsLost: 0 };
      e.pointsTotal += spA + mpA; e.matchesPlayed++; e.wins += wA; e.losses += lA; e.setsWon += sA; e.setsLost += sB;
      pMap.set(pid, e);
    }
    for (const pid of [m.teamB.player1Id, m.teamB.player2Id]) {
      const e = pMap.get(pid) || { pointsTotal: 0, matchesPlayed: 0, wins: 0, draws: 0, losses: 0, setsWon: 0, setsLost: 0 };
      e.pointsTotal += spB + mpB; e.matchesPlayed++; e.wins += wB; e.losses += lB; e.setsWon += sB; e.setsLost += sA;
      pMap.set(pid, e);
    }
  }

  for (const [playerId, data] of pMap.entries()) {
    await prisma.seasonRankingEntry.create({
      data: { seasonId: season.id, playerId, ...data, setsDiff: data.setsWon - data.setsLost },
    });
  }

  console.log("Computed rankings for", pMap.size, "players");
  console.log("Seed completed!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
