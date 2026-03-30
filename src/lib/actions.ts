"use server";

import { prisma } from "./db";
import { generateRoundRobinPairings, generateRandomTeams, generateAllRoundTeams, optimizeMatchAssignments, optimizeCourtAssignments, generateAmericanoRound1, generateNextAmericanoRound as generateNextAmericanoRoundAlgo, generateSobeDesceRound1, generateNextSobeDesceRound, type TeamRef } from "./scheduling";
import { computeMatchContribution, validateMatchScores, determineResult } from "./ranking";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { requireAuth, requireAdmin, requireLeagueManager } from "./auth-guards";
import { auth } from "./auth";
import { requireFeature, checkLimit } from "./plan-guards";
import { logAudit } from "./actions/audit-actions";
import { createNotification, createNotificationBulk } from "./actions/notification-actions";
import { sendEmail } from "./email";
import {
  welcomeEmail,
  inscriptionConfirmationEmail,
  substitutePromotedEmail,
  tournamentFinishedEmail,
  leagueInviteLinkEmail,
} from "./email-templates";
import {
  createGroup,
  addParticipants,
  removeParticipants,
  sendGroupMessage,
  promoteParticipants,
  normalizePhone,
  updateGroupPicture,
  fetchGroupParticipants,
} from "./whatsapp";
import {
  leagueCreatedMessage,
  tournamentCreatedMessage,
  teamsAnnouncementMessage,
  scheduleAnnouncementMessage,
  tournamentFinishedMessage,
  seasonRankingMessage,
} from "./whatsapp-templates";

// Helper: strip Prisma Date objects → plain JSON-safe objects
// Converts Date → string (ISO), BigInt → string, etc.
type Serialized<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;

function serialize<T>(obj: T): Serialized<T> {
  return JSON.parse(JSON.stringify(obj));
}

// ── League actions ──

export async function createLeague(formData: FormData) {
  await requireAdmin();

  const name = formData.get("name") as string;
  const location = (formData.get("location") as string) || null;

  if (!name?.trim()) throw new Error("Nome da liga é obrigatório.");

  // Plan check: league limit
  const session = await auth();
  if (session?.user?.id) {
    const existingLeagues = await prisma.leagueManager.count({ where: { userId: session.user.id } });
    await checkLimit("maxLeagues", existingLeagues, session.user.id);
  }

  const league = await prisma.league.create({
    data: { name: name.trim(), location: location?.trim() || null },
  });

  // ── WhatsApp: criar grupo e enviar boas-vindas (fire-and-forget) ──
  (async () => {
    try {
      // Collect admin phones: platform ADMINISTRADOR users + league managers
      const admins = await prisma.user.findMany({
        where: { role: "ADMINISTRADOR" },
        select: { phone: true },
      });
      const managers = await prisma.leagueManager.findMany({
        where: { leagueId: league.id },
        include: { user: { select: { phone: true } } },
      });
      const adminPhones = [
        ...admins.map((a) => a.phone).filter(Boolean),
        ...managers.map((m) => m.user.phone).filter(Boolean),
      ].map(normalizePhone).filter((p) => p.length > 0);

      const groupJid = await createGroup(league.name, adminPhones);
      if (groupJid) {
        await prisma.league.update({
          where: { id: league.id },
          data: { whatsappGroupId: groupJid },
        });
        await sendGroupMessage(groupJid, leagueCreatedMessage(league.name));
      }
    } catch (err) {
      console.error("[WHATSAPP] Erro ao criar grupo para liga:", err);
    }
  })();

  revalidatePath("/ligas");
  return league;
}

export async function getLeagues() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  const userRole = (session?.user as any)?.role as string | undefined;
  const isUserAdmin = userRole === "ADMINISTRADOR";

  const result = await prisma.league.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { seasons: true, memberships: true, tournaments: true } },
      seasons: {
        where: { isActive: true },
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true },
      },
      managers: userId ? { where: { userId }, select: { id: true } } : false,
    },
  });

  return serialize(
    result.map((l) => ({
      ...l,
      canManage: isUserAdmin || ((l as any).managers?.length > 0),
      managers: undefined, // strip raw managers from response
    }))
  );
}

export async function getLeague(id: string) {
  const result = await prisma.league.findUnique({
    where: { id },
    include: {
      seasons: {
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { tournaments: true } },
        },
      },
      memberships: {
        where: { status: "APPROVED" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              player: { select: { id: true, fullName: true, nickname: true, eloRating: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          seasons: true,
          memberships: true,
          tournaments: true,
        },
      },
    },
  });
  return serialize(result);
}

export async function deleteLeague(id: string) {
  await requireAdmin();

  const league = await prisma.league.findUnique({
    where: { id },
    select: { name: true },
  });
  if (!league) throw new Error("Liga não encontrada.");

  logAudit("DELETE_LEAGUE", "League", id, `Liga: ${league.name}`).catch(() => {});

  await prisma.league.delete({ where: { id } });
  revalidatePath("/ligas");
}

/**
 * Create (or re-sync) WhatsApp group for a league.
 * - If no group exists, creates one and adds all approved members
 * - If a group already exists, adds any missing members
 * - Admins (ADMINISTRADOR) and league managers are promoted to group admins
 */
export async function createOrSyncWhatsAppGroup(leagueId: string) {
  await requireLeagueManager(leagueId);

  // Plan check: WhatsApp integration
  await requireFeature("WHATSAPP_INTEGRATION");

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      memberships: {
        where: { status: "APPROVED" },
        include: { user: { select: { id: true, phone: true, role: true } } },
      },
      managers: {
        include: { user: { select: { id: true, phone: true } } },
      },
    },
  });

  if (!league) throw new Error("Liga não encontrada.");

  // Collect all member phones
  const memberPhones = league.memberships
    .map((m) => m.user.phone)
    .filter(Boolean)
    .map(normalizePhone)
    .filter((p) => p.length > 0);

  // Collect admin phones (platform admins + league managers)
  const platformAdmins = await prisma.user.findMany({
    where: { role: "ADMINISTRADOR" },
    select: { phone: true },
  });
  const adminPhoneSet = new Set<string>();
  for (const a of platformAdmins) {
    if (a.phone) adminPhoneSet.add(normalizePhone(a.phone));
  }
  for (const m of league.managers) {
    if (m.user.phone) adminPhoneSet.add(normalizePhone(m.user.phone));
  }
  const adminPhones = [...adminPhoneSet].filter((p) => p.length > 0);

  if (!league.whatsappGroupId) {
    // ── Create new group ──
    const groupJid = await createGroup(league.name, adminPhones);
    if (!groupJid) throw new Error("Falha ao criar grupo WhatsApp. Verifica a configuração da EvolutionAPI.");

    await prisma.league.update({
      where: { id: leagueId },
      data: { whatsappGroupId: groupJid },
    });

    // Add all approved members (who are not already admins)
    const nonAdminPhones = memberPhones.filter((p) => !adminPhoneSet.has(p));
    if (nonAdminPhones.length > 0) {
      await addParticipants(groupJid, nonAdminPhones);
    }

    // Send welcome message
    await sendGroupMessage(groupJid, leagueCreatedMessage(league.name));

    revalidatePath(`/ligas/${leagueId}`);
    return { created: true, groupJid, membersAdded: memberPhones.length };
  } else {
    // ── Sync existing group — full bidirectional sync ──
    const groupJid = league.whatsappGroupId;

    // All phones that SHOULD be in the group
    const expectedPhones = new Set([...memberPhones, ...adminPhones]);

    // Fetch current participants from WhatsApp group
    const currentParticipants = await fetchGroupParticipants(groupJid);
    const currentSet = new Set(currentParticipants);

    // Determine who to add (in expected but NOT in group)
    const toAdd = [...expectedPhones].filter((p) => !currentSet.has(p));

    // Determine who to remove (in group but NOT expected)
    // Never remove the bot's own number (DEFAULT_ADMIN_PHONE from whatsapp.ts = 351932539702)
    const botPhone = "351932539702";
    const toRemove = currentParticipants.filter(
      (p) => !expectedPhones.has(p) && p !== botPhone
    );

    let membersAdded = 0;
    let membersRemoved = 0;

    if (toAdd.length > 0) {
      await addParticipants(groupJid, toAdd);
      membersAdded = toAdd.length;
    }
    if (toRemove.length > 0) {
      await removeParticipants(groupJid, toRemove);
      membersRemoved = toRemove.length;
    }

    // Re-promote admins (idempotent)
    if (adminPhones.length > 0) {
      await promoteParticipants(groupJid, adminPhones);
    }
    // Update group profile picture (idempotent)
    await updateGroupPicture(groupJid);

    console.log(
      `[WHATSAPP] Sync grupo ${groupJid}: +${membersAdded} adicionados, -${membersRemoved} removidos, ${currentParticipants.length} no grupo`
    );

    revalidatePath(`/ligas/${leagueId}`);
    return { created: false, groupJid, membersAdded, membersRemoved };
  }
}

// ── Season actions ──

export async function createSeason(formData: FormData) {
  await requireAdmin();

  const leagueId = formData.get("leagueId") as string;
  const name = formData.get("name") as string;
  const allowDraws = formData.get("allowDraws") === "true";
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;

  if (!name?.trim()) throw new Error("Nome da época é obrigatório.");

  const season = await prisma.season.create({
    data: {
      leagueId,
      name: name.trim(),
      allowDraws,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  revalidatePath(`/ligas/${leagueId}`);
  return season;
}

export async function getSeason(id: string) {
  const result = await prisma.season.findUnique({
    where: { id },
    include: {
      league: true,
      tournaments: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { teams: true, matches: true } } },
      },
      rankings: {
        orderBy: { pointsTotal: "desc" },
        include: { player: true },
      },
    },
  });
  return serialize(result);
}

export async function updateSeasonDraws(seasonId: string, allowDraws: boolean) {
  await prisma.season.update({
    where: { id: seasonId },
    data: { allowDraws },
  });
}

// ── Player actions ──

export async function getPlayers() {
  const result = await prisma.player.findMany({ orderBy: { fullName: "asc" } });
  return serialize(result);
}

export async function createPlayer(formData: FormData) {
  const fullName = formData.get("fullName") as string;
  const nickname = (formData.get("nickname") as string) || null;
  const level = (formData.get("level") as string) || null;

  if (!fullName?.trim()) throw new Error("Nome do jogador é obrigatório.");

  return prisma.player.create({
    data: {
      fullName: fullName.trim(),
      nickname: nickname?.trim() || null,
      level: level?.trim() || null,
    },
  });
}

export async function createPlayersFromList(names: string[]) {
  const players = [];
  for (const name of names) {
    if (name.trim()) {
      const p = await prisma.player.create({
        data: { fullName: name.trim() },
      });
      players.push(p);
    }
  }
  return players;
}

// ── Tournament actions ──

export async function createTournament(data: {
  leagueId: string;
  seasonId: string;
  name: string;
  startDate?: string;
  courtsCount: number;
  courtNames?: string[];
  clubId?: string;
  courtIds?: string[];
  courtGroupLabels?: Record<string, string>;
  format?: string;
  numberOfGroups?: number;
  teamsAdvancing?: number;
  hasQuarterFinals?: boolean;
  hasSemiFinals?: boolean;
  hasThirdPlace?: boolean;
  knockoutSets?: number;
  tiebreakerCriteria?: string;
  matchesPerPair: number;
  numberOfSets: number;
  teamSize?: number;
  teamMode: string;
  randomSeed?: string;
  numberOfRounds?: number;
  rankedSplitSubMode?: string;
  requiresPayment?: boolean;
  inscriptionFee?: number | null;
  teams: { name: string; player1Id: string; player2Id: string | null }[];
  allPlayerIds?: string[];
}) {
  await requireLeagueManager(data.leagueId);

  // Plan check: tournament limit per season
  {
    const existingTournaments = await prisma.tournament.count({ where: { seasonId: data.seasonId } });
    await checkLimit("maxTournamentsPerSeason", existingTournaments);
  }

  // Plan check: double round robin requires Pro+
  if (data.matchesPerPair && data.matchesPerPair > 1) {
    await requireFeature("DOUBLE_ROUND_ROBIN");
  }

  // Plan check: random teams requires Pro+
  if (data.teamMode === "RANDOM_TEAMS" || data.teamMode === "RANDOM_PER_ROUND" || data.teamMode === "RANKED_SPLIT" || data.teamMode === "AMERICANO" || data.teamMode === "SOBE_DESCE" || data.teamMode === "NONSTOP" || data.teamMode === "LADDER") {
    await requireFeature("RANDOM_TEAMS_SEED");
  }

  const teamSize = data.teamSize ?? 2;
  const maxTitulars = data.courtsCount * 2 * teamSize;

  const tournament = await prisma.tournament.create({
    data: {
      leagueId: data.leagueId,
      seasonId: data.seasonId,
      name: data.name,
      startDate: data.startDate ? new Date(data.startDate + "T00:00:00") : null,
      courtsCount: data.courtIds?.length ?? data.courtsCount,
      clubId: data.clubId || null,
      format: data.format || "ROUND_ROBIN",
      matchesPerPair: data.matchesPerPair,
      numberOfSets: data.numberOfSets,
      teamSize,
      teamMode: data.teamMode,
      randomSeed: data.randomSeed || null,
      numberOfRounds: data.numberOfRounds || null,
      rankedSplitSubMode: data.rankedSplitSubMode || null,
      // GROUP_KNOCKOUT config
      numberOfGroups: data.numberOfGroups || null,
      teamsAdvancing: data.teamsAdvancing || null,
      hasQuarterFinals: data.hasQuarterFinals ?? false,
      hasSemiFinals: data.hasSemiFinals ?? false,
      hasThirdPlace: data.hasThirdPlace ?? false,
      knockoutSets: data.knockoutSets || null,
      tiebreakerCriteria: data.tiebreakerCriteria || null,
      requiresPayment: data.requiresPayment ?? false,
      inscriptionFee: data.inscriptionFee ?? null,
      currentPhase: data.format === "GROUP_KNOCKOUT" ? "GROUPS" : "GROUPS",
      status: "DRAFT",
    },
  });

  // Create TournamentCourt junctions (new model) or legacy courts
  if (data.courtIds && data.courtIds.length > 0) {
    for (const courtId of data.courtIds) {
      await prisma.tournamentCourt.create({
        data: {
          tournamentId: tournament.id,
          courtId,
          groupLabel: data.courtGroupLabels?.[courtId] || null,
        },
      });
    }
  } else {
    // Legacy: create courts per tournament (backward compat)
    for (let i = 0; i < data.courtsCount; i++) {
      await prisma.court.create({
        data: {
          tournamentId: tournament.id,
          name: data.courtNames?.[i] || `Campo ${i + 1}`,
        },
      });
    }
  }

  // Create teams
  for (const t of data.teams) {
    await prisma.team.create({
      data: {
        tournamentId: tournament.id,
        name: t.name,
        player1Id: t.player1Id,
        player2Id: t.player2Id || null,
        isRandomGenerated: data.teamMode === "RANDOM_TEAMS",
      },
    });
  }

  // Create inscriptions (titulars + suplentes)
  if (data.allPlayerIds && data.allPlayerIds.length > 0) {
    for (let i = 0; i < data.allPlayerIds.length; i++) {
      await prisma.tournamentInscription.create({
        data: {
          tournamentId: tournament.id,
          playerId: data.allPlayerIds[i],
          orderIndex: i,
          status: i < maxTitulars ? "TITULAR" : "SUPLENTE",
        },
      });
    }

    // Send inscription confirmation emails (fire-and-forget)
    const league = await prisma.league.findUnique({ where: { id: data.leagueId } });
    for (let i = 0; i < data.allPlayerIds.length; i++) {
      const player = await prisma.player.findUnique({
        where: { id: data.allPlayerIds[i] },
        include: { user: true },
      });
      if (player?.user?.email) {
        const status = i < maxTitulars ? "TITULAR" as const : "SUPLENTE" as const;
        sendEmail({
          to: player.user.email,
          subject: `CopaPro: Inscrição no torneio ${data.name}`,
          html: inscriptionConfirmationEmail({
            playerName: player.fullName,
            tournamentName: data.name,
            leagueName: league?.name || "",
            status,
            orderIndex: status === "SUPLENTE" ? i - maxTitulars + 1 : undefined,
          }),
        });
      }
    }
  }

  logAudit("CREATE_TOURNAMENT", "Tournament", tournament.id, { name: data.name }).catch(() => {});

  // ── WhatsApp: anunciar torneio no grupo da liga (fire-and-forget) ──
  (async () => {
    try {
      const league = await prisma.league.findUnique({
        where: { id: data.leagueId },
        select: { whatsappGroupId: true },
      });
      if (league?.whatsappGroupId) {
        const appUrl = process.env.APP_URL || "https://copapro.pt";
        const tournamentUrl = `${appUrl}/torneios/${tournament.id}`;
        const dateStr = data.startDate
          ? new Date(data.startDate + "T00:00:00").toLocaleDateString("pt-PT", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })
          : "A definir";
        await sendGroupMessage(
          league.whatsappGroupId,
          tournamentCreatedMessage(data.name, dateStr, tournamentUrl)
        );

        // Se já tem equipas, anunciar também
        if (data.teams.length > 0) {
          const teamsWithNames = await Promise.all(
            data.teams.map(async (t) => {
              const p1 = await prisma.player.findUnique({ where: { id: t.player1Id }, select: { fullName: true } });
              const p2 = t.player2Id ? await prisma.player.findUnique({ where: { id: t.player2Id }, select: { fullName: true } }) : null;
              return { name: t.name, player1: p1?.fullName || "?", player2: p2?.fullName || null };
            })
          );
          await sendGroupMessage(
            league.whatsappGroupId,
            teamsAnnouncementMessage(data.name, teamsWithNames)
          );
        }
      }
    } catch (err) {
      console.error("[WHATSAPP] Erro ao anunciar torneio:", err);
    }
  })();

  return tournament;
}

export async function generateSchedule(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      teams: true,
      courts: true,
      rounds: true,
      matches: true,
      tournamentCourts: { include: { court: true }, orderBy: { court: { orderIndex: "asc" } } },
    },
  });

  if (!tournament) throw new Error("Torneio não encontrado.");
  // Easy Mix tournaments have no league — skip league manager check
  if (tournament.leagueId) {
    await requireLeagueManager(tournament.leagueId);
  }

  // Check if results exist
  const hasResults = tournament.matches.some((m) => m.status === "FINISHED");
  if (hasResults) {
    throw new Error("CONFIRM_REGENERATE");
  }

  // Delete existing schedule and per-round teams
  await prisma.match.deleteMany({ where: { tournamentId } });
  await prisma.round.deleteMany({ where: { tournamentId } });
  // For RANDOM_PER_ROUND, RANKED_SPLIT, AMERICANO, or SOBE_DESCE, also delete previously generated teams
  if (tournament.teamMode === "RANDOM_PER_ROUND" || tournament.teamMode === "RANKED_SPLIT" || tournament.teamMode === "AMERICANO" || tournament.teamMode === "SOBE_DESCE" || tournament.teamMode === "NONSTOP" || tournament.teamMode === "LADDER") {
    await prisma.team.deleteMany({ where: { tournamentId } });
  }

  // ── NONSTOP: create a single empty round — matches are created dynamically ──
  if (tournament.teamMode === "NONSTOP") {
    await prisma.round.create({
      data: { tournamentId, index: 1 },
    });
    revalidatePath(`/torneios/${tournamentId}`);
    return;
  }

  // ── LADDER: create initial positions by ELO and a single round ──
  if (tournament.teamMode === "LADDER") {
    const inscriptions = await prisma.tournamentInscription.findMany({
      where: { tournamentId, status: "TITULAR" },
      include: { player: true },
      orderBy: { player: { eloRating: "desc" } },
    });

    for (let i = 0; i < inscriptions.length; i++) {
      await prisma.ladderPosition.create({
        data: {
          tournamentId,
          playerId: inscriptions[i].playerId,
          position: i + 1,
        },
      });
    }

    await prisma.round.create({
      data: { tournamentId, index: 1 },
    });

    revalidatePath(`/torneios/${tournamentId}`);
    return;
  }

  // Use tournamentCourts (new model) if available, otherwise legacy courts
  const courts = tournament.tournamentCourts.length > 0
    ? tournament.tournamentCourts.map((tc) => tc.court)
    : tournament.courts;

  if (tournament.teamMode === "RANKED_SPLIT") {
    // ── RANKED_SPLIT: divide players by ranking, generate schedule per group ──
    const inscriptions = await prisma.tournamentInscription.findMany({
      where: { tournamentId, status: "TITULAR" },
      orderBy: { orderIndex: "asc" },
    });
    const playerIds = inscriptions.map((ins) => ins.playerId);

    if (playerIds.length < 4 || playerIds.length % 2 !== 0) {
      throw new Error("É necessário um número par de jogadores titulares (mínimo 4) para o modo por nível.");
    }

    // Fetch season ranking to split players
    const rankings = tournament.seasonId ? await prisma.seasonRankingEntry.findMany({
      where: { seasonId: tournament.seasonId },
      orderBy: { pointsTotal: "desc" },
    }) : [];

    // Sort inscribed players by ranking position (unranked go to bottom)
    const rankedPlayerIds = playerIds
      .map((id) => ({ id, rank: rankings.findIndex((r) => r.playerId === id) }))
      .sort((a, b) => {
        const ra = a.rank === -1 ? 9999 : a.rank;
        const rb = b.rank === -1 ? 9999 : b.rank;
        return ra - rb;
      })
      .map((r) => r.id);

    const halfSize = Math.floor(rankedPlayerIds.length / 2);
    const groupA = rankedPlayerIds.slice(0, halfSize); // top ranked
    const groupB = rankedPlayerIds.slice(halfSize);     // lower ranked

    // Get player names for team naming
    const dbPlayers = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, fullName: true, nickname: true },
    });
    const playerMap = new Map<string, string>();
    for (const p of dbPlayers) {
      playerMap.set(p.id, p.nickname || p.fullName);
    }

    const seed = tournament.randomSeed || "default";
    const subMode = tournament.rankedSplitSubMode || "fixed";

    // Use groupLabel from tournamentCourts if available, otherwise split courts in half
    const tcWithLabels = tournament.tournamentCourts.filter((tc) => tc.groupLabel === "A" || tc.groupLabel === "B");
    let groupACourts: typeof courts;
    let groupBCourts: typeof courts;
    if (tcWithLabels.length > 0) {
      groupACourts = tournament.tournamentCourts.filter((tc) => tc.groupLabel === "A").map((tc) => tc.court);
      groupBCourts = tournament.tournamentCourts.filter((tc) => tc.groupLabel === "B").map((tc) => tc.court);
      // Fallback: unassigned courts split evenly
      const unassigned = courts.filter((c) => !groupACourts.some((gc) => gc.id === c.id) && !groupBCourts.some((gc) => gc.id === c.id));
      for (let i = 0; i < unassigned.length; i++) {
        if (groupACourts.length <= groupBCourts.length) groupACourts.push(unassigned[i]);
        else groupBCourts.push(unassigned[i]);
      }
    } else {
      const courtsPerGroup = Math.max(1, Math.floor(courts.length / 2));
      groupACourts = courts.slice(0, courtsPerGroup);
      groupBCourts = courts.slice(courtsPerGroup);
    }

    if (subMode === "per_round") {
      // ── Per-round mode: generate different teams each round for each group ──
      const numRounds = tournament.numberOfRounds || (halfSize - 1);
      const groupATeams = generateAllRoundTeams(groupA, numRounds, seed + "_A");
      const groupBTeams = generateAllRoundTeams(groupB, numRounds, seed + "_B");

      // Optimize match assignments for each group separately
      const optimizedA = optimizeMatchAssignments(groupATeams);
      const optimizedB = optimizeMatchAssignments(groupBTeams);

      for (let r = 0; r < numRounds; r++) {
        const round = await prisma.round.create({
          data: { tournamentId, index: r + 1 },
        });

        // Create teams for Group A
        const groupATeamIds: string[] = [];
        for (const pair of groupATeams[r]) {
          const p1Name = playerMap.get(pair.player1Id) || "?";
          const p2Name = playerMap.get(pair.player2Id) || "?";
          const team = await prisma.team.create({
            data: {
              tournamentId, name: `${p1Name} & ${p2Name}`,
              player1Id: pair.player1Id, player2Id: pair.player2Id,
              isRandomGenerated: true, roundId: round.id,
            },
          });
          groupATeamIds.push(team.id);
        }

        // Create teams for Group B
        const groupBTeamIds: string[] = [];
        for (const pair of groupBTeams[r]) {
          const p1Name = playerMap.get(pair.player1Id) || "?";
          const p2Name = playerMap.get(pair.player2Id) || "?";
          const team = await prisma.team.create({
            data: {
              tournamentId, name: `${p1Name} & ${p2Name}`,
              player1Id: pair.player1Id, player2Id: pair.player2Id,
              isRandomGenerated: true, roundId: round.id,
            },
          });
          groupBTeamIds.push(team.id);
        }

        // Create matches using optimized assignments with group-specific courts
        let slotIndex = 0;
        const matchesA = optimizedA[r];
        for (let m = 0; m < matchesA.length; m++) {
          const { teamAIndex, teamBIndex } = matchesA[m];
          const courtId = groupACourts[m % groupACourts.length]?.id || null;
          await prisma.match.create({
            data: {
              tournamentId, roundId: round.id, courtId, slotIndex: slotIndex++,
              teamAId: groupATeamIds[teamAIndex], teamBId: groupATeamIds[teamBIndex],
              status: "SCHEDULED", resultType: "UNDECIDED",
            },
          });
        }
        const matchesB = optimizedB[r];
        for (let m = 0; m < matchesB.length; m++) {
          const { teamAIndex, teamBIndex } = matchesB[m];
          const courtId = groupBCourts[m % groupBCourts.length]?.id || null;
          await prisma.match.create({
            data: {
              tournamentId, roundId: round.id, courtId, slotIndex: slotIndex++,
              teamAId: groupBTeamIds[teamAIndex], teamBId: groupBTeamIds[teamBIndex],
              status: "SCHEDULED", resultType: "UNDECIDED",
            },
          });
        }
      }
    } else {
      // ── Fixed mode: generate random teams once, then round-robin within each group ──
      const groupAFixedTeams = generateRandomTeams(groupA, seed + "_A");
      const groupBFixedTeams = generateRandomTeams(groupB, seed + "_B");

      // Create fixed teams
      const groupATeamRefs: TeamRef[] = [];
      for (let i = 0; i < groupAFixedTeams.length; i++) {
        const pair = groupAFixedTeams[i];
        const p1Name = playerMap.get(pair.player1Id) || "?";
        const p2Name = playerMap.get(pair.player2Id) || "?";
        const team = await prisma.team.create({
          data: {
            tournamentId, name: `${p1Name} & ${p2Name}`,
            player1Id: pair.player1Id, player2Id: pair.player2Id,
            isRandomGenerated: true,
          },
        });
        groupATeamRefs.push({ id: team.id, index: i });
      }

      const groupBTeamRefs: TeamRef[] = [];
      for (let i = 0; i < groupBFixedTeams.length; i++) {
        const pair = groupBFixedTeams[i];
        const p1Name = playerMap.get(pair.player1Id) || "?";
        const p2Name = playerMap.get(pair.player2Id) || "?";
        const team = await prisma.team.create({
          data: {
            tournamentId, name: `${p1Name} & ${p2Name}`,
            player1Id: pair.player1Id, player2Id: pair.player2Id,
            isRandomGenerated: true,
          },
        });
        groupBTeamRefs.push({ id: team.id, index: i });
      }

      // Generate round-robin pairings for each group using group-specific court counts
      const pairingsA = generateRoundRobinPairings(groupATeamRefs, groupACourts.length, tournament.matchesPerPair, seed + "_A");
      const pairingsB = generateRoundRobinPairings(groupBTeamRefs, groupBCourts.length, tournament.matchesPerPair, seed + "_B");

      // Merge pairings into combined rounds
      const maxRound = Math.max(
        pairingsA.length > 0 ? Math.max(...pairingsA.map((p) => p.roundIndex)) : 0,
        pairingsB.length > 0 ? Math.max(...pairingsB.map((p) => p.roundIndex)) : 0,
      );

      const roundMap = new Map<number, string>();
      for (let r = 1; r <= maxRound; r++) {
        const round = await prisma.round.create({
          data: { tournamentId, index: r },
        });
        roundMap.set(r, round.id);
      }

      for (const p of pairingsA) {
        const roundId = roundMap.get(p.roundIndex)!;
        const courtId = groupACourts[p.courtIndex]?.id || null;
        await prisma.match.create({
          data: {
            tournamentId, roundId, courtId, slotIndex: p.slotIndex,
            teamAId: p.teamA.id, teamBId: p.teamB.id,
            status: "SCHEDULED", resultType: "UNDECIDED",
          },
        });
      }

      for (const p of pairingsB) {
        const roundId = roundMap.get(p.roundIndex)!;
        const courtId = groupBCourts[p.courtIndex]?.id || null;
        await prisma.match.create({
          data: {
            tournamentId, roundId, courtId, slotIndex: p.slotIndex + 100, // offset to avoid collision
            teamAId: p.teamA.id, teamBId: p.teamB.id,
            status: "SCHEDULED", resultType: "UNDECIDED",
          },
        });
      }
    }
  } else if (tournament.teamMode === "AMERICANO") {
    // ── AMERICANO: generate only round 1, subsequent rounds depend on results ──
    const inscriptions = await prisma.tournamentInscription.findMany({
      where: { tournamentId, status: "TITULAR" },
      orderBy: { orderIndex: "asc" },
    });
    const playerIds = inscriptions.map((ins) => ins.playerId);

    if (playerIds.length < 4 || playerIds.length % 2 !== 0) {
      throw new Error("É necessário um número par de jogadores titulares (mínimo 4) para o formato Americano.");
    }

    const seed = tournament.randomSeed || "default";

    // Get player names
    const playerMap = new Map<string, string>();
    const dbPlayers = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, fullName: true, nickname: true },
    });
    for (const p of dbPlayers) {
      playerMap.set(p.id, p.nickname || p.fullName);
    }

    // Generate round 1
    const round1 = generateAmericanoRound1(playerIds, courts.length, seed);

    const round = await prisma.round.create({
      data: { tournamentId, index: 1 },
    });

    for (let m = 0; m < round1.matches.length; m++) {
      const match = round1.matches[m];
      const p1Name = playerMap.get(match.team1[0]) || "?";
      const p2Name = playerMap.get(match.team1[1]) || "?";
      const teamA = await prisma.team.create({
        data: {
          tournamentId,
          name: `${p1Name} & ${p2Name}`,
          player1Id: match.team1[0],
          player2Id: match.team1[1],
          isRandomGenerated: true,
          roundId: round.id,
        },
      });

      const p3Name = playerMap.get(match.team2[0]) || "?";
      const p4Name = playerMap.get(match.team2[1]) || "?";
      const teamB = await prisma.team.create({
        data: {
          tournamentId,
          name: `${p3Name} & ${p4Name}`,
          player1Id: match.team2[0],
          player2Id: match.team2[1],
          isRandomGenerated: true,
          roundId: round.id,
        },
      });

      const courtId = courts[match.courtIndex % courts.length]?.id || null;
      await prisma.match.create({
        data: {
          tournamentId,
          roundId: round.id,
          courtId,
          slotIndex: m,
          teamAId: teamA.id,
          teamBId: teamB.id,
          status: "SCHEDULED",
          resultType: "UNDECIDED",
        },
      });
    }
  } else if (tournament.teamMode === "SOBE_DESCE") {
    // ── SOBE_DESCE: generate only round 1, subsequent rounds depend on results ──
    const inscriptions = await prisma.tournamentInscription.findMany({
      where: { tournamentId, status: "TITULAR" },
      orderBy: { orderIndex: "asc" },
    });
    const playerIds = inscriptions.map((ins) => ins.playerId);

    if (playerIds.length < 4 || playerIds.length % 4 !== 0) {
      throw new Error("É necessário um múltiplo de 4 jogadores titulares (mínimo 4) para o formato Sobe e Desce.");
    }

    const seed = tournament.randomSeed || "default";

    const playerMap = new Map<string, string>();
    const dbPlayers = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, fullName: true, nickname: true },
    });
    for (const p of dbPlayers) {
      playerMap.set(p.id, p.nickname || p.fullName);
    }

    const round1 = generateSobeDesceRound1(playerIds, courts.length, seed);

    const round = await prisma.round.create({
      data: { tournamentId, index: 1 },
    });

    for (let m = 0; m < round1.matches.length; m++) {
      const match = round1.matches[m];
      const p1Name = playerMap.get(match.team1[0]) || "?";
      const p2Name = playerMap.get(match.team1[1]) || "?";
      const teamA = await prisma.team.create({
        data: {
          tournamentId,
          name: `${p1Name} & ${p2Name}`,
          player1Id: match.team1[0],
          player2Id: match.team1[1],
          isRandomGenerated: true,
          roundId: round.id,
        },
      });

      const p3Name = playerMap.get(match.team2[0]) || "?";
      const p4Name = playerMap.get(match.team2[1]) || "?";
      const teamB = await prisma.team.create({
        data: {
          tournamentId,
          name: `${p3Name} & ${p4Name}`,
          player1Id: match.team2[0],
          player2Id: match.team2[1],
          isRandomGenerated: true,
          roundId: round.id,
        },
      });

      const courtId = courts[match.courtIndex % courts.length]?.id || null;
      await prisma.match.create({
        data: {
          tournamentId,
          roundId: round.id,
          courtId,
          slotIndex: m,
          teamAId: teamA.id,
          teamBId: teamB.id,
          status: "SCHEDULED",
          resultType: "UNDECIDED",
        },
      });
    }
  } else if (tournament.teamMode === "RANDOM_PER_ROUND") {
    // ── RANDOM_PER_ROUND: generate unique teams per round ──
    const inscriptions = await prisma.tournamentInscription.findMany({
      where: { tournamentId, status: "TITULAR" },
      orderBy: { orderIndex: "asc" },
    });
    const playerIds = inscriptions.map((ins) => ins.playerId);

    if (playerIds.length < 4 || playerIds.length % 2 !== 0) {
      throw new Error("É necessário um número par de jogadores titulares (mínimo 4) para equipas aleatórias por ronda.");
    }

    const numRounds = tournament.numberOfRounds || (playerIds.length - 1);
    const seed = tournament.randomSeed || "default";
    const allRoundTeams = generateAllRoundTeams(playerIds, numRounds, seed);

    // Get player names for team naming
    const playerMap = new Map<string, string>();
    const dbPlayers = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, fullName: true, nickname: true },
    });
    for (const p of dbPlayers) {
      playerMap.set(p.id, p.nickname || p.fullName);
    }

    // Optimize match assignments to maximize opponent variety across rounds
    const optimizedAssignments = optimizeMatchAssignments(allRoundTeams);

    // Build match-player info for court optimization
    const courtsHaveQuality = courts.some((c: any) => c.quality && c.quality !== "GOOD");
    let courtAssignments: string[][] | null = null;
    if (courtsHaveQuality && courts.length > 1) {
      const matchInfoPerRound: { player1IdA: string; player2IdA?: string; player1IdB: string; player2IdB?: string }[][] = [];
      for (let r = 0; r < allRoundTeams.length; r++) {
        const roundPairs = allRoundTeams[r];
        const assignments = optimizedAssignments[r];
        const roundMatchInfo: { player1IdA: string; player2IdA?: string; player1IdB: string; player2IdB?: string }[] = [];
        for (const { teamAIndex, teamBIndex } of assignments) {
          const tA = roundPairs[teamAIndex];
          const tB = roundPairs[teamBIndex];
          roundMatchInfo.push({
            player1IdA: tA.player1Id, player2IdA: tA.player2Id,
            player1IdB: tB.player1Id, player2IdB: tB.player2Id,
          });
        }
        matchInfoPerRound.push(roundMatchInfo);
      }
      courtAssignments = optimizeCourtAssignments(
        matchInfoPerRound,
        courts.map((c: any) => ({ id: c.id, quality: c.quality || "GOOD" }))
      );
    }

    for (let r = 0; r < allRoundTeams.length; r++) {
      const round = await prisma.round.create({
        data: { tournamentId, index: r + 1 },
      });

      // Create teams for this round
      const roundTeamIds: { id: string; index: number }[] = [];
      const roundPairs = allRoundTeams[r];

      for (let t = 0; t < roundPairs.length; t++) {
        const pair = roundPairs[t];
        const p1Name = playerMap.get(pair.player1Id) || "?";
        const p2Name = playerMap.get(pair.player2Id) || "?";
        const team = await prisma.team.create({
          data: {
            tournamentId,
            name: `${p1Name} & ${p2Name}`,
            player1Id: pair.player1Id,
            player2Id: pair.player2Id,
            isRandomGenerated: true,
            roundId: round.id,
          },
        });
        roundTeamIds.push({ id: team.id, index: t });
      }

      // Use optimized match assignments (minimizes repeated opponents)
      const matchAssignments = optimizedAssignments[r];
      for (let m = 0; m < matchAssignments.length; m++) {
        const { teamAIndex, teamBIndex } = matchAssignments[m];
        // Use court quality optimization if available, otherwise cyclic
        const courtId = courtAssignments
          ? courtAssignments[r]?.[m] || courts[m % courts.length]?.id || null
          : courts[m % courts.length]?.id || null;
        await prisma.match.create({
          data: {
            tournamentId,
            roundId: round.id,
            courtId,
            slotIndex: m,
            teamAId: roundTeamIds[teamAIndex].id,
            teamBId: roundTeamIds[teamBIndex].id,
            status: "SCHEDULED",
            resultType: "UNDECIDED",
          },
        });
      }
    }
  } else {
    // ── Standard flow: use existing teams + round robin pairings ──
    const teamRefs: TeamRef[] = tournament.teams.map((t, i) => ({
      id: t.id,
      index: i,
    }));

    const pairings = generateRoundRobinPairings(
      teamRefs,
      tournament.courtsCount,
      tournament.matchesPerPair,
      tournament.randomSeed || undefined
    );

    const roundMap = new Map<number, string>();

    for (const p of pairings) {
      if (!roundMap.has(p.roundIndex)) {
        const round = await prisma.round.create({
          data: { tournamentId, index: p.roundIndex },
        });
        roundMap.set(p.roundIndex, round.id);
      }

      const roundId = roundMap.get(p.roundIndex)!;
      const courtId = courts[p.courtIndex]?.id || null;

      await prisma.match.create({
        data: {
          tournamentId,
          roundId,
          courtId,
          slotIndex: p.slotIndex,
          teamAId: p.teamA.id,
          teamBId: p.teamB.id,
          status: "SCHEDULED",
          resultType: "UNDECIDED",
        },
      });
    }
  }

  // Update status
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "PUBLISHED" },
  });

  // ── WhatsApp: divulgar calendário no grupo (fire-and-forget) ──
  (async () => {
    try {
      const league = tournament.leagueId ? await prisma.league.findUnique({
        where: { id: tournament.leagueId },
        select: { whatsappGroupId: true },
      }) : null;
      if (league?.whatsappGroupId) {
        // Build rounds data for the message
        const allMatches = await prisma.match.findMany({
          where: { tournamentId },
          include: {
            round: { select: { index: true } },
            court: { select: { name: true } },
            teamA: { select: { name: true } },
            teamB: { select: { name: true } },
          },
          orderBy: [{ round: { index: "asc" } }, { slotIndex: "asc" }],
        });

        const roundsMap = new Map<number, { teamA: string; teamB: string; court: string }[]>();
        for (const m of allMatches) {
          const ri = m.round.index;
          if (!roundsMap.has(ri)) roundsMap.set(ri, []);
          roundsMap.get(ri)!.push({
            teamA: m.teamA.name,
            teamB: m.teamB.name,
            court: m.court?.name || "TBD",
          });
        }

        const rounds = [...roundsMap.entries()]
          .sort(([a], [b]) => a - b)
          .map(([roundIndex, matches]) => ({ roundIndex, matches }));

        await sendGroupMessage(
          league.whatsappGroupId,
          scheduleAnnouncementMessage(tournament.name, rounds)
        );
      }
    } catch (err) {
      console.error("[WHATSAPP] Erro ao divulgar calendário:", err);
    }
  })();

  revalidatePath(`/torneios/${tournamentId}`);

  // Count generated schedule
  const generatedRounds = await prisma.round.count({ where: { tournamentId } });
  const generatedMatches = await prisma.match.count({ where: { tournamentId } });
  return { roundCount: generatedRounds, matchCount: generatedMatches };
}

export async function forceRegenerateSchedule(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      teams: true,
      courts: true,
      tournamentCourts: { include: { court: true }, orderBy: { court: { orderIndex: "asc" } } },
    },
  });

  if (!tournament) throw new Error("Torneio não encontrado.");
  await requireLeagueManager(tournament.leagueId ?? "");

  // Delete all results first
  await prisma.match.deleteMany({ where: { tournamentId } });
  await prisma.round.deleteMany({ where: { tournamentId } });

  // For RANDOM_PER_ROUND, AMERICANO, or SOBE_DESCE, also delete per-round teams before regenerating
  if (tournament.teamMode === "RANDOM_PER_ROUND" || tournament.teamMode === "AMERICANO" || tournament.teamMode === "SOBE_DESCE") {
    await prisma.team.deleteMany({ where: { tournamentId } });
  }

  // Use tournamentCourts (new model) if available, otherwise legacy courts
  const courts = tournament.tournamentCourts.length > 0
    ? tournament.tournamentCourts.map((tc) => tc.court)
    : tournament.courts;

  if (tournament.teamMode === "SOBE_DESCE") {
    // Re-use generateSchedule logic for Sobe e Desce (regenerates round 1 only)
    const inscriptions = await prisma.tournamentInscription.findMany({
      where: { tournamentId, status: "TITULAR" },
      orderBy: { orderIndex: "asc" },
    });
    const playerIds = inscriptions.map((ins) => ins.playerId);

    if (playerIds.length < 4 || playerIds.length % 4 !== 0) {
      throw new Error("É necessário um múltiplo de 4 jogadores titulares (mínimo 4).");
    }

    const seed = tournament.randomSeed || "default";
    const playerMap = new Map<string, string>();
    const dbPlayers = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, fullName: true, nickname: true },
    });
    for (const p of dbPlayers) {
      playerMap.set(p.id, p.nickname || p.fullName);
    }

    const round1 = generateSobeDesceRound1(playerIds, courts.length, seed);
    const round = await prisma.round.create({
      data: { tournamentId, index: 1 },
    });

    for (let m = 0; m < round1.matches.length; m++) {
      const match = round1.matches[m];
      const teamA = await prisma.team.create({
        data: {
          tournamentId,
          name: `${playerMap.get(match.team1[0]) || "?"} & ${playerMap.get(match.team1[1]) || "?"}`,
          player1Id: match.team1[0], player2Id: match.team1[1],
          isRandomGenerated: true, roundId: round.id,
        },
      });
      const teamB = await prisma.team.create({
        data: {
          tournamentId,
          name: `${playerMap.get(match.team2[0]) || "?"} & ${playerMap.get(match.team2[1]) || "?"}`,
          player1Id: match.team2[0], player2Id: match.team2[1],
          isRandomGenerated: true, roundId: round.id,
        },
      });
      const courtId = courts[match.courtIndex % courts.length]?.id || null;
      await prisma.match.create({
        data: {
          tournamentId, roundId: round.id, courtId, slotIndex: m,
          teamAId: teamA.id, teamBId: teamB.id,
          status: "SCHEDULED", resultType: "UNDECIDED",
        },
      });
    }

    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: "PUBLISHED" },
    });

    revalidatePath(`/torneios/${tournamentId}`);
    return;
  } else if (tournament.teamMode === "AMERICANO") {
    // Re-use generateSchedule logic for Americano (regenerates round 1 only)
    const inscriptions = await prisma.tournamentInscription.findMany({
      where: { tournamentId, status: "TITULAR" },
      orderBy: { orderIndex: "asc" },
    });
    const playerIds = inscriptions.map((ins) => ins.playerId);

    if (playerIds.length < 4 || playerIds.length % 2 !== 0) {
      throw new Error("É necessário um número par de jogadores titulares (mínimo 4).");
    }

    const seed = tournament.randomSeed || "default";
    const playerMap = new Map<string, string>();
    const dbPlayers = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, fullName: true, nickname: true },
    });
    for (const p of dbPlayers) {
      playerMap.set(p.id, p.nickname || p.fullName);
    }

    const round1 = generateAmericanoRound1(playerIds, courts.length, seed);
    const round = await prisma.round.create({
      data: { tournamentId, index: 1 },
    });

    for (let m = 0; m < round1.matches.length; m++) {
      const match = round1.matches[m];
      const teamA = await prisma.team.create({
        data: {
          tournamentId,
          name: `${playerMap.get(match.team1[0]) || "?"} & ${playerMap.get(match.team1[1]) || "?"}`,
          player1Id: match.team1[0], player2Id: match.team1[1],
          isRandomGenerated: true, roundId: round.id,
        },
      });
      const teamB = await prisma.team.create({
        data: {
          tournamentId,
          name: `${playerMap.get(match.team2[0]) || "?"} & ${playerMap.get(match.team2[1]) || "?"}`,
          player1Id: match.team2[0], player2Id: match.team2[1],
          isRandomGenerated: true, roundId: round.id,
        },
      });
      const courtId = courts[match.courtIndex % courts.length]?.id || null;
      await prisma.match.create({
        data: {
          tournamentId, roundId: round.id, courtId, slotIndex: m,
          teamAId: teamA.id, teamBId: teamB.id,
          status: "SCHEDULED", resultType: "UNDECIDED",
        },
      });
    }

    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: "PUBLISHED" },
    });

    revalidatePath(`/torneios/${tournamentId}`);
    const generatedRounds = await prisma.round.count({ where: { tournamentId } });
    const generatedMatches = await prisma.match.count({ where: { tournamentId } });
    return { roundCount: generatedRounds, matchCount: generatedMatches };
  } else if (tournament.teamMode === "RANDOM_PER_ROUND") {
    // Re-use the same logic as generateSchedule for RANDOM_PER_ROUND
    const inscriptions = await prisma.tournamentInscription.findMany({
      where: { tournamentId, status: "TITULAR" },
      orderBy: { orderIndex: "asc" },
    });
    const playerIds = inscriptions.map((ins) => ins.playerId);

    if (playerIds.length < 4 || playerIds.length % 2 !== 0) {
      throw new Error("É necessário um número par de jogadores titulares (mínimo 4).");
    }

    const numRounds = tournament.numberOfRounds || (playerIds.length - 1);
    const seed = tournament.randomSeed || "default";
    const allRoundTeams = generateAllRoundTeams(playerIds, numRounds, seed);

    const playerMap = new Map<string, string>();
    const dbPlayers = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, fullName: true, nickname: true },
    });
    for (const p of dbPlayers) {
      playerMap.set(p.id, p.nickname || p.fullName);
    }

    // Optimize match assignments to maximize opponent variety across rounds
    const optimizedAssignments = optimizeMatchAssignments(allRoundTeams);

    // Build match-player info for court optimization
    const courtsHaveQuality2 = courts.some((c: any) => c.quality && c.quality !== "GOOD");
    let courtAssignments2: string[][] | null = null;
    if (courtsHaveQuality2 && courts.length > 1) {
      const matchInfoPerRound: { player1IdA: string; player2IdA?: string; player1IdB: string; player2IdB?: string }[][] = [];
      for (let r = 0; r < allRoundTeams.length; r++) {
        const roundPairs = allRoundTeams[r];
        const assignments = optimizedAssignments[r];
        const roundMatchInfo: { player1IdA: string; player2IdA?: string; player1IdB: string; player2IdB?: string }[] = [];
        for (const { teamAIndex, teamBIndex } of assignments) {
          const tA = roundPairs[teamAIndex];
          const tB = roundPairs[teamBIndex];
          roundMatchInfo.push({
            player1IdA: tA.player1Id, player2IdA: tA.player2Id,
            player1IdB: tB.player1Id, player2IdB: tB.player2Id,
          });
        }
        matchInfoPerRound.push(roundMatchInfo);
      }
      courtAssignments2 = optimizeCourtAssignments(
        matchInfoPerRound,
        courts.map((c: any) => ({ id: c.id, quality: c.quality || "GOOD" }))
      );
    }

    for (let r = 0; r < allRoundTeams.length; r++) {
      const round = await prisma.round.create({
        data: { tournamentId, index: r + 1 },
      });

      const roundTeamIds: { id: string; index: number }[] = [];
      const roundPairs = allRoundTeams[r];

      for (let t = 0; t < roundPairs.length; t++) {
        const pair = roundPairs[t];
        const p1Name = playerMap.get(pair.player1Id) || "?";
        const p2Name = playerMap.get(pair.player2Id) || "?";
        const team = await prisma.team.create({
          data: {
            tournamentId,
            name: `${p1Name} & ${p2Name}`,
            player1Id: pair.player1Id,
            player2Id: pair.player2Id,
            isRandomGenerated: true,
            roundId: round.id,
          },
        });
        roundTeamIds.push({ id: team.id, index: t });
      }

      // Use optimized match assignments (minimizes repeated opponents)
      const matchAssignments = optimizedAssignments[r];
      for (let m = 0; m < matchAssignments.length; m++) {
        const { teamAIndex, teamBIndex } = matchAssignments[m];
        const courtId = courtAssignments2
          ? courtAssignments2[r]?.[m] || courts[m % courts.length]?.id || null
          : courts[m % courts.length]?.id || null;
        await prisma.match.create({
          data: {
            tournamentId,
            roundId: round.id,
            courtId,
            slotIndex: m,
            teamAId: roundTeamIds[teamAIndex].id,
            teamBId: roundTeamIds[teamBIndex].id,
            status: "SCHEDULED",
            resultType: "UNDECIDED",
          },
        });
      }
    }
  } else {
    const teamRefs: TeamRef[] = tournament.teams.map((t, i) => ({
      id: t.id,
      index: i,
    }));

    const pairings = generateRoundRobinPairings(
      teamRefs,
      tournament.courtsCount,
      tournament.matchesPerPair,
      tournament.randomSeed || undefined
    );

    const roundMap = new Map<number, string>();

    for (const p of pairings) {
      if (!roundMap.has(p.roundIndex)) {
        const round = await prisma.round.create({
          data: { tournamentId, index: p.roundIndex },
        });
        roundMap.set(p.roundIndex, round.id);
      }

      const roundId = roundMap.get(p.roundIndex)!;
      const courtId = courts[p.courtIndex]?.id || null;

      await prisma.match.create({
        data: {
          tournamentId,
          roundId,
          courtId,
          slotIndex: p.slotIndex,
          teamAId: p.teamA.id,
          teamBId: p.teamB.id,
          status: "SCHEDULED",
          resultType: "UNDECIDED",
        },
      });
    }
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "PUBLISHED" },
  });

  // Recompute season rankings since results were deleted
  if (tournament.seasonId) await recomputeSeasonRanking(tournament.seasonId);

  revalidatePath(`/torneios/${tournamentId}`);
  const generatedRounds = await prisma.round.count({ where: { tournamentId } });
  const generatedMatches = await prisma.match.count({ where: { tournamentId } });
  return { roundCount: generatedRounds, matchCount: generatedMatches };
}

// ── Americano: compute individual standings ──

export async function getAmericanoStandings(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      rounds: {
        include: {
          matches: {
            include: {
              teamA: { include: { player1: true, player2: true } },
              teamB: { include: { player1: true, player2: true } },
            },
          },
        },
        orderBy: { index: "asc" },
      },
    },
  });

  if (!tournament) throw new Error("Torneio não encontrado.");

  const playerStats = new Map<string, {
    id: string;
    name: string;
    points: number;
    matches: number;
    wins: number;
    setsWon: number;
    setsLost: number;
  }>();

  // Initialize all players from inscriptions
  const inscriptions = await prisma.tournamentInscription.findMany({
    where: { tournamentId, status: "TITULAR" },
    include: { player: true },
  });

  for (const insc of inscriptions) {
    playerStats.set(insc.playerId, {
      id: insc.playerId,
      name: insc.player.nickname || insc.player.fullName,
      points: 0,
      matches: 0,
      wins: 0,
      setsWon: 0,
      setsLost: 0,
    });
  }

  // Points config: 2 points per set won, 3 bonus for match victory
  const POINTS_PER_SET = 2;
  const BONUS_WIN = 3;

  for (const round of tournament.rounds) {
    for (const match of round.matches) {
      if (match.status !== "FINISHED") continue;

      const teamAPlayerIds = [match.teamA.player1Id, match.teamA.player2Id].filter(Boolean) as string[];
      const teamBPlayerIds = [match.teamB.player1Id, match.teamB.player2Id].filter(Boolean) as string[];

      // Count sets won by each side
      let setsWonA = 0;
      let setsWonB = 0;
      const sets = [
        [match.set1A, match.set1B],
        [match.set2A, match.set2B],
        [match.set3A, match.set3B],
      ];
      for (const [a, b] of sets) {
        if (a !== null && b !== null) {
          if (a > b) setsWonA++;
          else if (b > a) setsWonB++;
        }
      }

      const isWinA = match.resultType === "WIN_A";
      const isWinB = match.resultType === "WIN_B";

      // Update stats for team A players
      for (const pid of teamAPlayerIds) {
        const stat = playerStats.get(pid);
        if (!stat) continue;
        stat.matches++;
        stat.setsWon += setsWonA;
        stat.setsLost += setsWonB;
        stat.points += setsWonA * POINTS_PER_SET;
        if (isWinA) {
          stat.wins++;
          stat.points += BONUS_WIN;
        }
      }

      // Update stats for team B players
      for (const pid of teamBPlayerIds) {
        const stat = playerStats.get(pid);
        if (!stat) continue;
        stat.matches++;
        stat.setsWon += setsWonB;
        stat.setsLost += setsWonA;
        stat.points += setsWonB * POINTS_PER_SET;
        if (isWinB) {
          stat.wins++;
          stat.points += BONUS_WIN;
        }
      }
    }
  }

  // Sort: points desc, wins desc, set difference desc
  const standings = [...playerStats.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return (b.setsWon - b.setsLost) - (a.setsWon - a.setsLost);
  });

  return standings;
}

// ── Americano: generate next round ──

export async function generateNextAmericanoRoundAction(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      rounds: {
        include: { matches: true },
        orderBy: { index: "asc" },
      },
      teams: true,
      courts: true,
      tournamentCourts: { include: { court: true }, orderBy: { court: { orderIndex: "asc" } } },
    },
  });

  if (!tournament) throw new Error("Torneio não encontrado.");
  await requireLeagueManager(tournament.leagueId ?? "");

  if (tournament.teamMode !== "AMERICANO") {
    throw new Error("Este torneio não é do formato Americano.");
  }

  const maxRounds = tournament.numberOfRounds || 999;
  const currentRoundCount = tournament.rounds.length;

  if (currentRoundCount >= maxRounds) {
    throw new Error("Todas as rondas já foram geradas.");
  }

  // Verify all matches in current round are FINISHED
  const lastRound = tournament.rounds[tournament.rounds.length - 1];
  if (!lastRound) throw new Error("Não há rondas existentes.");

  const allFinished = lastRound.matches.every((m) => m.status === "FINISHED");
  if (!allFinished) {
    throw new Error("Todos os jogos da ronda atual devem estar terminados antes de gerar a próxima ronda.");
  }

  // Get player IDs
  const inscriptions = await prisma.tournamentInscription.findMany({
    where: { tournamentId, status: "TITULAR" },
    orderBy: { orderIndex: "asc" },
  });
  const playerIds = inscriptions.map((ins) => ins.playerId);

  // Get player names
  const playerMap = new Map<string, string>();
  const dbPlayers = await prisma.player.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, fullName: true, nickname: true },
  });
  for (const p of dbPlayers) {
    playerMap.set(p.id, p.nickname || p.fullName);
  }

  // Compute current standings
  const standings = await getAmericanoStandings(tournamentId);

  // Build previous pairings from all existing teams
  const previousPairings: [string, string][] = [];
  for (const team of tournament.teams) {
    if (team.player1Id && team.player2Id) {
      previousPairings.push([team.player1Id, team.player2Id]);
    }
  }

  const courts = tournament.tournamentCourts.length > 0
    ? tournament.tournamentCourts.map((tc) => tc.court)
    : tournament.courts;

  const nextRoundIndex = currentRoundCount + 1;
  const result = generateNextAmericanoRoundAlgo(
    playerIds,
    courts.length,
    standings.map((s) => ({ playerId: s.id, points: s.points })),
    previousPairings,
    nextRoundIndex
  );

  // Create round
  const round = await prisma.round.create({
    data: { tournamentId, index: nextRoundIndex },
  });

  // Create teams and matches
  for (let m = 0; m < result.matches.length; m++) {
    const matchDef = result.matches[m];
    const teamA = await prisma.team.create({
      data: {
        tournamentId,
        name: `${playerMap.get(matchDef.team1[0]) || "?"} & ${playerMap.get(matchDef.team1[1]) || "?"}`,
        player1Id: matchDef.team1[0],
        player2Id: matchDef.team1[1],
        isRandomGenerated: true,
        roundId: round.id,
      },
    });

    const teamB = await prisma.team.create({
      data: {
        tournamentId,
        name: `${playerMap.get(matchDef.team2[0]) || "?"} & ${playerMap.get(matchDef.team2[1]) || "?"}`,
        player1Id: matchDef.team2[0],
        player2Id: matchDef.team2[1],
        isRandomGenerated: true,
        roundId: round.id,
      },
    });

    const courtId = courts[matchDef.courtIndex % courts.length]?.id || null;
    await prisma.match.create({
      data: {
        tournamentId,
        roundId: round.id,
        courtId,
        slotIndex: m,
        teamAId: teamA.id,
        teamBId: teamB.id,
        status: "SCHEDULED",
        resultType: "UNDECIDED",
      },
    });
  }

  revalidatePath(`/torneios/${tournamentId}`);
  return { success: true, roundIndex: nextRoundIndex };
}

// ── Sobe e Desce: standings (same scoring as Americano) ──

export async function getSobeDesceStandings(tournamentId: string) {
  return getAmericanoStandings(tournamentId);
}

// ── Sobe e Desce: generate next round ──

export async function generateNextSobeDesceRoundAction(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      rounds: {
        include: { matches: { include: { teamA: true, teamB: true } } },
        orderBy: { index: "asc" },
      },
      teams: true,
      courts: true,
      tournamentCourts: { include: { court: true }, orderBy: { court: { orderIndex: "asc" } } },
    },
  });

  if (!tournament) throw new Error("Torneio não encontrado.");
  await requireLeagueManager(tournament.leagueId ?? "");

  if (tournament.teamMode !== "SOBE_DESCE") {
    throw new Error("Este torneio não é do formato Sobe e Desce.");
  }

  const maxRounds = tournament.numberOfRounds || 999;
  const currentRoundCount = tournament.rounds.length;

  if (currentRoundCount >= maxRounds) {
    throw new Error("Todas as rondas já foram geradas.");
  }

  const lastRound = tournament.rounds[tournament.rounds.length - 1];
  if (!lastRound) throw new Error("Não há rondas existentes.");

  const allFinished = lastRound.matches.every((m) => m.status === "FINISHED");
  if (!allFinished) {
    throw new Error("Todos os jogos da ronda atual devem estar terminados antes de gerar a próxima ronda.");
  }

  const courts = tournament.tournamentCourts.length > 0
    ? tournament.tournamentCourts.map((tc) => tc.court)
    : tournament.courts;

  // Get player names
  const inscriptions = await prisma.tournamentInscription.findMany({
    where: { tournamentId, status: "TITULAR" },
    include: { player: true },
  });
  const playerMap = new Map<string, string>();
  for (const ins of inscriptions) {
    playerMap.set(ins.playerId, ins.player.nickname || ins.player.fullName);
  }

  // Build previous round matches with court index and winner
  const previousRoundMatches: {
    courtIndex: number;
    team1: [string, string];
    team2: [string, string];
    winnerTeam: 1 | 2;
  }[] = [];

  for (const match of lastRound.matches) {
    // Determine court index from the court assignment
    const courtId = match.courtId;
    let courtIndex = 0;
    if (courtId) {
      const idx = courts.findIndex((c: any) => c.id === courtId);
      if (idx >= 0) courtIndex = idx;
    }

    const team1: [string, string] = [match.teamA.player1Id!, match.teamA.player2Id!];
    const team2: [string, string] = [match.teamB.player1Id!, match.teamB.player2Id!];
    const winnerTeam: 1 | 2 = match.resultType === "WIN_A" ? 1 : 2;

    previousRoundMatches.push({ courtIndex, team1, team2, winnerTeam });
  }

  const nextRoundIndex = currentRoundCount + 1;
  const result = generateNextSobeDesceRound(previousRoundMatches, courts.length, nextRoundIndex);

  // Create round
  const round = await prisma.round.create({
    data: { tournamentId, index: nextRoundIndex },
  });

  // Create teams and matches
  for (let m = 0; m < result.matches.length; m++) {
    const matchDef = result.matches[m];
    const teamA = await prisma.team.create({
      data: {
        tournamentId,
        name: `${playerMap.get(matchDef.team1[0]) || "?"} & ${playerMap.get(matchDef.team1[1]) || "?"}`,
        player1Id: matchDef.team1[0],
        player2Id: matchDef.team1[1],
        isRandomGenerated: true,
        roundId: round.id,
      },
    });

    const teamB = await prisma.team.create({
      data: {
        tournamentId,
        name: `${playerMap.get(matchDef.team2[0]) || "?"} & ${playerMap.get(matchDef.team2[1]) || "?"}`,
        player1Id: matchDef.team2[0],
        player2Id: matchDef.team2[1],
        isRandomGenerated: true,
        roundId: round.id,
      },
    });

    const courtId = courts[matchDef.courtIndex % courts.length]?.id || null;
    await prisma.match.create({
      data: {
        tournamentId,
        roundId: round.id,
        courtId,
        slotIndex: m,
        teamAId: teamA.id,
        teamBId: teamB.id,
        status: "SCHEDULED",
        resultType: "UNDECIDED",
      },
    });
  }

  revalidatePath(`/torneios/${tournamentId}`);
  return { success: true, roundIndex: nextRoundIndex };
}

export async function getTournament(id: string) {
  const result = await prisma.tournament.findUnique({
    where: { id },
    include: {
      league: true,
      season: true,
      teams: {
        include: { player1: true, player2: true },
      },
      courts: true,
      tournamentCourts: { include: { court: true }, orderBy: { court: { orderIndex: "asc" } } },
      rounds: {
        orderBy: { index: "asc" },
        include: {
          matches: {
            orderBy: { slotIndex: "asc" },
            include: {
              teamA: { include: { player1: true, player2: true } },
              teamB: { include: { player1: true, player2: true } },
              court: true,
            },
          },
        },
      },
      inscriptions: {
        orderBy: { orderIndex: "asc" },
        include: { player: true },
      },
    },
  });
  return serialize(result);
}

// ── Match scoring ──

export async function setMatchEvent(
  matchId: string,
  event: string,
  eventNote?: string | null
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { tournament: { include: { season: true } } },
    });
    if (!match) return { success: false, error: "Jogo não encontrado." };
    await requireLeagueManager(match.tournament.leagueId ?? "");

    const validEvents = ["NONE", "WALKOVER_A", "WALKOVER_B", "CANCELLED", "INJURY", "POSTPONED"];
    if (!validEvents.includes(event)) return { success: false, error: "Evento inválido." };

    // For WALKOVER: auto-fill score and mark FINISHED
    if (event === "WALKOVER_A" || event === "WALKOVER_B") {
      const winnerTeamId = event === "WALKOVER_A" ? match.teamAId : match.teamBId;
      await prisma.match.update({
        where: { id: matchId },
        data: {
          event,
          eventNote: eventNote || null,
          set1A: event === "WALKOVER_A" ? 7 : 0,
          set1B: event === "WALKOVER_A" ? 0 : 7,
          set2A: null,
          set2B: null,
          set3A: null,
          set3B: null,
          status: "FINISHED",
          resultType: event === "WALKOVER_A" ? "WIN_A" : "WIN_B",
          winnerTeamId,
          playedAt: new Date(),
        },
      });
      if (match.tournament.seasonId) await recomputeSeasonRanking(match.tournament.seasonId);
    } else if (event === "CANCELLED") {
      // Cancelled: clear scores, keep SCHEDULED, won't count for ranking
      await prisma.match.update({
        where: { id: matchId },
        data: {
          event,
          eventNote: eventNote || null,
          set1A: null, set1B: null,
          set2A: null, set2B: null,
          set3A: null, set3B: null,
          status: "SCHEDULED",
          resultType: "UNDECIDED",
          winnerTeamId: null,
          playedAt: null,
        },
      });
      if (match.tournament.seasonId) await recomputeSeasonRanking(match.tournament.seasonId);
    } else if (event === "NONE") {
      // Remove event, reset to clean state
      await prisma.match.update({
        where: { id: matchId },
        data: { event: "NONE", eventNote: null },
      });
    } else {
      // INJURY, POSTPONED: just mark the event
      await prisma.match.update({
        where: { id: matchId },
        data: { event, eventNote: eventNote || null },
      });
    }

    logAudit("SET_MATCH_EVENT", "Match", matchId, { event, eventNote }).catch(() => {});
    revalidatePath(`/torneios/${match.tournamentId}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Erro ao definir evento." };
  }
}

export async function startMatch(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { tournament: { select: { seasonId: true, leagueId: true, season: { select: { leagueId: true } } } } },
  });
  if (!match) throw new Error("Jogo não encontrado.");
  await requireLeagueManager(match.tournament.season?.leagueId ?? match.tournament.leagueId ?? "");
  if (match.status !== "SCHEDULED") throw new Error("Jogo já foi iniciado ou terminado.");

  await prisma.match.update({
    where: { id: matchId },
    data: { status: "IN_PROGRESS" },
  });

  revalidatePath(`/torneios`);
  return { success: true };
}

export async function saveMatchScore(
  matchId: string,
  scores: {
    set1A: number | null;
    set1B: number | null;
    set2A: number | null;
    set2B: number | null;
    set3A: number | null;
    set3B: number | null;
  }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: { include: { season: true } },
        teamA: true,
        teamB: true,
      },
    });

    if (!match) return { success: false, error: "Jogo não encontrado." };
    await requireLeagueManager(match.tournament.leagueId ?? "");

    const allowDraws = match.tournament.season?.allowDraws ?? false;
    // Use knockoutSets for elimination matches if configured
    const isKnockoutMatch = match.bracketPhase && match.bracketPhase !== "GROUP";
    const numberOfSets = (isKnockoutMatch && match.tournament.knockoutSets)
      ? match.tournament.knockoutSets
      : match.tournament.numberOfSets;

    // Validate scores
    const validationError = validateMatchScores(
      scores.set1A, scores.set1B,
      scores.set2A, scores.set2B,
      scores.set3A, scores.set3B,
      allowDraws,
      numberOfSets
    );

    if (validationError) return { success: false, error: validationError };

    // Determine result
    const result = determineResult(
      scores.set1A!, scores.set1B!,
      scores.set2A, scores.set2B,
      scores.set3A, scores.set3B,
      allowDraws,
      numberOfSets
    );

    const winnerTeamId =
      result.resultType === "WIN_A" ? match.teamAId :
      result.resultType === "WIN_B" ? match.teamBId :
      null;

    // Update match
    await prisma.match.update({
      where: { id: matchId },
      data: {
        ...scores,
        status: "FINISHED",
        resultType: result.resultType,
        winnerTeamId,
        playedAt: new Date(),
      },
    });

    // Check if tournament should move to RUNNING
    await prisma.tournament.update({
      where: { id: match.tournamentId },
      data: { status: "RUNNING" },
    });

    // Recompute season ranking
    if (match.tournament.seasonId) {
      await recomputeSeasonRanking(match.tournament.seasonId);
    }

    // Update Elo ratings (fire-and-forget)
    updateEloAfterMatch(matchId).catch((err) =>
      console.error("[ELO] Erro ao atualizar ratings:", (err as Error).message)
    );

    // Progress knockout bracket if this is an elimination match
    if (match.bracketPhase && match.bracketPhase !== "GROUP" && winnerTeamId) {
      const { progressBracket } = await import("./actions/group-knockout-actions");
      progressBracket(matchId).catch((err) =>
        console.error("[BRACKET] Erro ao progredir bracket:", (err as Error).message)
      );
    }

    // Complete ladder challenge if applicable
    completeLadderMatch(matchId).catch((err) =>
      console.error("[LADDER] Erro ao completar desafio:", (err as Error).message)
    );

    logAudit("SAVE_MATCH", "Match", matchId, { scores }).catch(() => {});

    // Notify players about match result (fire-and-forget)
    (async () => {
      try {
        const playerIds = [
          match.teamA.player1Id,
          match.teamA.player2Id,
          match.teamB.player1Id,
          match.teamB.player2Id,
        ].filter(Boolean) as string[];

        const users = await prisma.user.findMany({
          where: { playerId: { in: playerIds } },
          select: { id: true },
        });

        const userIds = users.map((u) => u.id);
        if (userIds.length > 0) {
          const scoreText = [
            scores.set1A != null && scores.set1B != null ? `${scores.set1A}-${scores.set1B}` : null,
            scores.set2A != null && scores.set2B != null ? `${scores.set2A}-${scores.set2B}` : null,
            scores.set3A != null && scores.set3B != null ? `${scores.set3A}-${scores.set3B}` : null,
          ].filter(Boolean).join(", ");

          await createNotificationBulk(userIds, {
            title: "Resultado registado",
            message: `${match.teamA.name} vs ${match.teamB.name}: ${scoreText}`,
            type: "RESULT",
            href: `/torneios/${match.tournamentId}`,
          });
        }
      } catch {
        // Fire-and-forget: never disrupt the main flow
      }
    })();

    revalidatePath(`/torneios/${match.tournamentId}`);
    return { success: true };
  } catch (e) {
    const msg = (e as Error).message || "";
    if (msg.includes("Não autenticado") || msg.includes("Sem permissão") || msg.includes("Não é gestor") || msg.includes("PLAN_")) {
      const { sanitizeError } = await import("./error-utils");
      return { success: false, error: sanitizeError(e) };
    }
    return { success: false, error: "Erro ao guardar o resultado. Tente novamente." };
  }
}

export async function resetMatch(matchId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { tournament: true },
    });

    if (!match) return { success: false, error: "Jogo não encontrado." };
    await requireLeagueManager(match.tournament.leagueId ?? "");

    await prisma.match.update({
      where: { id: matchId },
      data: {
        set1A: null, set1B: null,
        set2A: null, set2B: null,
        set3A: null, set3B: null,
        status: "SCHEDULED",
        resultType: "UNDECIDED",
        winnerTeamId: null,
        playedAt: null,
      },
    });

    // Recompute rankings
    if (match.tournament.seasonId) await recomputeSeasonRanking(match.tournament.seasonId);

    logAudit("RESET_MATCH", "Match", matchId).catch(() => {});

    revalidatePath(`/torneios/${match.tournamentId}`);
    return { success: true };
  } catch (e) {
    const msg = (e as Error).message || "";
    if (msg.includes("Não autenticado") || msg.includes("Sem permissão") || msg.includes("Não é gestor")) {
      return { success: false, error: msg };
    }
    return { success: false, error: "Erro ao repor o jogo. Tente novamente." };
  }
}

export async function updateTeamName(teamId: string, name: string) {
  if (!name?.trim()) throw new Error("Nome da equipa é obrigatório.");

  const team = await prisma.team.update({
    where: { id: teamId },
    data: { name: name.trim() },
  });

  revalidatePath(`/torneios/${team.tournamentId}`);
}

// ── Troca de jogadores (Admin only) ──

export async function swapTournamentPlayers(
  tournamentId: string,
  playerAId: string,
  playerBId: string
) {
  await requireAdmin();

  if (playerAId === playerBId) throw new Error("Os dois jogadores devem ser diferentes.");

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      teams: { include: { player1: true, player2: true } },
    },
  });

  if (!tournament) throw new Error("Torneio não encontrado.");

  // Fetch player names for team name generation
  const [playerA, playerB] = await Promise.all([
    prisma.player.findUnique({ where: { id: playerAId }, select: { fullName: true, nickname: true } }),
    prisma.player.findUnique({ where: { id: playerBId }, select: { fullName: true, nickname: true } }),
  ]);

  if (!playerA || !playerB) throw new Error("Jogador não encontrado.");

  const nameA = playerA.nickname || playerA.fullName.split(" ")[0];
  const nameB = playerB.nickname || playerB.fullName.split(" ")[0];

  // Build a map of all player names (from teams) for team name generation
  const playerNames = new Map<string, string>();
  for (const team of tournament.teams) {
    if (team.player1) {
      playerNames.set(team.player1.id, team.player1.nickname || team.player1.fullName.split(" ")[0]);
    }
    if (team.player2) {
      playerNames.set(team.player2.id, team.player2.nickname || team.player2.fullName.split(" ")[0]);
    }
  }
  // Ensure swapped players have their names
  playerNames.set(playerAId, nameA);
  playerNames.set(playerBId, nameB);

  // Compute all team updates
  const teamUpdates: { id: string; player1Id: string; player2Id: string | null; name: string }[] = [];

  for (const team of tournament.teams) {
    let newP1 = team.player1Id;
    let newP2 = team.player2Id;
    let changed = false;

    if (team.player1Id === playerAId) { newP1 = playerBId; changed = true; }
    else if (team.player1Id === playerBId) { newP1 = playerAId; changed = true; }

    if (team.player2Id === playerAId) { newP2 = playerBId; changed = true; }
    else if (team.player2Id === playerBId) { newP2 = playerAId; changed = true; }

    if (changed) {
      const p1Name = playerNames.get(newP1) || "";
      const p2Name = newP2 ? (playerNames.get(newP2) || "") : null;
      const teamName = p2Name ? `${p1Name} & ${p2Name}` : p1Name;
      teamUpdates.push({ id: team.id, player1Id: newP1, player2Id: newP2, name: teamName });
    }
  }

  // Run all updates in a single transaction (avoids unique constraint issues on inscriptions)
  await prisma.$transaction(async (tx) => {
    // 1. Update all teams
    for (const upd of teamUpdates) {
      await tx.team.update({
        where: { id: upd.id },
        data: { player1Id: upd.player1Id, player2Id: upd.player2Id, name: upd.name },
      });
    }

    // 2. Swap inscriptions — delete and re-create to avoid unique constraint violation
    const inscriptions = await tx.tournamentInscription.findMany({
      where: { tournamentId, playerId: { in: [playerAId, playerBId] } },
    });

    if (inscriptions.length > 0) {
      const insA = inscriptions.find((i) => i.playerId === playerAId);
      const insB = inscriptions.find((i) => i.playerId === playerBId);

      // Delete existing inscriptions
      await tx.tournamentInscription.deleteMany({
        where: { id: { in: inscriptions.map((i) => i.id) } },
      });

      // Re-create with swapped player IDs
      if (insA) {
        await tx.tournamentInscription.create({
          data: {
            tournamentId,
            playerId: playerBId,
            orderIndex: insA.orderIndex,
            status: insA.status,
            replacesId: insA.replacesId,
          },
        });
      }
      if (insB) {
        await tx.tournamentInscription.create({
          data: {
            tournamentId,
            playerId: playerAId,
            orderIndex: insB.orderIndex,
            status: insB.status,
            replacesId: insB.replacesId,
          },
        });
      }
    }
  });

  // Recompute season ranking if tournament has results
  if (tournament.seasonId) await recomputeSeasonRanking(tournament.seasonId);

  logAudit("SWAP_PLAYERS", "Tournament", tournamentId, { playerAId, playerBId }).catch(() => {});
  revalidatePath(`/torneios/${tournamentId}`, "page");
  if (tournament.leagueId) revalidatePath(`/ligas/${tournament.leagueId}`);
}

// ── Check-in de jogadores ──

export async function checkInPlayer(tournamentId: string, playerId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { seasonId: true, leagueId: true, season: { select: { leagueId: true } }, status: true },
  });
  if (!tournament) throw new Error("Torneio não encontrado.");
  await requireLeagueManager(tournament.season?.leagueId ?? tournament.leagueId ?? "");

  const inscription = await prisma.tournamentInscription.findUnique({
    where: { tournamentId_playerId: { tournamentId, playerId } },
  });
  if (!inscription) throw new Error("Inscrição não encontrada.");

  await prisma.tournamentInscription.update({
    where: { id: inscription.id },
    data: {
      checkedIn: !inscription.checkedIn,
      checkedInAt: !inscription.checkedIn ? new Date() : null,
    },
  });

  revalidatePath(`/torneios/${tournamentId}`);
  return { checkedIn: !inscription.checkedIn };
}

export async function checkInAllPlayers(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { seasonId: true, leagueId: true, season: { select: { leagueId: true } }, status: true },
  });
  if (!tournament) throw new Error("Torneio não encontrado.");
  await requireLeagueManager(tournament.season?.leagueId ?? tournament.leagueId ?? "");

  await prisma.tournamentInscription.updateMany({
    where: {
      tournamentId,
      status: { in: ["TITULAR", "PROMOVIDO"] },
      checkedIn: false,
    },
    data: {
      checkedIn: true,
      checkedInAt: new Date(),
    },
  });

  revalidatePath(`/torneios/${tournamentId}`);
}

// ── Desistência / Substituição automática ──

export async function desistPlayer(tournamentId: string, playerId: string) {
  // 1. Validate permissions
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { teams: true },
  });
  if (!tournament) throw new Error("Torneio não encontrado.");
  await requireLeagueManager(tournament.leagueId ?? "");

  // 2. Find the player's inscription (must be TITULAR or PROMOVIDO)
  const inscription = await prisma.tournamentInscription.findUnique({
    where: { tournamentId_playerId: { tournamentId, playerId } },
  });
  if (!inscription) throw new Error("Jogador não está inscrito neste torneio.");
  if (inscription.status !== "TITULAR" && inscription.status !== "PROMOVIDO") {
    throw new Error("Jogador não está como titular neste torneio.");
  }

  // 3. Mark as DESISTIU
  await prisma.tournamentInscription.update({
    where: { id: inscription.id },
    data: { status: "DESISTIU" },
  });

  // 4. Find next SUPLENTE (FIFO by orderIndex)
  const nextSuplente = await prisma.tournamentInscription.findFirst({
    where: { tournamentId, status: "SUPLENTE" },
    orderBy: { orderIndex: "asc" },
  });

  if (nextSuplente) {
    // 5a. Promote the substitute
    await prisma.tournamentInscription.update({
      where: { id: nextSuplente.id },
      data: { status: "PROMOVIDO", replacesId: inscription.id },
    });

    // 5b. Find the team of the desisting player and replace
    const team = tournament.teams.find(
      (t) => t.player1Id === playerId || t.player2Id === playerId
    );

    if (team) {
      const isPlayer1 = team.player1Id === playerId;
      const updateData: any = {};

      if (isPlayer1) {
        updateData.player1Id = nextSuplente.playerId;
      } else {
        updateData.player2Id = nextSuplente.playerId;
      }

      // For 1v1, also update team name
      if (tournament.teamSize === 1) {
        const substitutePlayer = await prisma.player.findUnique({
          where: { id: nextSuplente.playerId },
        });
        if (substitutePlayer) {
          updateData.name = substitutePlayer.nickname || substitutePlayer.fullName.split(" ")[0];
        }
      }

      await prisma.team.update({
        where: { id: team.id },
        data: updateData,
      });

      // Send promotion email to the substitute (fire-and-forget)
      const promotedPlayer = await prisma.player.findUnique({
        where: { id: nextSuplente.playerId },
        include: { user: true },
      });
      if (promotedPlayer?.user?.email) {
        const league = tournament.leagueId ? await prisma.league.findUnique({ where: { id: tournament.leagueId } }) : null;
        sendEmail({
          to: promotedPlayer.user.email,
          subject: `CopaPro: Foi promovido a titular no torneio ${tournament.name}!`,
          html: substitutePromotedEmail({
            playerName: promotedPlayer.fullName,
            tournamentName: tournament.name,
            leagueName: league?.name || "",
            teamName: team.name,
          }),
        });
      }
    }
  }

  revalidatePath(`/torneios/${tournamentId}`);
  return { success: true, promoted: nextSuplente ? true : false };
}

// ── Ranking recomputation ──

export async function recomputeSeasonRanking(seasonId: string) {
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
  });

  if (!season) return;

  // Build point config from season settings
  const pointConfig = {
    pointsWin: season.pointsWin,
    pointsDraw: season.pointsDraw,
    pointsLoss: season.pointsLoss,
    pointsSetWon: season.pointsSetWon,
  };

  // Get all finished matches in this season
  const matches = await prisma.match.findMany({
    where: {
      tournament: { seasonId },
      status: "FINISHED",
    },
    include: {
      teamA: true,
      teamB: true,
    },
  });

  // Compute all deltas with configurable points
  const allDeltas = matches.flatMap((m) =>
    computeMatchContribution(
      {
        set1A: m.set1A,
        set1B: m.set1B,
        set2A: m.set2A,
        set2B: m.set2B,
        set3A: m.set3A,
        set3B: m.set3B,
        status: m.status,
        resultType: m.resultType,
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        teamA: { player1Id: m.teamA.player1Id, player2Id: m.teamA.player2Id },
        teamB: { player1Id: m.teamB.player1Id, player2Id: m.teamB.player2Id },
        event: (m as any).event || "NONE",
      },
      season.allowDraws,
      pointConfig
    )
  );

  // Aggregate
  const playerMap = new Map<string, {
    pointsTotal: number;
    matchesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    setsWon: number;
    setsLost: number;
  }>();

  for (const d of allDeltas) {
    const e = playerMap.get(d.playerId) || {
      pointsTotal: 0, matchesPlayed: 0, wins: 0, draws: 0,
      losses: 0, setsWon: 0, setsLost: 0,
    };
    e.pointsTotal += d.points;
    e.matchesPlayed += d.matchesPlayed;
    e.wins += d.wins;
    e.draws += d.draws;
    e.losses += d.losses;
    e.setsWon += d.setsWon;
    e.setsLost += d.setsLost;
    playerMap.set(d.playerId, e);
  }

  // Also include league members who haven't played yet (with 0 stats)
  const leagueMemberships = await prisma.leagueMembership.findMany({
    where: { leagueId: season.leagueId, status: "APPROVED" },
    include: { user: { select: { playerId: true } } },
  });

  for (const membership of leagueMemberships) {
    if (membership.user.playerId && !playerMap.has(membership.user.playerId)) {
      playerMap.set(membership.user.playerId, {
        pointsTotal: 0,
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        setsWon: 0,
        setsLost: 0,
      });
    }
  }

  // Fetch existing manual adjustments to preserve them
  const existingAdjustments = await prisma.seasonRankingEntry.findMany({
    where: { seasonId, manualAdjustment: { not: 0 } },
    select: { playerId: true, manualAdjustment: true, adjustmentNote: true },
  });
  const adjustmentMap = new Map(existingAdjustments.map((a) => [a.playerId, { manualAdjustment: a.manualAdjustment, adjustmentNote: a.adjustmentNote }]));

  // Delete old rankings and insert new ones (transactional)
  await prisma.$transaction(async (tx) => {
    await tx.seasonRankingEntry.deleteMany({ where: { seasonId } });

    for (const [playerId, data] of playerMap.entries()) {
      const adj = adjustmentMap.get(playerId);
      const manualAdjustment = adj?.manualAdjustment ?? 0;
      await tx.seasonRankingEntry.create({
        data: {
          seasonId,
          playerId,
          ...data,
          pointsTotal: data.pointsTotal + manualAdjustment,
          setsDiff: data.setsWon - data.setsLost,
          manualAdjustment,
          adjustmentNote: adj?.adjustmentNote ?? null,
        },
      });
    }
  });
}

export async function adjustPlayerRanking(
  seasonId: string,
  playerId: string,
  adjustment: number,
  note: string | null
) {
  "use server";
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: { leagueId: true },
  });
  if (!season) throw new Error("Época não encontrada.");
  await requireLeagueManager(season.leagueId);

  // Update or create the ranking entry with manual adjustment
  const existing = await prisma.seasonRankingEntry.findUnique({
    where: { seasonId_playerId: { seasonId, playerId } },
  });

  if (!existing) throw new Error("Jogador não encontrado no ranking.");

  // Compute the delta: new adjustment replaces old one
  const pointsDelta = adjustment - existing.manualAdjustment;

  await prisma.seasonRankingEntry.update({
    where: { seasonId_playerId: { seasonId, playerId } },
    data: {
      manualAdjustment: adjustment,
      adjustmentNote: note,
      pointsTotal: existing.pointsTotal + pointsDelta,
    },
  });

  logAudit("ADJUST_RANKING", "SeasonRankingEntry", `${seasonId}/${playerId}`, { adjustment, note }).catch(() => {});
  revalidatePath(`/ligas`);
}

// ── Tournament finalize ──

export async function finishTournament(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      matches: true,
      rounds: { include: { matches: { select: { id: true, status: true } } } },
    },
  });

  if (!tournament) throw new Error("Torneio não encontrado.");
  await requireLeagueManager(tournament.leagueId ?? "");

  const finishedCount = tournament.matches.filter((m) => m.status === "FINISHED").length;
  if (finishedCount === 0) {
    throw new Error("Não é possível encerrar um torneio sem nenhum jogo completo.");
  }

  // Delete incomplete matches and empty rounds
  const unfinishedMatchIds = tournament.matches
    .filter((m) => m.status !== "FINISHED")
    .map((m) => m.id);

  if (unfinishedMatchIds.length > 0) {
    await prisma.match.deleteMany({
      where: { id: { in: unfinishedMatchIds } },
    });
  }

  // Find rounds that now have no matches (all their matches were unfinished)
  const emptyRoundIds = tournament.rounds
    .filter((r) => r.matches.every((m) => m.status !== "FINISHED"))
    .map((r) => r.id);

  if (emptyRoundIds.length > 0) {
    // For RANDOM_PER_ROUND/AMERICANO/SOBE_DESCE: delete teams linked to empty rounds
    if (tournament.teamMode === "RANDOM_PER_ROUND" || tournament.teamMode === "AMERICANO" || tournament.teamMode === "SOBE_DESCE") {
      await prisma.team.deleteMany({
        where: { roundId: { in: emptyRoundIds } },
      });
    }
    await prisma.round.deleteMany({
      where: { id: { in: emptyRoundIds } },
    });
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "FINISHED" },
  });

  // Recompute season rankings (in case unfinished matches were deleted)
  if (tournament.seasonId) await recomputeSeasonRanking(tournament.seasonId);

  // ── Email: notify all participants with final standings ──
  try {
    const fullTournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        league: { select: { name: true } },
        teams: { include: { player1: true, player2: true } },
        matches: true,
        inscriptions: {
          where: { status: { in: ["TITULAR", "PROMOVIDO"] } },
          include: { player: { include: { user: { select: { email: true } } } } },
        },
      },
    });

    if (fullTournament) {
      // Compute standings per team
      const teamStats = new Map<string, { name: string; points: number; wins: number; losses: number }>();
      for (const team of fullTournament.teams) {
        teamStats.set(team.id, { name: team.name, points: 0, wins: 0, losses: 0 });
      }
      for (const m of fullTournament.matches) {
        if (m.status !== "FINISHED") continue;
        const sA = teamStats.get(m.teamAId!);
        const sB = teamStats.get(m.teamBId!);
        // Count sets won
        const sets: { a: number; b: number }[] = [];
        if (m.set1A !== null && m.set1B !== null) sets.push({ a: m.set1A, b: m.set1B });
        if (m.set2A !== null && m.set2B !== null) sets.push({ a: m.set2A, b: m.set2B });
        if (m.set3A !== null && m.set3B !== null) sets.push({ a: m.set3A, b: m.set3B });
        let setsA = 0, setsB = 0;
        for (const s of sets) { if (s.a > s.b) setsA++; else if (s.b > s.a) setsB++; }
        if (sA) { sA.points += setsA * 2; }
        if (sB) { sB.points += setsB * 2; }
        if (m.resultType === "WIN_A") { if (sA) { sA.points += 3; sA.wins++; } if (sB) { sB.losses++; } }
        else if (m.resultType === "WIN_B") { if (sB) { sB.points += 3; sB.wins++; } if (sA) { sA.losses++; } }
      }
      const rankings = [...teamStats.values()]
        .sort((a, b) => b.points - a.points)
        .map((t, i) => ({ position: i + 1, teamName: t.name, points: t.points, wins: t.wins, losses: t.losses }));

      const appUrl = process.env.APP_URL || "https://copapro.pt";
      const tournamentUrl = `${appUrl}/torneios/${tournamentId}`;

      for (const ins of fullTournament.inscriptions) {
        const email = ins.player?.user?.email;
        if (email) {
          sendEmail({
            to: email,
            subject: `Torneio terminado: ${fullTournament.name}`,
            html: tournamentFinishedEmail({
              playerName: ins.player.fullName,
              tournamentName: fullTournament.name,
              leagueName: fullTournament.league?.name ?? "",
              rankings,
              tournamentUrl,
            }),
          });
        }
      }
    }
  } catch (emailErr) {
    console.error("Failed to send tournament finished emails:", emailErr);
  }

  // ── WhatsApp: ranking final + ranking da época (fire-and-forget) ──
  (async () => {
    try {
      const t = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          league: { select: { whatsappGroupId: true } },
          season: { select: { id: true, name: true } },
          teams: { select: { id: true, name: true } },
          matches: true,
        },
      });

      if (t?.league?.whatsappGroupId) {
        // Compute team standings for WhatsApp message
        const stats = new Map<string, { name: string; points: number; wins: number; losses: number }>();
        for (const team of t.teams) {
          stats.set(team.id, { name: team.name, points: 0, wins: 0, losses: 0 });
        }
        for (const m of t.matches) {
          if (m.status !== "FINISHED") continue;
          const sA = stats.get(m.teamAId);
          const sB = stats.get(m.teamBId);
          const sets: { a: number; b: number }[] = [];
          if (m.set1A !== null && m.set1B !== null) sets.push({ a: m.set1A, b: m.set1B });
          if (m.set2A !== null && m.set2B !== null) sets.push({ a: m.set2A, b: m.set2B });
          if (m.set3A !== null && m.set3B !== null) sets.push({ a: m.set3A, b: m.set3B });
          let setsA = 0, setsB = 0;
          for (const s of sets) { if (s.a > s.b) setsA++; else if (s.b > s.a) setsB++; }
          if (sA) sA.points += setsA * 2;
          if (sB) sB.points += setsB * 2;
          if (m.resultType === "WIN_A") { if (sA) { sA.points += 3; sA.wins++; } if (sB) sB.losses++; }
          else if (m.resultType === "WIN_B") { if (sB) { sB.points += 3; sB.wins++; } if (sA) sA.losses++; }
        }
        const rankings = [...stats.values()]
          .sort((a, b) => b.points - a.points)
          .map((r, i) => ({ position: i + 1, teamName: r.name, points: r.points, wins: r.wins, losses: r.losses }));

        await sendGroupMessage(t.league?.whatsappGroupId ?? null, tournamentFinishedMessage(t.name, rankings));

        // Season ranking — full sort with tie-breakers
        const seasonRanking = t.season ? await prisma.seasonRankingEntry.findMany({
          where: { seasonId: t.season.id },
          include: { player: { select: { fullName: true, nickname: true } } },
        }) : [];
        const sortedRanking = seasonRanking
          .sort((a, b) => {
            if (b.pointsTotal !== a.pointsTotal) return b.pointsTotal - a.pointsTotal;
            if (b.wins !== a.wins) return b.wins - a.wins;
            if (b.setsDiff !== a.setsDiff) return b.setsDiff - a.setsDiff;
            if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
            if (b.draws !== a.draws) return b.draws - a.draws;
            return 0;
          });
        const seasonRankings = sortedRanking.map((r, i) => ({
          position: i + 1,
          playerName: r.player.nickname || r.player.fullName,
          points: r.pointsTotal,
          matchesPlayed: r.matchesPlayed,
          wins: r.wins,
          losses: r.losses,
          setsDiff: r.setsDiff,
        }));
        if (t.league?.whatsappGroupId && t.season) {
          await sendGroupMessage(t.league.whatsappGroupId, seasonRankingMessage(t.season.name, seasonRankings));
        }
      }
    } catch (err) {
      console.error("[WHATSAPP] Erro ao enviar ranking final:", err);
    }
  })();

  logAudit("FINISH_TOURNAMENT", "Tournament", tournamentId).catch(() => {});

  revalidatePath(`/torneios/${tournamentId}`);
}

// ── Delete tournament ──

export async function deleteTournament(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { seasonId: true, leagueId: true },
  });

  if (!tournament) throw new Error("Torneio não encontrado.");
  await requireLeagueManager(tournament.leagueId ?? "");

  logAudit("DELETE_TOURNAMENT", "Tournament", tournamentId).catch(() => {});

  // Cascade delete handles all child records (teams, courts, rounds, matches)
  await prisma.tournament.delete({ where: { id: tournamentId } });

  // Recompute season rankings since match data was removed
  if (tournament.seasonId) await recomputeSeasonRanking(tournament.seasonId);

  revalidatePath(`/ligas`);
  return { seasonId: tournament.seasonId, leagueId: tournament.leagueId };
}

// ── Edit tournament ──

export async function getTournamentForEdit(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      league: true,
      season: true,
      teams: {
        include: { player1: true, player2: true },
      },
      courts: { orderBy: { name: "asc" } },
      matches: { select: { status: true } },
      inscriptions: {
        orderBy: { orderIndex: "asc" },
        include: { player: true },
      },
    },
  });

  if (!tournament) throw new Error("Torneio não encontrado.");
  await requireLeagueManager(tournament.leagueId ?? "");

  const hasResults = tournament.matches.some((m) => m.status === "FINISHED");
  if (hasResults || tournament.status === "FINISHED") {
    throw new Error("Não é possível editar este torneio (tem resultados ou está terminado).");
  }

  return serialize(tournament);
}

export async function updateTournament(data: {
  tournamentId: string;
  name: string;
  startDate?: string;
  courtsCount: number;
  courtNames?: string[];
  matchesPerPair: number;
  numberOfSets: number;
  teamSize?: number;
  teamMode: string;
  randomSeed?: string;
  numberOfRounds?: number;
  rankedSplitSubMode?: string;
  teams: { name: string; player1Id: string; player2Id: string | null }[];
  allPlayerIds?: string[];
}) {
  const existing = await prisma.tournament.findUnique({
    where: { id: data.tournamentId },
    include: { matches: { select: { status: true } } },
  });

  if (!existing) throw new Error("Torneio não encontrado.");
  await requireLeagueManager(existing.leagueId ?? "");

  const hasResults = existing.matches.some((m) => m.status === "FINISHED");
  if (hasResults) {
    throw new Error("Não é possível editar um torneio com resultados registados.");
  }
  if (existing.status === "FINISHED") {
    throw new Error("Não é possível editar um torneio terminado.");
  }

  const teamSize = data.teamSize ?? 2;
  const maxTitulars = data.courtsCount * 2 * teamSize;

  await prisma.$transaction(async (tx) => {
    // Clear existing schedule, teams, and inscriptions
    await tx.match.deleteMany({ where: { tournamentId: data.tournamentId } });
    await tx.round.deleteMany({ where: { tournamentId: data.tournamentId } });
    await tx.team.deleteMany({ where: { tournamentId: data.tournamentId } });
    await tx.court.deleteMany({ where: { tournamentId: data.tournamentId } });
    await tx.tournamentInscription.deleteMany({ where: { tournamentId: data.tournamentId } });

    // Update tournament config
    await tx.tournament.update({
      where: { id: data.tournamentId },
      data: {
        name: data.name,
        startDate: data.startDate ? new Date(data.startDate + "T00:00:00") : null,
        courtsCount: data.courtsCount,
        matchesPerPair: data.matchesPerPair,
        numberOfSets: data.numberOfSets,
        teamSize,
        teamMode: data.teamMode,
        randomSeed: data.randomSeed || null,
        numberOfRounds: data.numberOfRounds || null,
        rankedSplitSubMode: data.rankedSplitSubMode || null,
        status: "DRAFT",
      },
    });

    // Recreate courts with custom names
    for (let i = 0; i < data.courtsCount; i++) {
      await tx.court.create({
        data: {
          tournamentId: data.tournamentId,
          name: data.courtNames?.[i] || `Campo ${i + 1}`,
        },
      });
    }

    // Recreate teams
    for (const t of data.teams) {
      await tx.team.create({
        data: {
          tournamentId: data.tournamentId,
          name: t.name,
          player1Id: t.player1Id,
          player2Id: t.player2Id || null,
          isRandomGenerated: data.teamMode === "RANDOM_TEAMS" || data.teamMode === "RANDOM_PER_ROUND" || data.teamMode === "RANKED_SPLIT" || data.teamMode === "AMERICANO" || data.teamMode === "SOBE_DESCE",
        },
      });
    }

    // Recreate inscriptions
    if (data.allPlayerIds && data.allPlayerIds.length > 0) {
      for (let i = 0; i < data.allPlayerIds.length; i++) {
        await tx.tournamentInscription.create({
          data: {
            tournamentId: data.tournamentId,
            playerId: data.allPlayerIds[i],
            orderIndex: i,
            status: i < maxTitulars ? "TITULAR" : "SUPLENTE",
          },
        });
      }
    }
  });

  // ── WhatsApp: anunciar equipas atualizadas (fire-and-forget) ──
  if (data.teams.length > 0) {
    (async () => {
      try {
        const league = existing.leagueId ? await prisma.league.findUnique({
          where: { id: existing.leagueId },
          select: { whatsappGroupId: true },
        }) : null;
        if (league?.whatsappGroupId) {
          const teamsWithNames = await Promise.all(
            data.teams.map(async (t) => {
              const p1 = await prisma.player.findUnique({ where: { id: t.player1Id }, select: { fullName: true } });
              const p2 = t.player2Id ? await prisma.player.findUnique({ where: { id: t.player2Id }, select: { fullName: true } }) : null;
              return { name: t.name, player1: p1?.fullName || "?", player2: p2?.fullName || null };
            })
          );
          await sendGroupMessage(
            league.whatsappGroupId,
            teamsAnnouncementMessage(data.name, teamsWithNames)
          );
        }
      } catch (err) {
        console.error("[WHATSAPP] Erro ao anunciar equipas atualizadas:", err);
      }
    })();
  }

  revalidatePath(`/torneios/${data.tournamentId}`);
  return { tournamentId: data.tournamentId };
}

/**
 * Lightweight tournament update — preserves existing schedule (matches, rounds).
 * Only updates basic fields, court names, and team compositions.
 * Use when no structural changes require schedule regeneration.
 */
export async function updateTournamentBasic(data: {
  tournamentId: string;
  name: string;
  startDate?: string;
  numberOfSets: number;
  courtNames?: string[];
  teams: { name: string; player1Id: string; player2Id: string | null }[];
  allPlayerIds?: string[];
}) {
  const existing = await prisma.tournament.findUnique({
    where: { id: data.tournamentId },
    include: {
      courts: { orderBy: { id: "asc" } },
      teams: {
        where: { roundId: null }, // Only non-per-round teams
        orderBy: { id: "asc" },
      },
    },
  });

  if (!existing) throw new Error("Torneio não encontrado.");
  await requireLeagueManager(existing.leagueId ?? "");

  if (existing.status === "FINISHED") {
    throw new Error("Não é possível editar um torneio terminado.");
  }

  await prisma.$transaction(async (tx) => {
    // 1. Update tournament basic fields
    await tx.tournament.update({
      where: { id: data.tournamentId },
      data: {
        name: data.name,
        startDate: data.startDate ? new Date(data.startDate + "T00:00:00") : null,
        numberOfSets: data.numberOfSets,
      },
    });

    // 2. Update court names (match existing courts by index)
    if (data.courtNames && existing.courts.length > 0) {
      for (let i = 0; i < existing.courts.length; i++) {
        if (data.courtNames[i] && data.courtNames[i] !== existing.courts[i].name) {
          await tx.court.update({
            where: { id: existing.courts[i].id },
            data: { name: data.courtNames[i] },
          });
        }
      }
    }

    // 3. Update team compositions (match existing teams by index)
    if (data.teams.length > 0 && existing.teams.length > 0) {
      const updateCount = Math.min(data.teams.length, existing.teams.length);
      for (let i = 0; i < updateCount; i++) {
        const newTeam = data.teams[i];
        const existingTeam = existing.teams[i];
        if (
          newTeam.name !== existingTeam.name ||
          newTeam.player1Id !== existingTeam.player1Id ||
          newTeam.player2Id !== existingTeam.player2Id
        ) {
          await tx.team.update({
            where: { id: existingTeam.id },
            data: {
              name: newTeam.name,
              player1Id: newTeam.player1Id,
              player2Id: newTeam.player2Id || null,
            },
          });
        }
      }
    }

    // 4. Update inscriptions order if players changed positions
    if (data.allPlayerIds && data.allPlayerIds.length > 0) {
      const maxTitulars = existing.courtsCount * 2 * (existing.teamSize ?? 2);
      // Delete and recreate inscriptions to update order
      await tx.tournamentInscription.deleteMany({ where: { tournamentId: data.tournamentId } });
      for (let i = 0; i < data.allPlayerIds.length; i++) {
        await tx.tournamentInscription.create({
          data: {
            tournamentId: data.tournamentId,
            playerId: data.allPlayerIds[i],
            orderIndex: i,
            status: i < maxTitulars ? "TITULAR" : "SUPLENTE",
          },
        });
      }
    }
  });

  revalidatePath(`/torneios/${data.tournamentId}`);
  return { tournamentId: data.tournamentId };
}

// ── Homepage data ──

export async function getHomepageData() {
  // Find first active league with an active season
  const league = await prisma.league.findFirst({
    where: { isActive: true, seasons: { some: { isActive: true } } },
    include: {
      seasons: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          rankings: {
            orderBy: { pointsTotal: "desc" },
            take: 10,
            include: { player: true },
          },
          tournaments: {
            orderBy: { createdAt: "desc" },
            include: {
              _count: { select: { teams: true, matches: true } },
            },
          },
        },
      },
    },
  });

  if (!league || league.seasons.length === 0) {
    return serialize({ league: null, season: null, rankings: [], recentMatches: [], activeTournaments: [] });
  }

  const season = league.seasons[0];

  // Get recent finished matches from this season's tournaments
  const recentMatches = await prisma.match.findMany({
    where: {
      tournament: { seasonId: season.id },
      status: "FINISHED",
    },
    orderBy: { playedAt: "desc" },
    take: 6,
    include: {
      teamA: { include: { player1: true, player2: true } },
      teamB: { include: { player1: true, player2: true } },
      tournament: { select: { name: true, id: true } },
      court: true,
    },
  });

  // Active tournaments (RUNNING or PUBLISHED)
  const activeTournaments = season.tournaments.filter(
    (t) => t.status === "RUNNING" || t.status === "PUBLISHED"
  );

  // Count finished matches per active tournament
  const activeTournamentsWithProgress = await Promise.all(
    activeTournaments.map(async (t) => {
      const finishedCount = await prisma.match.count({
        where: { tournamentId: t.id, status: "FINISHED" },
      });
      return {
        id: t.id,
        name: t.name,
        status: t.status,
        totalMatches: t._count.matches,
        finishedMatches: finishedCount,
        teamsCount: t._count.teams,
      };
    })
  );

  const rankings = season.rankings.map((r, i) => ({
    position: i + 1,
    playerName: r.player.nickname || r.player.fullName,
    pointsTotal: r.pointsTotal,
    matchesPlayed: r.matchesPlayed,
    wins: r.wins,
    draws: r.draws,
    losses: r.losses,
    setsWon: r.setsWon,
    setsLost: r.setsLost,
    setsDiff: r.setsDiff,
  }));

  return serialize({
    league: { id: league.id, name: league.name },
    season: { id: season.id, name: season.name },
    rankings,
    recentMatches,
    activeTournaments: activeTournamentsWithProgress,
  });
}

// ────────────────────────────────────────
// Dashboard Actions (with filters)
// ────────────────────────────────────────

export async function getDashboardFilters() {
  const leagues = await prisma.league.findMany({
    where: { isActive: true },
    include: {
      seasons: {
        orderBy: { createdAt: "desc" },
        include: {
          tournaments: {
            orderBy: { createdAt: "desc" },
            select: { id: true, name: true, status: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return serialize(
    leagues.map((l) => ({
      id: l.id,
      name: l.name,
      seasons: l.seasons.map((s) => ({
        id: s.id,
        name: s.name,
        isActive: s.isActive,
        tournaments: s.tournaments,
      })),
    }))
  );
}

export async function getDashboardData(filters: {
  leagueId?: string;
  seasonId?: string;
  tournamentId?: string;
}) {
  // Find the target league
  let leagueWhere = {};
  if (filters.leagueId) {
    leagueWhere = { id: filters.leagueId };
  }

  const league = await prisma.league.findFirst({
    where: {
      ...leagueWhere,
      isActive: true,
      seasons: { some: {} },
    },
    include: {
      seasons: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!league) {
    return serialize({ league: null, season: null, rankings: [], recentMatches: [], activeTournaments: [] });
  }

  // Find target season
  let season;
  if (filters.seasonId) {
    season = league.seasons.find((s) => s.id === filters.seasonId);
  }
  if (!season) {
    season = league.seasons.find((s) => s.isActive) || league.seasons[0];
  }
  if (!season) {
    return serialize({ league: { id: league.id, name: league.name }, season: null, rankings: [], recentMatches: [], activeTournaments: [] });
  }

  // Ranking for this season
  const rankingEntries = await prisma.seasonRankingEntry.findMany({
    where: { seasonId: season.id },
    orderBy: { pointsTotal: "desc" },
    take: 10,
    include: { player: true },
  });

  const rankings = rankingEntries.map((r, i) => ({
    position: i + 1,
    playerName: r.player.nickname || r.player.fullName,
    pointsTotal: r.pointsTotal,
    matchesPlayed: r.matchesPlayed,
    wins: r.wins,
    draws: r.draws,
    losses: r.losses,
    setsWon: r.setsWon,
    setsLost: r.setsLost,
    setsDiff: r.setsDiff,
  }));

  // Recent matches — optionally filtered by tournament
  const matchWhere: Record<string, unknown> = {
    tournament: { seasonId: season.id },
    status: "FINISHED",
  };
  if (filters.tournamentId) {
    matchWhere.tournamentId = filters.tournamentId;
  }

  const recentMatches = await prisma.match.findMany({
    where: matchWhere,
    orderBy: { playedAt: "desc" },
    take: 6,
    include: {
      teamA: { include: { player1: true, player2: true } },
      teamB: { include: { player1: true, player2: true } },
      tournament: { select: { name: true, id: true } },
      court: true,
    },
  });

  // Active tournaments
  const tournaments = await prisma.tournament.findMany({
    where: { seasonId: season.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { teams: true, matches: true } } },
  });

  const activeTournaments = tournaments.filter(
    (t) => t.status === "RUNNING" || t.status === "PUBLISHED"
  );

  const activeTournamentsWithProgress = await Promise.all(
    activeTournaments.map(async (t) => {
      const finishedCount = await prisma.match.count({
        where: { tournamentId: t.id, status: "FINISHED" },
      });
      return {
        id: t.id,
        name: t.name,
        status: t.status,
        totalMatches: t._count.matches,
        finishedMatches: finishedCount,
        teamsCount: t._count.teams,
      };
    })
  );

  return serialize({
    league: { id: league.id, name: league.name },
    season: { id: season.id, name: season.name },
    rankings,
    recentMatches,
    activeTournaments: activeTournamentsWithProgress,
  });
}

// ────────────────────────────────────────
// Auth & Registration Actions
// ────────────────────────────────────────

export async function registerUser(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const fullName = (formData.get("fullName") as string)?.trim();
  const nickname = (formData.get("nickname") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim();

  if (!email || !password || !fullName || !phone) {
    throw new Error("Todos os campos obrigatórios devem ser preenchidos.");
  }
  if (password.length < 6) {
    throw new Error("A palavra-passe deve ter pelo menos 6 caracteres.");
  }

  const phoneRegex = /^\+\d{1,3}\s\d{6,15}$/;
  if (!phoneRegex.test(phone)) {
    throw new Error("Número de telemóvel inválido. Formato esperado: +351 932539702");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Este email já está registado.");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.$transaction(async (tx) => {
    const player = await tx.player.create({
      data: { fullName, nickname },
    });
    await tx.user.create({
      data: {
        email,
        phone,
        hashedPassword,
        playerId: player.id,
        role: "JOGADOR",
      },
    });
  });

  // Send welcome email (fire-and-forget)
  sendEmail({
    to: email,
    subject: "Bem-vindo ao CopaPro!",
    html: welcomeEmail({ fullName, email }),
  });
}

// ── Password Recovery ──

export async function requestPasswordRecovery(email: string) {
  const trimmedEmail = email?.trim()?.toLowerCase();
  if (!trimmedEmail) return { success: true };

  const user = await prisma.user.findUnique({
    where: { email: trimmedEmail },
    include: { player: true },
  });

  // Always return success (no information leakage about email existence)
  if (!user) return { success: true };

  // Generate random 8-char temporary password
  const crypto = await import("crypto");
  const tempPassword = crypto.randomBytes(4).toString("hex");
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { hashedPassword, mustChangePassword: true },
  });

  // Send recovery email (fire-and-forget)
  const { sendEmail } = await import("./email");
  const { passwordRecoveryEmail } = await import("./email-templates");
  sendEmail({
    to: user.email,
    subject: "CopaPro: Recuperação de palavra-passe",
    html: passwordRecoveryEmail({
      fullName: user.player?.fullName || user.email,
      tempPassword,
    }),
  });

  return { success: true };
}

export async function changePassword(formData: FormData) {
  const user = await requireAuth();
  const newPassword = formData.get("newPassword") as string;

  if (!newPassword || newPassword.length < 6) {
    throw new Error("A nova palavra-passe deve ter pelo menos 6 caracteres.");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { hashedPassword, mustChangePassword: false },
  });

  revalidatePath("/");
  return { success: true };
}

// ────────────────────────────────────────
// League Membership Actions
// ────────────────────────────────────────

export async function requestJoinLeague(leagueId: string) {
  const user = await requireAuth();

  const existing = await prisma.leagueMembership.findUnique({
    where: { userId_leagueId: { userId: user.id, leagueId } },
  });
  if (existing) {
    throw new Error(
      existing.status === "PENDING"
        ? "Já tem um pedido pendente para esta liga."
        : existing.status === "APPROVED"
        ? "Já é membro desta liga."
        : "O seu pedido anterior foi rejeitado."
    );
  }

  await prisma.leagueMembership.create({
    data: { userId: user.id, leagueId, status: "PENDING" },
  });

  revalidatePath(`/ligas/${leagueId}`);
}

export async function handleMembershipRequest(
  membershipId: string,
  action: "APPROVED" | "REJECTED"
) {
  const membership = await prisma.leagueMembership.findUnique({
    where: { id: membershipId },
  });
  if (!membership) throw new Error("Pedido não encontrado.");

  await requireLeagueManager(membership.leagueId);

  await prisma.leagueMembership.update({
    where: { id: membershipId },
    data: { status: action },
  });

  // ── WhatsApp: adicionar ao grupo se aprovado (fire-and-forget) ──
  if (action === "APPROVED") {
    (async () => {
      try {
        const [league, user] = await Promise.all([
          prisma.league.findUnique({ where: { id: membership.leagueId }, select: { whatsappGroupId: true } }),
          prisma.user.findUnique({ where: { id: membership.userId }, select: { phone: true } }),
        ]);
        if (league?.whatsappGroupId && user?.phone) {
          await addParticipants(league.whatsappGroupId, [normalizePhone(user.phone)]);
        }
      } catch (err) {
        console.error("[WHATSAPP] Erro ao adicionar membro aprovado ao grupo:", err);
      }
    })();
  }

  revalidatePath(`/ligas/${membership.leagueId}`);
  revalidatePath(`/ligas/${membership.leagueId}/membros`);
}

export async function addPlayerToLeague(userId: string, leagueId: string) {
  await requireLeagueManager(leagueId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { player: true },
  });
  if (!user) throw new Error("Utilizador não encontrado.");
  if (!user.player) throw new Error("Este utilizador não tem um jogador associado.");

  await prisma.leagueMembership.upsert({
    where: { userId_leagueId: { userId, leagueId } },
    update: { status: "APPROVED" },
    create: { userId, leagueId, status: "APPROVED" },
  });

  // Create ranking entries with 0 values for all active seasons of this league
  const activeSeasons = await prisma.season.findMany({
    where: { leagueId, isActive: true },
  });

  for (const season of activeSeasons) {
    await prisma.seasonRankingEntry.upsert({
      where: {
        seasonId_playerId: {
          seasonId: season.id,
          playerId: user.player.id,
        },
      },
      update: {}, // If already exists (e.g. from playing), don't overwrite
      create: {
        seasonId: season.id,
        playerId: user.player.id,
        pointsTotal: 0,
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        setsWon: 0,
        setsLost: 0,
        setsDiff: 0,
      },
    });
  }

  // ── WhatsApp: adicionar jogador ao grupo (fire-and-forget) ──
  (async () => {
    try {
      const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: { whatsappGroupId: true },
      });
      if (league?.whatsappGroupId && user.phone) {
        await addParticipants(league.whatsappGroupId, [normalizePhone(user.phone)]);
      }
    } catch (err) {
      console.error("[WHATSAPP] Erro ao adicionar jogador ao grupo:", err);
    }
  })();

  logAudit("ADD_MEMBER", "League", leagueId).catch(() => {});

  revalidatePath(`/ligas/${leagueId}/membros`);
  revalidatePath(`/ligas/${leagueId}`);
  revalidatePath("/dashboard");
}

export async function removePlayerFromLeague(userId: string, leagueId: string) {
  await requireLeagueManager(leagueId);

  // ── WhatsApp: remover jogador do grupo (fire-and-forget) ──
  (async () => {
    try {
      const [league, user] = await Promise.all([
        prisma.league.findUnique({ where: { id: leagueId }, select: { whatsappGroupId: true } }),
        prisma.user.findUnique({ where: { id: userId }, select: { phone: true } }),
      ]);
      if (league?.whatsappGroupId && user?.phone) {
        await removeParticipants(league.whatsappGroupId, [normalizePhone(user.phone)]);
      }
    } catch (err) {
      console.error("[WHATSAPP] Erro ao remover jogador do grupo:", err);
    }
  })();

  await prisma.leagueMembership.deleteMany({
    where: { userId, leagueId },
  });

  logAudit("REMOVE_MEMBER", "League", leagueId).catch(() => {});

  revalidatePath(`/ligas/${leagueId}/membros`);
}

export async function getLeagueMembershipRequests(leagueId: string) {
  await requireLeagueManager(leagueId);

  const requests = await prisma.leagueMembership.findMany({
    where: { leagueId, status: "PENDING" },
    include: { user: { include: { player: true } } },
    orderBy: { createdAt: "asc" },
  });

  return serialize(requests);
}

export async function getLeagueMembers(leagueId: string) {
  await requireLeagueManager(leagueId);

  const members = await prisma.leagueMembership.findMany({
    where: { leagueId, status: "APPROVED" },
    include: { user: { include: { player: true } } },
    orderBy: { createdAt: "asc" },
  });

  return serialize(members);
}

export async function searchUsers(query: string) {
  await requireAuth();

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: query, mode: "insensitive" } },
        { player: { fullName: { contains: query, mode: "insensitive" } } },
      ],
    },
    include: { player: { select: { fullName: true, nickname: true } } },
    take: 20,
  });

  return serialize(users);
}

export async function createLeagueInvite(leagueId: string, maxUses?: number) {
  const user = await requireLeagueManager(leagueId);

  const invite = await prisma.leagueInvite.create({
    data: {
      leagueId,
      createdBy: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      maxUses: maxUses || null, // null = unlimited
    },
  });

  // ── Email: send invite link to the manager who created it ──
  try {
    const manager = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, player: { select: { fullName: true } } },
    });
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { name: true },
    });
    if (manager?.email && league) {
      const appUrl = process.env.APP_URL || "https://copapro.pt";
      sendEmail({
        to: manager.email,
        subject: `Link de convite criado: ${league.name}`,
        html: leagueInviteLinkEmail({
          managerName: manager.player?.fullName || manager.email,
          leagueName: league.name,
          inviteUrl: `${appUrl}/convite/${invite.token}`,
          expiresAt: invite.expiresAt.toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" }),
        }),
      });
    }
  } catch (emailErr) {
    console.error("Failed to send invite link email:", emailErr);
  }

  return { token: invite.token };
}

export async function acceptLeagueInvite(token: string) {
  const user = await requireAuth();

  const invite = await prisma.leagueInvite.findUnique({
    where: { token },
    include: { league: { select: { id: true, name: true } } },
  });

  if (!invite) throw new Error("Convite não encontrado.");
  if (!invite.isActive) throw new Error("Este convite foi desativado.");
  if (invite.expiresAt < new Date()) throw new Error("Este convite expirou.");
  if (invite.maxUses && invite.useCount >= invite.maxUses) {
    throw new Error("Este convite atingiu o número máximo de utilizações.");
  }

  // Check if user already used this invite
  const alreadyUsed = await prisma.leagueInviteUsage.findUnique({
    where: { inviteId_userId: { inviteId: invite.id, userId: user.id } },
  });

  // Check if already a member
  const existingMembership = await prisma.leagueMembership.findUnique({
    where: { userId_leagueId: { userId: user.id, leagueId: invite.leagueId } },
  });

  if (existingMembership?.status === "APPROVED") {
    return { leagueId: invite.leagueId, alreadyMember: true };
  }

  await prisma.$transaction(async (tx) => {
    // Record usage (if not already used by this user)
    if (!alreadyUsed) {
      await tx.leagueInviteUsage.create({
        data: { inviteId: invite.id, userId: user.id },
      });

      await tx.leagueInvite.update({
        where: { id: invite.id },
        data: { useCount: { increment: 1 } },
      });
    }

    // Create or approve membership
    await tx.leagueMembership.upsert({
      where: { userId_leagueId: { userId: user.id, leagueId: invite.leagueId } },
      update: { status: "APPROVED" },
      create: { userId: user.id, leagueId: invite.leagueId, status: "APPROVED" },
    });
  });

  // Create ranking entries for active seasons
  if (user.playerId) {
    const activeSeasons = await prisma.season.findMany({
      where: { leagueId: invite.leagueId, isActive: true },
    });

    for (const season of activeSeasons) {
      await prisma.seasonRankingEntry.upsert({
        where: {
          seasonId_playerId: { seasonId: season.id, playerId: user.playerId },
        },
        update: {},
        create: {
          seasonId: season.id,
          playerId: user.playerId,
          pointsTotal: 0,
          matchesPlayed: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          setsWon: 0,
          setsLost: 0,
          setsDiff: 0,
        },
      });
    }
  }

  // ── WhatsApp: adicionar ao grupo (fire-and-forget) ──
  (async () => {
    try {
      const league = await prisma.league.findUnique({
        where: { id: invite.leagueId },
        select: { whatsappGroupId: true },
      });
      const userInfo = await prisma.user.findUnique({
        where: { id: user.id },
        select: { phone: true },
      });
      if (league?.whatsappGroupId && userInfo?.phone) {
        await addParticipants(league.whatsappGroupId, [normalizePhone(userInfo.phone)]);
      }
    } catch (err) {
      console.error("[WHATSAPP] Erro ao adicionar via convite ao grupo:", err);
    }
  })();

  revalidatePath(`/ligas/${invite.leagueId}`);
  revalidatePath(`/ligas/${invite.leagueId}/membros`);
  return { leagueId: invite.leagueId, alreadyMember: false };
}

export async function getLeagueInvites(leagueId: string) {
  await requireLeagueManager(leagueId);

  const invites = await prisma.leagueInvite.findMany({
    where: { leagueId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { usages: true } },
    },
  });

  return serialize(invites);
}

export async function deactivateLeagueInvite(inviteId: string) {
  const invite = await prisma.leagueInvite.findUnique({
    where: { id: inviteId },
  });

  if (!invite) throw new Error("Convite não encontrado.");
  await requireLeagueManager(invite.leagueId);

  await prisma.leagueInvite.update({
    where: { id: inviteId },
    data: { isActive: false },
  });

  revalidatePath(`/ligas/${invite.leagueId}`);
}

export async function getInviteByToken(token: string) {
  const invite = await prisma.leagueInvite.findUnique({
    where: { token },
    include: { league: { select: { id: true, name: true, location: true } } },
  });

  if (!invite) return null;

  const isValid = invite.isActive &&
    invite.expiresAt > new Date() &&
    (!invite.maxUses || invite.useCount < invite.maxUses);

  return serialize({
    token: invite.token,
    league: invite.league,
    isValid,
    expiresAt: invite.expiresAt,
  });
}

export async function getLeaguePlayers(leagueId: string) {
  await requireLeagueManager(leagueId);

  const memberships = await prisma.leagueMembership.findMany({
    where: { leagueId, status: "APPROVED" },
    include: { user: { include: { player: true } } },
  });

  const unlinkedPlayers = await prisma.player.findMany({
    where: { user: null },
    orderBy: { fullName: "asc" },
  });

  const players = [
    ...memberships
      .filter((m) => m.user.player)
      .map((m) => m.user.player!),
    ...unlinkedPlayers,
  ];

  return serialize(players);
}

export async function getAvailablePlayersForSwap(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      leagueId: true,
      teams: { select: { player1Id: true, player2Id: true } },
    },
  });
  if (!tournament) throw new Error("Torneio não encontrado.");

  // Get all player IDs already in the tournament
  const tournamentPlayerIds = new Set<string>();
  for (const team of tournament.teams) {
    if (team.player1Id) tournamentPlayerIds.add(team.player1Id);
    if (team.player2Id) tournamentPlayerIds.add(team.player2Id);
  }

  // Get all approved league members with players, excluding those already in tournament
  const memberships = await prisma.leagueMembership.findMany({
    where: { leagueId: tournament.leagueId ?? "", status: "APPROVED" },
    include: { user: { include: { player: true } } },
  });

  const players = memberships
    .filter((m) => m.user.player && !tournamentPlayerIds.has(m.user.player.id))
    .map((m) => m.user.player!)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  return serialize(players);
}

export async function getLeagueMembersAsPlayers(leagueId: string) {
  const memberships = await prisma.leagueMembership.findMany({
    where: { leagueId, status: "APPROVED" },
    include: { user: { include: { player: true } } },
  });

  const players = memberships
    .filter((m) => m.user.player)
    .map((m) => m.user.player!)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  return serialize(players);
}

// ────────────────────────────────────────
// Admin Actions
// ────────────────────────────────────────

export async function toggleLeagueActive(leagueId: string) {
  await requireAdmin();

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { isActive: true },
  });

  if (!league) throw new Error("Liga não encontrada.");

  await prisma.league.update({
    where: { id: leagueId },
    data: { isActive: !league.isActive },
  });

  revalidatePath("/admin/ligas");
  revalidatePath("/ligas");
  revalidatePath("/dashboard");
  revalidatePath("/");
}

export async function getUsers() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    include: { player: true, managedLeagues: { include: { league: true } } },
    orderBy: { createdAt: "desc" },
  });

  return serialize(users);
}

export async function updateUserRole(userId: string, role: "JOGADOR" | "GESTOR" | "ADMINISTRADOR") {
  const currentUser = await requireAdmin();

  if (currentUser.id === userId && role !== "ADMINISTRADOR") {
    throw new Error("Não pode alterar o seu próprio papel de administrador.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  logAudit("CHANGE_ROLE", "User", userId, { role }).catch(() => {});

  revalidatePath("/admin/utilizadores");
}

export async function deleteUser(userId: string) {
  const currentUser = await requireAdmin();

  if (currentUser.id === userId) {
    throw new Error("Não pode eliminar a sua própria conta.");
  }

  // Unlink player before deleting user (preserve tournament history)
  await prisma.user.update({
    where: { id: userId },
    data: { playerId: null },
  });

  logAudit("DELETE_USER", "User", userId).catch(() => {});

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin/utilizadores");
}

export async function createUserManually(data: {
  email: string;
  password: string;
  fullName: string;
  nickname?: string;
  phone?: string;
  role: "JOGADOR" | "GESTOR" | "ADMINISTRADOR";
}) {
  await requireAdmin();

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("Este email já está registado.");

  const hashedPassword = await bcrypt.hash(data.password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const player = await tx.player.create({
      data: { fullName: data.fullName, nickname: data.nickname || null },
    });
    return tx.user.create({
      data: {
        email: data.email,
        phone: data.phone || "",
        hashedPassword,
        role: data.role,
        playerId: player.id,
      },
    });
  });

  logAudit("CREATE_USER", "User", user.id, { email: data.email }).catch(() => {});

  revalidatePath("/admin/utilizadores");
}

export async function linkPlayerToUser(userId: string, playerId: string) {
  await requireAdmin();

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { user: true },
  });
  if (!player) throw new Error("Jogador não encontrado.");
  if (player.user) throw new Error("Este jogador já está associado a um utilizador.");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Utilizador não encontrado.");
  if (user.playerId) throw new Error("Este utilizador já tem um jogador associado.");

  await prisma.user.update({
    where: { id: userId },
    data: { playerId },
  });

  revalidatePath("/admin/utilizadores");
}

export async function updateUser(
  userId: string,
  data: {
    email: string;
    phone: string;
    fullName?: string;
    nickname?: string;
  }
) {
  await requireAdmin();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      player: true,
      leagueMemberships: {
        where: { status: "APPROVED" },
        include: { league: { select: { id: true, whatsappGroupId: true } } },
      },
      managedLeagues: {
        include: { league: { select: { id: true, whatsappGroupId: true } } },
      },
    },
  });
  if (!user) throw new Error("Utilizador não encontrado.");

  const trimmedEmail = data.email.trim().toLowerCase();
  const newPhone = data.phone.trim();

  // Validate email uniqueness (only if changed)
  if (trimmedEmail !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existing) throw new Error("Este email já está registado.");
  }

  // Validate phone format (if non-empty)
  if (newPhone) {
    const phoneRegex = /^\+\d{1,3}\s\d{6,15}$/;
    if (!phoneRegex.test(newPhone)) {
      throw new Error("Número de telemóvel inválido. Formato esperado: +351 932539702");
    }
  }

  const oldPhone = user.phone;
  const phoneChanged = newPhone !== oldPhone;

  // Update user record
  await prisma.user.update({
    where: { id: userId },
    data: { email: trimmedEmail, phone: newPhone },
  });

  // Update player record (if user has a linked player)
  if (user.player && data.fullName !== undefined) {
    await prisma.player.update({
      where: { id: user.player.id },
      data: {
        fullName: data.fullName.trim(),
        nickname: data.nickname?.trim() || null,
      },
    });
  }

  // Sync WhatsApp groups when phone changes (fire-and-forget)
  if (phoneChanged) {
    (async () => {
      try {
        // Collect all WhatsApp groups user belongs to
        const memberGroupJids = user.leagueMemberships
          .map((m) => m.league.whatsappGroupId)
          .filter(Boolean) as string[];
        const managerGroupJids = user.managedLeagues
          .map((m) => m.league.whatsappGroupId)
          .filter(Boolean) as string[];

        // All unique groups
        let allGroupJids = [...new Set([...memberGroupJids, ...managerGroupJids])];

        // If user is ADMINISTRADOR, they are admin of ALL groups
        let adminGroupJids = new Set(managerGroupJids);
        if (user.role === "ADMINISTRADOR") {
          const allLeagues = await prisma.league.findMany({
            where: { whatsappGroupId: { not: null } },
            select: { whatsappGroupId: true },
          });
          const allJids = allLeagues.map((l) => l.whatsappGroupId!);
          allGroupJids = [...new Set([...allGroupJids, ...allJids])];
          allJids.forEach((jid) => adminGroupJids.add(jid));
        }

        if (allGroupJids.length === 0) return;

        // Remove old phone from all groups
        if (oldPhone) {
          const normalizedOld = normalizePhone(oldPhone);
          if (normalizedOld) {
            for (const jid of allGroupJids) {
              await removeParticipants(jid, [normalizedOld]);
            }
          }
        }

        // Add new phone to all groups
        if (newPhone) {
          const normalizedNew = normalizePhone(newPhone);
          if (normalizedNew) {
            for (const jid of allGroupJids) {
              await addParticipants(jid, [normalizedNew]);
            }
            // Re-promote in groups where user is manager/admin
            for (const jid of adminGroupJids) {
              await promoteParticipants(jid, [normalizedNew]);
            }
          }
        }

        console.log(
          `[WHATSAPP] Telemóvel atualizado: ${oldPhone || "(vazio)"} → ${newPhone || "(vazio)"} em ${allGroupJids.length} grupo(s)`
        );
      } catch (err) {
        console.error("[WHATSAPP] Erro ao sincronizar grupos após alteração de telemóvel:", (err as Error).message);
      }
    })();
  }

  logAudit("UPDATE_USER", "User", userId, data).catch(() => {});

  revalidatePath("/admin/utilizadores");
}

export async function getUnlinkedPlayers() {
  await requireAdmin();

  const players = await prisma.player.findMany({
    where: { user: null },
    orderBy: { fullName: "asc" },
  });

  return serialize(players);
}

export async function assignLeagueManager(userId: string, leagueId: string) {
  await requireAdmin();

  await prisma.leagueManager.upsert({
    where: { userId_leagueId: { userId, leagueId } },
    update: {},
    create: { userId, leagueId },
  });

  await prisma.leagueMembership.upsert({
    where: { userId_leagueId: { userId, leagueId } },
    update: { status: "APPROVED" },
    create: { userId, leagueId, status: "APPROVED" },
  });

  // ── WhatsApp: adicionar ao grupo + promover a admin (fire-and-forget) ──
  (async () => {
    try {
      const [league, user] = await Promise.all([
        prisma.league.findUnique({ where: { id: leagueId }, select: { whatsappGroupId: true } }),
        prisma.user.findUnique({ where: { id: userId }, select: { phone: true } }),
      ]);
      if (league?.whatsappGroupId && user?.phone) {
        const phone = normalizePhone(user.phone);
        await addParticipants(league.whatsappGroupId, [phone]);
        await promoteParticipants(league.whatsappGroupId, [phone]);
      }
    } catch (err) {
      console.error("[WHATSAPP] Erro ao promover gestor no grupo:", err);
    }
  })();

  logAudit("ASSIGN_MANAGER", "League", leagueId).catch(() => {});

  revalidatePath("/admin/ligas");
  revalidatePath(`/ligas/${leagueId}`);
}

export async function removeLeagueManager(userId: string, leagueId: string) {
  await requireAdmin();

  await prisma.leagueManager.deleteMany({
    where: { userId, leagueId },
  });

  revalidatePath("/admin/ligas");
  revalidatePath(`/ligas/${leagueId}`);
}

export async function getLeagueManagers(leagueId: string) {
  await requireAuth();

  const managers = await prisma.leagueManager.findMany({
    where: { leagueId },
    include: { user: { include: { player: true } } },
  });

  return serialize(managers);
}

// ────────────────────────────────────────
// Landing Page (public — no auth required)
// ────────────────────────────────────────

export async function getLandingPageData() {
  // Find the first active league with a season that has rankings
  const league = await prisma.league.findFirst({
    where: {
      isActive: true,
      seasons: {
        some: {
          rankings: { some: {} },
        },
      },
    },
    include: {
      seasons: {
        where: { rankings: { some: {} } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!league || league.seasons.length === 0) {
    return serialize({
      leagueName: null,
      seasonName: null,
      rankings: [],
      recentMatches: [],
    });
  }

  const season = league.seasons[0];

  // Top 4 ranking entries for this season
  const rankingEntries = await prisma.seasonRankingEntry.findMany({
    where: { seasonId: season.id },
    orderBy: { pointsTotal: "desc" },
    take: 4,
    include: { player: true },
  });

  const rankings = rankingEntries.map((r, i) => ({
    position: i + 1,
    playerName: r.player.nickname || r.player.fullName,
    pointsTotal: r.pointsTotal,
    matchesPlayed: r.matchesPlayed,
    wins: r.wins,
  }));

  // Last 2 finished matches for this season
  const matches = await prisma.match.findMany({
    where: {
      tournament: { seasonId: season.id },
      status: "FINISHED",
    },
    orderBy: { playedAt: "desc" },
    take: 2,
    include: {
      teamA: { include: { player1: true, player2: true } },
      teamB: { include: { player1: true, player2: true } },
      round: true,
    },
  });

  const recentMatches = matches.map((m) => {
    const scores: string[] = [];
    if (m.set1A !== null && m.set1B !== null) scores.push(`${m.set1A}-${m.set1B}`);
    if (m.set2A !== null && m.set2B !== null) scores.push(`${m.set2A}-${m.set2B}`);
    if (m.set3A !== null && m.set3B !== null) scores.push(`${m.set3A}-${m.set3B}`);

    const p1A = m.teamA.player1.nickname || m.teamA.player1.fullName.split(" ")[0];
    const p2A = m.teamA.player2 ? (m.teamA.player2.nickname || m.teamA.player2.fullName.split(" ")[0]) : null;
    const teamAName = p2A ? `${p1A} / ${p2A}` : p1A;

    const p1B = m.teamB.player1.nickname || m.teamB.player1.fullName.split(" ")[0];
    const p2B = m.teamB.player2 ? (m.teamB.player2.nickname || m.teamB.player2.fullName.split(" ")[0]) : null;
    const teamBName = p2B ? `${p1B} / ${p2B}` : p1B;

    return {
      teamA: teamAName,
      teamB: teamBName,
      score: scores.join(" / ") || "—",
      round: m.round.index + 1,
    };
  });

  return serialize({
    leagueName: league.name,
    seasonName: season.name,
    rankings,
    recentMatches,
  });
}

// ══════════════════════════════════════════════════════════════════════
// Feature 1: Clone Tournament
// ══════════════════════════════════════════════════════════════════════

export async function cloneTournament(tournamentId: string) {
  // Plan check: clone tournament
  await requireFeature("CLONE_TOURNAMENT");

  const source = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      teams: { include: { player1: true, player2: true } },
      courts: { orderBy: { name: "asc" } },
      inscriptions: { orderBy: { orderIndex: "asc" }, include: { player: true } },
    },
  });

  if (!source) throw new Error("Torneio não encontrado.");
  await requireLeagueManager(source.leagueId ?? "");

  const clone = await prisma.tournament.create({
    data: {
      leagueId: source.leagueId,
      seasonId: source.seasonId,
      name: `${source.name} (cópia)`,
      startDate: null,
      courtsCount: source.courtsCount,
      matchesPerPair: source.matchesPerPair,
      numberOfSets: source.numberOfSets,
      teamSize: source.teamSize,
      teamMode: source.teamMode,
      randomSeed: null,
      status: "DRAFT",
    },
  });

  // Clone courts
  for (const court of source.courts) {
    await prisma.court.create({
      data: { tournamentId: clone.id, name: court.name },
    });
  }

  // Clone teams
  for (const team of source.teams) {
    await prisma.team.create({
      data: {
        tournamentId: clone.id,
        name: team.name,
        player1Id: team.player1Id,
        player2Id: team.player2Id,
        isRandomGenerated: team.isRandomGenerated,
      },
    });
  }

  // Clone inscriptions
  for (const insc of source.inscriptions) {
    await prisma.tournamentInscription.create({
      data: {
        tournamentId: clone.id,
        playerId: insc.playerId,
        orderIndex: insc.orderIndex,
        status: insc.status === "DESISTIU" ? "TITULAR" : insc.status === "PROMOVIDO" ? "TITULAR" : insc.status,
      },
    });
  }

  revalidatePath(`/ligas/${source.leagueId}/epocas/${source.seasonId}`);
  return { id: clone.id, seasonId: source.seasonId, leagueId: source.leagueId };
}

// ══════════════════════════════════════════════════════════════════════
// Feature 4: Reopen (undo finish) Tournament
// ══════════════════════════════════════════════════════════════════════

export async function reopenTournament(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { status: true, leagueId: true, seasonId: true },
  });

  if (!tournament) throw new Error("Torneio não encontrado.");
  await requireLeagueManager(tournament.leagueId ?? "");

  if (tournament.status !== "FINISHED") {
    throw new Error("Apenas torneios terminados podem ser reabertos.");
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "RUNNING" },
  });

  logAudit("REOPEN_TOURNAMENT", "Tournament", tournamentId).catch(() => {});

  revalidatePath(`/torneios/${tournamentId}`);
}

// ══════════════════════════════════════════════════════════════════════
// Feature 6: Update League (name/location)
// ══════════════════════════════════════════════════════════════════════

export async function updateLeague(leagueId: string, data: { name: string; location?: string }) {
  await requireLeagueManager(leagueId);

  if (!data.name?.trim()) throw new Error("Nome da liga é obrigatório.");

  await prisma.league.update({
    where: { id: leagueId },
    data: { name: data.name.trim(), location: data.location?.trim() || null },
  });

  revalidatePath(`/ligas/${leagueId}`);
  revalidatePath("/ligas");
}

// ══════════════════════════════════════════════════════════════════════
// Feature 2: Head-to-Head Stats + Feature 12: Player Profile
// ══════════════════════════════════════════════════════════════════════

export async function getPlayerProfile(playerId: string) {
  await requireAuth();

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      user: { select: { email: true, role: true } },
      rankings: {
        include: { season: { select: { name: true, league: { select: { name: true } } } } },
        orderBy: { pointsTotal: "desc" },
      },
      inscriptions: {
        include: {
          tournament: {
            select: { id: true, name: true, status: true, startDate: true, season: { select: { name: true } }, league: { select: { name: true } } },
          },
        },
        orderBy: { tournament: { startDate: "desc" } },
      },
    },
  });

  if (!player) throw new Error("Jogador não encontrado.");

  // Head-to-head stats: find all matches this player participated in
  const matches = await prisma.match.findMany({
    where: {
      status: "FINISHED",
      OR: [
        { teamA: { OR: [{ player1Id: playerId }, { player2Id: playerId }] } },
        { teamB: { OR: [{ player1Id: playerId }, { player2Id: playerId }] } },
      ],
    },
    include: {
      teamA: { include: { player1: true, player2: true } },
      teamB: { include: { player1: true, player2: true } },
    },
  });

  // Build head-to-head map
  const h2h = new Map<string, { name: string; wins: number; losses: number; draws: number }>();

  for (const m of matches) {
    const isTeamA =
      m.teamA.player1Id === playerId || m.teamA.player2Id === playerId;
    const opponentTeam = isTeamA ? m.teamB : m.teamA;

    // Get opponent player(s)
    const opponents = [opponentTeam.player1];
    if (opponentTeam.player2) opponents.push(opponentTeam.player2);

    for (const opp of opponents) {
      if (!h2h.has(opp.id)) {
        h2h.set(opp.id, { name: opp.nickname || opp.fullName, wins: 0, losses: 0, draws: 0 });
      }
      const record = h2h.get(opp.id)!;
      if (isTeamA) {
        if (m.resultType === "WIN_A") record.wins++;
        else if (m.resultType === "WIN_B") record.losses++;
        else if (m.resultType === "DRAW") record.draws++;
      } else {
        if (m.resultType === "WIN_B") record.wins++;
        else if (m.resultType === "WIN_A") record.losses++;
        else if (m.resultType === "DRAW") record.draws++;
      }
    }
  }

  const headToHead = [...h2h.entries()]
    .map(([, data]) => ({
      opponentName: data.name,
      played: data.wins + data.losses + data.draws,
      wins: data.wins,
      losses: data.losses,
    }))
    .sort((a, b) => b.played - a.played);

  // Compute stats
  const wins = matches.filter((m) => {
    const isTeamA = m.teamA.player1Id === playerId || m.teamA.player2Id === playerId;
    return isTeamA ? m.resultType === "WIN_A" : m.resultType === "WIN_B";
  }).length;
  const losses = matches.filter((m) => {
    const isTeamA = m.teamA.player1Id === playerId || m.teamA.player2Id === playerId;
    return isTeamA ? m.resultType === "WIN_B" : m.resultType === "WIN_A";
  }).length;

  let setsWon = 0;
  let setsLost = 0;
  for (const m of matches) {
    const isTeamA = m.teamA.player1Id === playerId || m.teamA.player2Id === playerId;
    const sets = [
      [m.set1A, m.set1B],
      [m.set2A, m.set2B],
      [m.set3A, m.set3B],
    ].filter(([a, b]) => a !== null && b !== null) as [number, number][];
    for (const [a, b] of sets) {
      if (isTeamA) {
        if (a > b) setsWon++;
        else if (b > a) setsLost++;
      } else {
        if (b > a) setsWon++;
        else if (a > b) setsLost++;
      }
    }
  }

  // Get leagues
  const memberships = player.user
    ? await prisma.leagueMembership.findMany({
        where: { userId: (await prisma.user.findFirst({ where: { playerId } }))?.id ?? "", status: "APPROVED" },
        include: { league: { select: { id: true, name: true, location: true } } },
      })
    : [];

  return serialize({
    fullName: player.fullName,
    nickname: player.nickname,
    eloRating: player.eloRating ?? 1200,
    stats: {
      totalMatches: matches.length,
      wins,
      losses,
      draws: matches.length - wins - losses,
      setsWon,
      setsLost,
    },
    leagues: memberships.map((m) => m.league),
    headToHead,
  });
}

// ══════════════════════════════════════════════════════════════════════
// Player Stats (D1) – Enhanced profile with partner/opponent tracking
// ══════════════════════════════════════════════════════════════════════

export async function getPlayerStats(playerId: string) {
  await requireAuth();

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      teamsAsPlayer1: { include: { tournament: { select: { id: true, name: true, teamMode: true } } } },
      teamsAsPlayer2: { include: { tournament: { select: { id: true, name: true, teamMode: true } } } },
    },
  });

  if (!player) throw new Error("Jogador não encontrado");

  // Get all matches where this player participated
  const matches = await prisma.match.findMany({
    where: {
      status: "FINISHED",
      OR: [
        { teamA: { OR: [{ player1Id: playerId }, { player2Id: playerId }] } },
        { teamB: { OR: [{ player1Id: playerId }, { player2Id: playerId }] } },
      ],
    },
    include: {
      teamA: { include: { player1: true, player2: true } },
      teamB: { include: { player1: true, player2: true } },
      round: { include: { tournament: { select: { id: true, name: true } } } },
    },
    orderBy: { round: { tournament: { createdAt: "desc" } } },
  });

  let wins = 0, losses = 0, setsWon = 0, setsLost = 0, totalPoints = 0;
  const partnerStats = new Map<string, { name: string; played: number; wins: number }>();
  const opponentStats = new Map<string, { name: string; played: number; wins: number }>();
  const recentMatches: Array<{
    id: string;
    tournamentName: string;
    tournamentId: string | undefined;
    partner: string | null;
    opponents: string[];
    won: boolean;
    score: string;
  }> = [];

  for (const match of matches) {
    const isTeamA = match.teamA?.player1Id === playerId || match.teamA?.player2Id === playerId;
    const myTeam = isTeamA ? match.teamA : match.teamB;
    const oppTeam = isTeamA ? match.teamB : match.teamA;
    const won = match.winnerTeamId === myTeam?.id;

    if (won) wins++; else losses++;

    // Sets
    const sets: [number | null, number | null][] = [[match.set1A, match.set1B], [match.set2A, match.set2B], [match.set3A, match.set3B]];
    for (const [a, b] of sets) {
      if (a === null || b === null) continue;
      const myScore = isTeamA ? a : b;
      const oppScore = isTeamA ? b : a;
      if (myScore > oppScore) { setsWon++; totalPoints += 2; }
      else if (oppScore > myScore) setsLost++;
    }
    if (won) totalPoints += 3;

    // Partner tracking
    const partner = myTeam?.player1Id === playerId ? myTeam?.player2 : myTeam?.player1;
    if (partner) {
      const key = partner.id;
      const existing = partnerStats.get(key) || { name: partner.nickname || partner.fullName, played: 0, wins: 0 };
      existing.played++;
      if (won) existing.wins++;
      partnerStats.set(key, existing);
    }

    // Opponent tracking
    for (const opp of [oppTeam?.player1, oppTeam?.player2].filter(Boolean)) {
      const key = opp!.id;
      const existing = opponentStats.get(key) || { name: opp!.nickname || opp!.fullName, played: 0, wins: 0 };
      existing.played++;
      if (won) existing.wins++;
      opponentStats.set(key, existing);
    }

    // Recent matches (last 20)
    if (recentMatches.length < 20) {
      recentMatches.push({
        id: match.id,
        tournamentName: match.round?.tournament?.name || "?",
        tournamentId: match.round?.tournament?.id,
        partner: partner ? (partner.nickname || partner.fullName) : null,
        opponents: [oppTeam?.player1, oppTeam?.player2].filter(Boolean).map(p => p!.nickname || p!.fullName),
        won,
        score: sets.filter(([a, b]) => a !== null).map(([a, b]) => isTeamA ? `${a}-${b}` : `${b}-${a}`).join(" / "),
      });
    }
  }

  // Tournaments participated
  const tournamentIds = new Set<string>();
  [...player.teamsAsPlayer1, ...player.teamsAsPlayer2].forEach(t => {
    if (t.tournament) tournamentIds.add(t.tournament.id);
  });

  return serialize({
    player: {
      id: player.id,
      fullName: player.fullName,
      nickname: player.nickname,
      elo: player.eloRating,
    },
    stats: {
      totalMatches: wins + losses,
      wins,
      losses,
      winRate: wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0,
      setsWon,
      setsLost,
      setDiff: setsWon - setsLost,
      totalPoints,
      tournamentsPlayed: tournamentIds.size,
    },
    topPartners: Array.from(partnerStats.values())
      .sort((a, b) => b.played - a.played)
      .slice(0, 5),
    topOpponents: Array.from(opponentStats.values())
      .sort((a, b) => b.played - a.played)
      .slice(0, 5),
    recentMatches,
  });
}

// ══════════════════════════════════════════════════════════════════════
// Feature 5: Pending Requests Count (for nav badge)
// ══════════════════════════════════════════════════════════════════════

export async function getPendingRequestsCount() {
  const user = await requireAuth();

  // For admins: count all pending requests
  if (user.role === "ADMINISTRADOR") {
    const count = await prisma.leagueMembership.count({ where: { status: "PENDING" } });
    return count;
  }

  // For managers: count pending requests for leagues they manage
  const managedLeagues = await prisma.leagueManager.findMany({
    where: { userId: user.id },
    select: { leagueId: true },
  });

  if (managedLeagues.length === 0) return 0;

  const count = await prisma.leagueMembership.count({
    where: {
      status: "PENDING",
      leagueId: { in: managedLeagues.map((m) => m.leagueId) },
    },
  });
  return count;
}

// ══════════════════════════════════════════════════════════════════════
// Feature 11: Bulk Import Players from CSV
// ══════════════════════════════════════════════════════════════════════

export async function importPlayersFromCSV(leagueId: string, csvText: string) {
  await requireLeagueManager(leagueId);

  // Plan check: CSV import
  await requireFeature("CSV_IMPORT");

  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) throw new Error("Ficheiro CSV vazio.");

  // Check if first line is a header
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes("nome") || firstLine.includes("name") || firstLine.includes("email");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  if (dataLines.length === 0) throw new Error("Sem dados para importar.");

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const parts = dataLines[i].split(/[,;\t]/).map((p) => p.trim().replace(/^["']|["']$/g, ""));
    const fullName = parts[0];
    const nickname = parts[1] || null;
    const phone = parts[2] || null;
    const email = parts[3] || null;

    if (!fullName) {
      errors.push(`Linha ${i + 1}: nome em falta`);
      skipped++;
      continue;
    }

    try {
      // Create player
      const player = await prisma.player.create({
        data: { fullName, nickname },
      });

      // Create user account if email provided
      if (email) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (!existing) {
          const tempPass = await bcrypt.hash(Math.random().toString(36).slice(2), 12);
          await prisma.user.create({
            data: {
              email,
              phone: phone || "",
              hashedPassword: tempPass,
              mustChangePassword: true,
              role: "JOGADOR",
              playerId: player.id,
            },
          });
        } else if (!existing.playerId) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { playerId: player.id },
          });
        }
      }

      // Add membership to league (auto-approved)
      const userId = email
        ? (await prisma.user.findUnique({ where: { email } }))?.id
        : null;
      if (userId) {
        await prisma.leagueMembership.upsert({
          where: { userId_leagueId: { userId, leagueId } },
          update: { status: "APPROVED" },
          create: { userId, leagueId, status: "APPROVED" },
        });
      }

      created++;
    } catch (err) {
      errors.push(`Linha ${i + 1} (${fullName}): ${(err as Error).message}`);
      skipped++;
    }
  }

  revalidatePath(`/ligas/${leagueId}/membros`);
  return { imported: created, skipped, errors, total: dataLines.length };
}

// ══════════════════════════════════════════════════════════════════════
// Feature 10: Auto-balance Teams by Ranking
// ══════════════════════════════════════════════════════════════════════

export async function getPlayersWithRanking(seasonId: string) {
  await requireAuth();

  const rankings = await prisma.seasonRankingEntry.findMany({
    where: { seasonId },
    include: { player: { select: { id: true, fullName: true, nickname: true } } },
    orderBy: { pointsTotal: "desc" },
  });

  return serialize(
    rankings.map((r) => ({
      playerId: r.player.id,
      name: r.player.nickname || r.player.fullName,
      points: r.pointsTotal,
      matchesPlayed: r.matchesPlayed,
    }))
  );
}

// ══════════════════════════════════════════════════════════════════════
// Feature 17: Analytics
// ══════════════════════════════════════════════════════════════════════

export async function getAnalytics() {
  await requireAdmin();

  const [users, players, leagues, tournaments] = await Promise.all([
    prisma.user.count(),
    prisma.player.count(),
    prisma.league.count({ where: { isActive: true } }),
    prisma.tournament.count(),
  ]);

  // Tournaments by status
  const tournamentsByStatus = await prisma.tournament.groupBy({
    by: ["status"],
    _count: true,
  });

  // Top leagues by member count
  const topLeagues = await prisma.league.findMany({
    where: { isActive: true },
    include: { _count: { select: { memberships: { where: { status: "APPROVED" } } } } },
    orderBy: { memberships: { _count: "desc" } },
    take: 5,
  });

  // Recent activity (last 10 tournaments)
  const recentActivity = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, name: true, createdAt: true, league: { select: { name: true } } },
  });

  return serialize({
    totals: { users, players, leagues, tournaments },
    tournamentsByStatus: tournamentsByStatus.map((s) => ({ status: s.status, _count: s._count })),
    topLeagues: topLeagues.map((l) => ({
      id: l.id,
      name: l.name,
      location: l.location,
      _count: { memberships: l._count.memberships },
    })),
    recentActivity,
  });
}

// ══════════════════════════════════════════════════════════════════════
// Feature 15: Elo Rating System
// ══════════════════════════════════════════════════════════════════════

const ELO_K = 32;

function calculateEloChange(ratingA: number, ratingB: number, scoreA: number): number {
  const expected = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  return Math.round(ELO_K * (scoreA - expected));
}

export async function updateEloAfterMatch(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      teamA: { include: { player1: true, player2: true } },
      teamB: { include: { player1: true, player2: true } },
    },
  });

  if (!match || match.status !== "FINISHED" || !match.winnerTeamId) return;

  const isWinA = match.winnerTeamId === match.teamAId;
  const scoreA = isWinA ? 1 : 0;
  const scoreB = isWinA ? 0 : 1;

  // Get all players from both teams
  const playersA = [match.teamA.player1, match.teamA.player2].filter(Boolean);
  const playersB = [match.teamB.player1, match.teamB.player2].filter(Boolean);

  const avgRatingA = playersA.reduce((s, p) => s + (p?.eloRating ?? 1200), 0) / playersA.length;
  const avgRatingB = playersB.reduce((s, p) => s + (p?.eloRating ?? 1200), 0) / playersB.length;

  const changeA = calculateEloChange(avgRatingA, avgRatingB, scoreA);
  const changeB = calculateEloChange(avgRatingB, avgRatingA, scoreB);

  // Create EloHistory entries before updating ratings
  const historyEntries = [
    ...playersA.map((p) => ({
      playerId: p!.id,
      matchId,
      oldRating: p!.eloRating ?? 1200,
      newRating: (p!.eloRating ?? 1200) + changeA,
      change: changeA,
    })),
    ...playersB.map((p) => ({
      playerId: p!.id,
      matchId,
      oldRating: p!.eloRating ?? 1200,
      newRating: (p!.eloRating ?? 1200) + changeB,
      change: changeB,
    })),
  ];

  await prisma.eloHistory.createMany({ data: historyEntries });

  // Update all players
  const updates = [
    ...playersA.map((p) =>
      prisma.player.update({
        where: { id: p!.id },
        data: { eloRating: { increment: changeA } },
      })
    ),
    ...playersB.map((p) =>
      prisma.player.update({
        where: { id: p!.id },
        data: { eloRating: { increment: changeB } },
      })
    ),
  ];

  await Promise.all(updates);
}

// ══════════════════════════════════════════════════════════════════════
// Feature 16: Player Availability
// ══════════════════════════════════════════════════════════════════════

// Legacy wrapper — kept so existing calendar component doesn't break at import level
export async function setPlayerAvailability(
  _dates: { date: string; available: boolean; note?: string }[]
) {
  // No-op: availability is now per-tournament via setTournamentPlayerAvailability
}

// ── Tournament-based Player Availability (C3) ──

export async function setTournamentPlayerAvailability(
  tournamentId: string,
  status: "AVAILABLE" | "UNAVAILABLE" | "MAYBE",
  note?: string
) {
  const session = await requireAuth();

  if (!session.playerId) throw new Error("Sem jogador associado.");
  const playerId = session.playerId;

  await prisma.playerAvailability.upsert({
    where: {
      tournamentId_playerId: { tournamentId, playerId },
    },
    update: { status, note: note || null },
    create: {
      tournamentId,
      playerId,
      status,
      note: note || null,
    },
  });

  revalidatePath(`/torneios/${tournamentId}`);
}

export async function getTournamentPlayerAvailabilities(tournamentId: string) {
  await requireAuth();

  const entries = await prisma.playerAvailability.findMany({
    where: { tournamentId },
    include: {
      player: { select: { id: true, fullName: true, nickname: true } },
    },
  });

  return entries.map((e) => ({
    playerId: e.player.id,
    playerName: e.player.nickname || e.player.fullName,
    status: e.status,
    note: e.note,
  }));
}

export async function getMyTournamentAvailability(tournamentId: string) {
  const session = await requireAuth();

  if (!session.playerId) return null;

  const entry = await prisma.playerAvailability.findUnique({
    where: {
      tournamentId_playerId: { tournamentId, playerId: session.playerId },
    },
  });

  return entry ? { status: entry.status, note: entry.note } : null;
}

// ══════════════════════════════════════════════════════════════════════
// Feature 2D: Elo History
// ══════════════════════════════════════════════════════════════════════

export async function getEloHistory(playerId: string) {
  const history = await prisma.eloHistory.findMany({
    where: { playerId },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  return serialize(history);
}

// ══════════════════════════════════════════════════════════════════════
// Feature 2A: Player Match History
// ══════════════════════════════════════════════════════════════════════

export async function getPlayerMatchHistory(
  playerId: string,
  page: number = 1,
  limit: number = 10
) {
  await requireAuth();

  const skip = (page - 1) * limit;

  const [matches, total] = await Promise.all([
    prisma.match.findMany({
      where: {
        status: "FINISHED",
        OR: [
          { teamA: { OR: [{ player1Id: playerId }, { player2Id: playerId }] } },
          { teamB: { OR: [{ player1Id: playerId }, { player2Id: playerId }] } },
        ],
      },
      include: {
        teamA: { include: { player1: true, player2: true } },
        teamB: { include: { player1: true, player2: true } },
        tournament: { select: { id: true, name: true, season: { select: { name: true } } } },
        court: { select: { name: true } },
      },
      orderBy: { playedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.match.count({
      where: {
        status: "FINISHED",
        OR: [
          { teamA: { OR: [{ player1Id: playerId }, { player2Id: playerId }] } },
          { teamB: { OR: [{ player1Id: playerId }, { player2Id: playerId }] } },
        ],
      },
    }),
  ]);

  const formatted = matches.map((m) => {
    const isTeamA =
      m.teamA.player1Id === playerId || m.teamA.player2Id === playerId;
    const myTeam = isTeamA ? m.teamA : m.teamB;
    const oppTeam = isTeamA ? m.teamB : m.teamA;
    const won = isTeamA
      ? m.resultType === "WIN_A"
      : m.resultType === "WIN_B";
    const lost = isTeamA
      ? m.resultType === "WIN_B"
      : m.resultType === "WIN_A";

    return {
      id: m.id,
      date: m.playedAt,
      tournament: m.tournament.name,
      season: m.tournament.season?.name ?? "—",
      court: m.court?.name || null,
      partner: myTeam.player2
        ? myTeam.player1Id === playerId
          ? myTeam.player2.nickname || myTeam.player2.fullName
          : myTeam.player1.nickname || myTeam.player1.fullName
        : null,
      opponents: [
        oppTeam.player1.nickname || oppTeam.player1.fullName,
        oppTeam.player2
          ? oppTeam.player2.nickname || oppTeam.player2.fullName
          : null,
      ].filter(Boolean),
      scores: [
        m.set1A !== null ? `${m.set1A}-${m.set1B}` : null,
        m.set2A !== null ? `${m.set2A}-${m.set2B}` : null,
        m.set3A !== null ? `${m.set3A}-${m.set3B}` : null,
      ].filter(Boolean),
      result: won ? "WIN" : lost ? "LOSS" : "DRAW",
    };
  });

  return serialize({ matches: formatted, total, page, totalPages: Math.ceil(total / limit) });
}

// ══════════════════════════════════════════════════════════════════════
// Feature 2B: Player Result Submission
// ══════════════════════════════════════════════════════════════════════

export async function submitMatchResult(
  matchId: string,
  scores: {
    set1A: number | null;
    set1B: number | null;
    set2A: number | null;
    set2B: number | null;
    set3A: number | null;
    set3B: number | null;
  }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    // Plan check: player result submission
    await requireFeature("PLAYER_RESULT_SUBMISSION");

    const session = await requireAuth();
    if (!session.playerId) return { success: false, error: "Sem jogador associado." };

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: { include: { season: true } },
        teamA: true,
        teamB: true,
      },
    });

    if (!match) return { success: false, error: "Jogo não encontrado." };
    if (match.status === "FINISHED") return { success: false, error: "Este jogo já tem resultado." };

    // Check if player is part of this match
    const isInTeamA =
      match.teamA.player1Id === session.playerId ||
      match.teamA.player2Id === session.playerId;
    const isInTeamB =
      match.teamB.player1Id === session.playerId ||
      match.teamB.player2Id === session.playerId;

    if (!isInTeamA && !isInTeamB)
      return { success: false, error: "Não fazes parte deste jogo." };

    // Check for existing pending submission
    const existing = await prisma.matchResultSubmission.findFirst({
      where: { matchId, status: "PENDING" },
    });

    if (existing) {
      if (existing.submittedBy === session.id)
        return { success: false, error: "Já submeteste um resultado para este jogo." };

      // This is a confirmation by the other team — check scores match
      const scoresMatch =
        existing.set1A === scores.set1A &&
        existing.set1B === scores.set1B &&
        existing.set2A === scores.set2A &&
        existing.set2B === scores.set2B &&
        existing.set3A === scores.set3A &&
        existing.set3B === scores.set3B;

      if (scoresMatch) {
        // Auto-confirm: both teams agree
        await prisma.matchResultSubmission.update({
          where: { id: existing.id },
          data: { status: "CONFIRMED", confirmedBy: session.id },
        });
        // Apply the score using the internal helper
        const saveResult = await saveMatchScoreInternal(matchId, scores, match);
        if (!saveResult.success) return saveResult;

        revalidatePath(`/torneios/${match.tournamentId}`);
        return { success: true };
      } else {
        // Scores don't match — reject old, create new
        await prisma.matchResultSubmission.update({
          where: { id: existing.id },
          data: { status: "REJECTED" },
        });
      }
    }

    // Create new submission
    await prisma.matchResultSubmission.create({
      data: {
        matchId,
        submittedBy: session.id,
        ...scores,
        status: "PENDING",
      },
    });

    revalidatePath(`/torneios/${match.tournamentId}`);
    return { success: true };
  } catch (e) {
    const msg = (e as Error).message || "";
    if (msg.includes("Não autenticado") || msg.includes("Sem jogador") || msg.includes("PLAN_")) {
      const { sanitizeError } = await import("./error-utils");
      return { success: false, error: sanitizeError(e) };
    }
    return { success: false, error: "Erro ao submeter o resultado. Tente novamente." };
  }
}

export async function confirmMatchResult(submissionId: string) {
  const session = await requireAuth();
  if (!session.playerId) throw new Error("Sem jogador associado.");

  const submission = await prisma.matchResultSubmission.findUnique({
    where: { id: submissionId },
    include: {
      match: {
        include: {
          teamA: true,
          teamB: true,
          tournament: { select: { id: true, numberOfSets: true, seasonId: true, season: { select: { allowDraws: true } } } },
        },
      },
    },
  });
  if (!submission) throw new Error("Submissão não encontrada.");
  if (submission.status !== "PENDING") throw new Error("Esta submissão já foi processada.");

  // Check confirmer is in the OPPOSITE team from submitter
  const submitterUser = await prisma.user.findUnique({ where: { id: submission.submittedBy }, select: { playerId: true } });
  if (!submitterUser?.playerId) throw new Error("Submitter inválido.");

  const match = submission.match;
  const submitterInTeamA = match.teamA.player1Id === submitterUser.playerId || match.teamA.player2Id === submitterUser.playerId;
  const confirmerTeam = submitterInTeamA ? match.teamB : match.teamA;

  const isConfirmerInOppositeTeam = confirmerTeam.player1Id === session.playerId || confirmerTeam.player2Id === session.playerId;
  if (!isConfirmerInOppositeTeam) throw new Error("Só um jogador da equipa adversária pode confirmar.");

  // Update submission
  await prisma.matchResultSubmission.update({
    where: { id: submissionId },
    data: { confirmedBy: session.id, status: "CONFIRMED" },
  });

  // Now actually save the match score
  const scores = {
    set1A: submission.set1A, set1B: submission.set1B,
    set2A: submission.set2A, set2B: submission.set2B,
    set3A: submission.set3A, set3B: submission.set3B,
  };

  const result = determineResult(
    scores.set1A!, scores.set1B!,
    scores.set2A, scores.set2B,
    scores.set3A, scores.set3B,
    match.tournament.season?.allowDraws ?? false,
    match.tournament.numberOfSets
  );

  const winnerTeamId = result.resultType === "WIN_A" ? match.teamAId
    : result.resultType === "WIN_B" ? match.teamBId
    : null;

  await prisma.match.update({
    where: { id: match.id },
    data: {
      ...scores,
      status: "FINISHED",
      resultType: result.resultType,
      winnerTeamId,
      playedAt: new Date(),
    },
  });

  // Recompute ranking
  if (match.tournament.seasonId) await recomputeSeasonRanking(match.tournament.seasonId);

  // Fire-and-forget Elo update
  updateEloAfterMatch(match.id).catch(() => {});

  // Notify submitter
  await prisma.notification.create({
    data: {
      userId: submission.submittedBy,
      title: "Resultado confirmado",
      message: "O resultado que submeteste foi confirmado pelo adversário.",
      type: "RESULT",
      href: `/torneios/${match.tournamentId}`,
    },
  }).catch(() => {});

  revalidatePath(`/torneios/${match.tournamentId}`);
  return { success: true };
}

export async function rejectMatchResult(submissionId: string) {
  const session = await requireAuth();
  if (!session.playerId) throw new Error("Sem jogador associado.");

  const submission = await prisma.matchResultSubmission.findUnique({
    where: { id: submissionId },
    include: { match: { include: { teamA: true, teamB: true, tournament: { select: { id: true } } } } },
  });
  if (!submission) throw new Error("Submissão não encontrada.");
  if (submission.status !== "PENDING") throw new Error("Esta submissão já foi processada.");

  await prisma.matchResultSubmission.update({
    where: { id: submissionId },
    data: { status: "REJECTED" },
  });

  // Notify submitter
  await prisma.notification.create({
    data: {
      userId: submission.submittedBy,
      title: "Resultado rejeitado",
      message: "O resultado que submeteste foi rejeitado pelo adversário. Submete novamente.",
      type: "RESULT",
      href: `/torneios/${submission.match.tournamentId}`,
    },
  }).catch(() => {});

  revalidatePath(`/torneios/${submission.match.tournamentId}`);
  return { success: true };
}

export async function getPendingSubmission(matchId: string) {
  await requireAuth();
  const submission = await prisma.matchResultSubmission.findFirst({
    where: { matchId, status: "PENDING" },
    include: { submitter: { select: { email: true, player: { select: { fullName: true } } } } },
  });
  return serialize(submission);
}

// Also keep the original name as an alias for backwards compatibility
export { getPendingSubmission as getPendingSubmissions };

// Internal helper — applies scores without requireLeagueManager check
async function saveMatchScoreInternal(
  matchId: string,
  scores: {
    set1A: number | null;
    set1B: number | null;
    set2A: number | null;
    set2B: number | null;
    set3A: number | null;
    set3B: number | null;
  },
  match: any
): Promise<{ success: true } | { success: false; error: string }> {
  const allowDraws = match.tournament.season?.allowDraws ?? false;
  const numberOfSets = match.tournament.numberOfSets;

  const validationError = validateMatchScores(
    scores.set1A, scores.set1B,
    scores.set2A, scores.set2B,
    scores.set3A, scores.set3B,
    allowDraws,
    numberOfSets
  );
  if (validationError) return { success: false, error: validationError };

  const result = determineResult(
    scores.set1A!, scores.set1B!,
    scores.set2A, scores.set2B,
    scores.set3A, scores.set3B,
    allowDraws,
    numberOfSets
  );

  const winnerTeamId =
    result.resultType === "WIN_A" ? match.teamAId :
    result.resultType === "WIN_B" ? match.teamBId :
    null;

  await prisma.match.update({
    where: { id: matchId },
    data: {
      ...scores,
      status: "FINISHED",
      resultType: result.resultType,
      winnerTeamId,
      playedAt: new Date(),
    },
  });

  await prisma.tournament.update({
    where: { id: match.tournamentId },
    data: { status: "RUNNING" },
  });

  if (match.tournament.seasonId) await recomputeSeasonRanking(match.tournament.seasonId);

  updateEloAfterMatch(matchId).catch((err) =>
    console.error("[ELO] Erro ao atualizar ratings:", (err as Error).message)
  );

  // Complete ladder challenge if applicable
  completeLadderMatch(matchId).catch((err) =>
    console.error("[LADDER] Erro ao completar desafio:", (err as Error).message)
  );

  logAudit("PLAYER_SUBMIT_MATCH", "Match", matchId, { scores }).catch(() => {});

  return { success: true };
}

// ══════════════════════════════════════════════════════════════════════
// Feature 3C: Custom WhatsApp Messages
// ══════════════════════════════════════════════════════════════════════

export async function sendCustomGroupMessage(leagueId: string, message: string) {
  await requireLeagueManager(leagueId);

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { whatsappGroupId: true },
  });

  if (!league?.whatsappGroupId) {
    throw new Error("Nenhum grupo WhatsApp configurado.");
  }

  await sendGroupMessage(league.whatsappGroupId, message);

  logAudit("SEND_WHATSAPP", "League", leagueId, { messageLength: message.length }).catch(() => {});
}

// ══════════════════════════════════════════════════════════════════════
// Feature 3E: Season Settings + Clone
// ══════════════════════════════════════════════════════════════════════

export async function updateSeasonSettings(
  seasonId: string,
  data: {
    name?: string;
    allowDraws?: boolean;
    startDate?: string | null;
    endDate?: string | null;
    rankingMode?: string;
    pointsWin?: number;
    pointsDraw?: number;
    pointsLoss?: number;
    pointsSetWon?: number;
  }
) {
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: { leagueId: true, pointsWin: true, pointsDraw: true, pointsLoss: true, pointsSetWon: true, rankingMode: true },
  });
  if (!season) throw new Error("Época não encontrada.");
  await requireLeagueManager(season.leagueId);

  const needsRecompute =
    (data.pointsWin !== undefined && data.pointsWin !== season.pointsWin) ||
    (data.pointsDraw !== undefined && data.pointsDraw !== season.pointsDraw) ||
    (data.pointsLoss !== undefined && data.pointsLoss !== season.pointsLoss) ||
    (data.pointsSetWon !== undefined && data.pointsSetWon !== season.pointsSetWon);

  await prisma.season.update({
    where: { id: seasonId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.allowDraws !== undefined && { allowDraws: data.allowDraws }),
      ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
      ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
      ...(data.rankingMode !== undefined && { rankingMode: data.rankingMode }),
      ...(data.pointsWin !== undefined && { pointsWin: data.pointsWin }),
      ...(data.pointsDraw !== undefined && { pointsDraw: data.pointsDraw }),
      ...(data.pointsLoss !== undefined && { pointsLoss: data.pointsLoss }),
      ...(data.pointsSetWon !== undefined && { pointsSetWon: data.pointsSetWon }),
    },
  });

  // If points config changed, recompute all rankings
  if (needsRecompute) {
    await recomputeSeasonRanking(seasonId);
  }

  logAudit("UPDATE_SEASON", "Season", seasonId, data).catch(() => {});
  revalidatePath(`/ligas/${season.leagueId}/epocas/${seasonId}`);
}

// ── Easy Mix (simplified public tournaments) ──

export async function searchPlayers(query: string) {
  "use server";
  if (!query || query.trim().length < 1) return [];
  const q = query.trim();
  const results = await prisma.player.findMany({
    where: {
      user: { isNot: null },
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { nickname: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      fullName: true,
      nickname: true,
      user: { select: { id: true } },
    },
    take: 10,
  });
  return results.map((p) => ({
    id: p.id,
    fullName: p.fullName,
    nickname: p.nickname,
    userId: p.user!.id,
  }));
}

export async function createEasyMix(data: {
  name: string;
  playerNames?: string[];
  players?: { name: string; playerId?: string }[];
  courtsCount: number;
  numberOfSets: number;
  numberOfRounds: number;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Autenticação necessária.");

  if (!data.name?.trim()) throw new Error("Nome é obrigatório.");

  // Support both old format (playerNames) and new format (players)
  const playerEntries: { name: string; playerId?: string }[] = data.players
    ? data.players
    : (data.playerNames ?? []).map((n) => ({ name: n }));

  if (playerEntries.length < 4) throw new Error("Mínimo de 4 jogadores.");
  if (data.courtsCount < 1) throw new Error("Mínimo de 1 campo.");

  // Generate a unique slug
  const slug = Math.random().toString(36).substring(2, 10);

  // Create players: use existing if playerId provided, otherwise create ad-hoc
  const playerIds: string[] = [];
  for (const entry of playerEntries) {
    if (entry.playerId) {
      // Registered player — verify they exist
      const existing = await prisma.player.findUnique({ where: { id: entry.playerId } });
      if (!existing) throw new Error(`Jogador não encontrado: ${entry.name}`);
      playerIds.push(existing.id);
    } else {
      // Ad-hoc player (no user account)
      const player = await prisma.player.create({
        data: { fullName: entry.name.trim() },
      });
      playerIds.push(player.id);
    }
  }

  // Create standalone tournament (no league/season for Easy Mix)
  const tournament = await prisma.tournament.create({
    data: {
      name: data.name.trim(),
      startDate: new Date(),
      format: "ROUND_ROBIN",
      teamMode: "RANDOM_PER_ROUND",
      teamSize: 2,
      courtsCount: data.courtsCount,
      matchesPerPair: 1,
      numberOfSets: data.numberOfSets,
      numberOfRounds: data.numberOfRounds,
      randomSeed: Math.random().toString(36).substring(2, 8),
      isEasyMix: true,
      publicSlug: slug,
      status: "DRAFT",
    },
  });

  // Create courts (legacy relation — direct Court records linked to tournament)
  for (let i = 0; i < data.courtsCount; i++) {
    await prisma.court.create({
      data: {
        tournamentId: tournament.id,
        name: `Campo ${i + 1}`,
        quality: "GOOD",
        orderIndex: i,
      },
    });
  }

  // Create inscriptions
  for (let i = 0; i < playerIds.length; i++) {
    await prisma.tournamentInscription.create({
      data: {
        tournamentId: tournament.id,
        playerId: playerIds[i],
        orderIndex: i,
        status: "TITULAR",
      },
    });
  }

  // Generate schedule
  await generateSchedule(tournament.id);

  return { slug, tournamentId: tournament.id };
}

export async function getEasyMix(slug: string) {
  const tournament = await prisma.tournament.findFirst({
    where: { publicSlug: slug, isEasyMix: true },
    include: {
      rounds: {
        orderBy: { index: "asc" },
        include: {
          matches: {
            orderBy: { slotIndex: "asc" },
            include: {
              teamA: { include: { player1: true, player2: true } },
              teamB: { include: { player1: true, player2: true } },
              court: true,
            },
          },
        },
      },
      courts: { orderBy: { orderIndex: "asc" } },
      inscriptions: {
        orderBy: { orderIndex: "asc" },
        include: { player: true },
      },
    },
  });
  return serialize(tournament);
}

export async function saveEasyMixScore(
  matchId: string,
  scores: { set1A: number | null; set1B: number | null; set2A: number | null; set2B: number | null; set3A: number | null; set3B: number | null }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { tournament: { include: { season: true } } },
    });
    if (!match) return { success: false, error: "Jogo não encontrado." };
    if (!match.tournament.isEasyMix) return { success: false, error: "Este jogo não é Easy Mix." };

    const allowDraws = match.tournament.season?.allowDraws ?? false;
    const numberOfSets = match.tournament.numberOfSets;

    const validationError = validateMatchScores(
      scores.set1A, scores.set1B, scores.set2A, scores.set2B,
      scores.set3A, scores.set3B, allowDraws, numberOfSets
    );
    if (validationError) return { success: false, error: validationError };

    const result = determineResult(
      scores.set1A!, scores.set1B!, scores.set2A, scores.set2B,
      scores.set3A, scores.set3B, allowDraws, numberOfSets
    );

    const winnerTeamId =
      result.resultType === "WIN_A" ? match.teamAId :
      result.resultType === "WIN_B" ? match.teamBId : null;

    await prisma.match.update({
      where: { id: matchId },
      data: {
        ...scores,
        status: "FINISHED",
        resultType: result.resultType,
        winnerTeamId,
        playedAt: new Date(),
      },
    });

    // ELO update for Easy Mix: only if ALL players are registered (have userId)
    if (match.tournament.isEasyMix && winnerTeamId) {
      const inscriptions = await prisma.tournamentInscription.findMany({
        where: { tournamentId: match.tournament.id },
        include: { player: { include: { user: true } } },
      });
      const allRegistered = inscriptions.every((ins) => ins.player.user !== null);
      if (allRegistered) {
        updateEloAfterMatch(matchId).catch((err) =>
          console.error("[ELO] Erro ao atualizar ratings:", (err as Error).message)
        );
      }
    }

    revalidatePath(`/mix/${match.tournament.publicSlug}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Erro ao guardar." };
  }
}

// ── Tournament Templates ──

export async function saveTemplate(leagueId: string, name: string, config: string) {
  await requireLeagueManager(leagueId);
  const template = await prisma.tournamentTemplate.create({
    data: { leagueId, name: name.trim(), config },
  });
  logAudit("CREATE_TEMPLATE", "TournamentTemplate", template.id, { name }).catch(() => {});
  revalidatePath(`/ligas/${leagueId}`);
  return template;
}

export async function getTemplates(leagueId: string) {
  return prisma.tournamentTemplate.findMany({
    where: { leagueId },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteTemplate(templateId: string) {
  const template = await prisma.tournamentTemplate.findUnique({
    where: { id: templateId },
  });
  if (!template) throw new Error("Modelo não encontrado.");
  await requireLeagueManager(template.leagueId);
  await prisma.tournamentTemplate.delete({ where: { id: templateId } });
  logAudit("DELETE_TEMPLATE", "TournamentTemplate", templateId).catch(() => {});
  revalidatePath(`/ligas/${template.leagueId}`);
}

export async function cloneSeason(seasonId: string) {
  // Plan check: clone season
  await requireFeature("CLONE_SEASON");

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: { leagueId: true, name: true, allowDraws: true },
  });
  if (!season) throw new Error("Época não encontrada.");
  await requireLeagueManager(season.leagueId);

  const newSeason = await prisma.season.create({
    data: {
      leagueId: season.leagueId,
      name: `${season.name} (cópia)`,
      allowDraws: season.allowDraws,
    },
  });

  logAudit("CLONE_SEASON", "Season", newSeason.id, { fromSeasonId: seasonId }).catch(() => {});
  revalidatePath(`/ligas/${season.leagueId}`);
  return serialize(newSeason);
}

// ══════════════════════════════════════════════════════════════════════
// Feature 3G: Court Time Slots
// ══════════════════════════════════════════════════════════════════════

export async function getCourtTimeSlots(courtId: string) {
  const slots = await prisma.courtTimeSlot.findMany({
    where: { courtId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  return serialize(slots);
}

export async function upsertCourtTimeSlots(
  courtId: string,
  leagueId: string,
  slots: { dayOfWeek: number; startTime: string; endTime: string }[]
) {
  await requireLeagueManager(leagueId);

  // Delete all existing slots for this court
  await prisma.courtTimeSlot.deleteMany({ where: { courtId } });

  // Create new ones
  if (slots.length > 0) {
    await prisma.courtTimeSlot.createMany({
      data: slots.map((s) => ({
        courtId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    });
  }

  logAudit("UPDATE_COURT_SLOTS", "Court", courtId, { slotCount: slots.length }).catch(() => {});
  revalidatePath(`/ligas/${leagueId}`);
}

// ══════════════════════════════════════════════════════════════════════
// Feature 4A: System Settings
// ══════════════════════════════════════════════════════════════════════

export async function getSystemSettings() {
  await requireAdmin();
  const settings = await prisma.systemSetting.findMany({
    orderBy: { key: "asc" },
  });
  return serialize(settings);
}

export async function updateSystemSetting(key: string, value: string) {
  await requireAdmin();

  await prisma.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value, label: key, type: "number" },
  });

  logAudit("UPDATE_SETTING", "SystemSetting", key, { value }).catch(() => {});
  return { success: true };
}

export async function getSettingValue(key: string, fallback: string): Promise<string> {
  const setting = await prisma.systemSetting.findUnique({ where: { key } });
  return setting?.value ?? fallback;
}

// ══════════════════════════════════════════════════════════════════════
// Feature 4B: Advanced Analytics
// ══════════════════════════════════════════════════════════════════════

export async function getAdvancedAnalytics() {
  await requireAdmin();

  // Users registered per month (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const usersRaw = await prisma.user.findMany({
    where: { createdAt: { gte: twelveMonthsAgo } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const usersByMonth: Record<string, number> = {};
  for (const u of usersRaw) {
    const key = new Date(u.createdAt).toLocaleDateString("pt-PT", { month: "short", year: "2-digit" });
    usersByMonth[key] = (usersByMonth[key] || 0) + 1;
  }

  // Matches per week (last 12 weeks)
  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

  const matchesRaw = await prisma.match.findMany({
    where: { status: "FINISHED", playedAt: { gte: twelveWeeksAgo } },
    select: { playedAt: true },
    orderBy: { playedAt: "asc" },
  });

  const matchesByWeek: Record<string, number> = {};
  for (const m of matchesRaw) {
    if (!m.playedAt) continue;
    const d = new Date(m.playedAt);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" });
    matchesByWeek[key] = (matchesByWeek[key] || 0) + 1;
  }

  // Elo distribution
  const players = await prisma.player.findMany({
    select: { eloRating: true },
  });

  const eloBuckets: Record<string, number> = {};
  for (const p of players) {
    const rating = p.eloRating ?? 1200;
    const bucket = Math.floor(rating / 100) * 100;
    const label = `${bucket}-${bucket + 99}`;
    eloBuckets[label] = (eloBuckets[label] || 0) + 1;
  }

  // Top Elo players
  const topElo = await prisma.player.findMany({
    orderBy: { eloRating: "desc" },
    take: 10,
    select: { fullName: true, nickname: true, eloRating: true },
  });

  return serialize({
    usersByMonth: Object.entries(usersByMonth).map(([month, count]) => ({ month, count })),
    matchesByWeek: Object.entries(matchesByWeek).map(([week, count]) => ({ week, count })),
    eloDistribution: Object.entries(eloBuckets).sort().map(([range, count]) => ({ range, count })),
    topElo: topElo.map((p) => ({
      name: p.nickname || p.fullName,
      elo: p.eloRating ?? 1200,
    })),
  });
}

// ══════════════════════════════════════════════════════════════════════
// User Profile Management
// ══════════════════════════════════════════════════════════════════════

export async function getUserProfileData() {
  const user = await requireAuth();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      player: {
        select: { id: true, fullName: true, nickname: true, level: true, eloRating: true },
      },
    },
  });

  if (!dbUser) throw new Error("Utilizador não encontrado.");

  return serialize({
    id: dbUser.id,
    email: dbUser.email,
    phone: dbUser.phone,
    role: dbUser.role,
    createdAt: dbUser.createdAt,
    player: dbUser.player
      ? {
          id: dbUser.player.id,
          fullName: dbUser.player.fullName,
          nickname: dbUser.player.nickname,
          level: dbUser.player.level,
          eloRating: dbUser.player.eloRating,
        }
      : null,
  });
}

export async function updateUserProfile(data: {
  fullName?: string;
  nickname?: string;
  phone?: string;
  level?: string;
}) {
  const user = await requireAuth();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { player: true },
  });
  if (!dbUser) throw new Error("Utilizador não encontrado.");

  // Update phone on User
  if (data.phone !== undefined) {
    await prisma.user.update({
      where: { id: user.id },
      data: { phone: data.phone },
    });
  }

  // Update Player fields
  if (dbUser.player) {
    const playerUpdate: Record<string, string | undefined> = {};
    if (data.fullName !== undefined && data.fullName.trim()) {
      playerUpdate.fullName = data.fullName.trim();
    }
    if (data.nickname !== undefined) {
      playerUpdate.nickname = data.nickname.trim() || undefined;
    }
    if (data.level !== undefined) {
      playerUpdate.level = data.level.trim() || undefined;
    }

    if (Object.keys(playerUpdate).length > 0) {
      await prisma.player.update({
        where: { id: dbUser.player.id },
        data: playerUpdate,
      });
    }
  }

  await logAudit("UPDATE_PROFILE", "User", user.id, `Perfil atualizado`);
  revalidatePath("/perfil");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateUserPassword(data: {
  currentPassword: string;
  newPassword: string;
}) {
  const user = await requireAuth();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });
  if (!dbUser) throw new Error("Utilizador não encontrado.");

  // Verify current password
  const valid = await bcrypt.compare(data.currentPassword, dbUser.hashedPassword);
  if (!valid) {
    throw new Error("Palavra-passe atual incorreta.");
  }

  if (data.newPassword.length < 6) {
    throw new Error("A nova palavra-passe deve ter pelo menos 6 caracteres.");
  }

  const hashedPassword = await bcrypt.hash(data.newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { hashedPassword, mustChangePassword: false },
  });

  await logAudit("CHANGE_PASSWORD", "User", user.id, "Palavra-passe alterada");
  revalidatePath("/");
  return { success: true };
}

// ── Scoreboard (Placar de Jogo) ──

export async function getScoreboardData(tournamentId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      league: true,
      season: true,
      courts: { orderBy: { name: "asc" } },
      rounds: {
        orderBy: { index: "asc" },
        include: {
          matches: {
            orderBy: { slotIndex: "asc" },
            include: {
              teamA: { include: { player1: true, player2: true } },
              teamB: { include: { player1: true, player2: true } },
              court: true,
            },
          },
        },
      },
    },
  });

  if (!tournament) throw new Error("Torneio não encontrado.");

  // Check permission: admin or league manager
  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const isAdminUser = user?.role === "ADMINISTRADOR";
  const manager = tournament.leagueId ? await prisma.leagueManager.findUnique({
    where: { userId_leagueId: { userId, leagueId: tournament.leagueId } },
  }) : null;
  if (!isAdminUser && !manager) {
    throw new Error("Sem permissão. Apenas administradores e gestores podem aceder ao placar.");
  }

  return serialize(tournament);
}

export async function saveScoreboardMatch(
  matchId: string,
  scores: {
    set1A: number | null; set1B: number | null;
    set2A: number | null; set2B: number | null;
    set3A: number | null; set3B: number | null;
  }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: { include: { season: true } },
        teamA: true,
        teamB: true,
      },
    });

    if (!match) return { success: false, error: "Jogo não encontrado." };
    await requireLeagueManager(match.tournament.leagueId ?? "");

    const allowDraws = match.tournament.season?.allowDraws ?? false;
    const numberOfSets = match.tournament.numberOfSets;

    const validationError = validateMatchScores(
      scores.set1A, scores.set1B,
      scores.set2A, scores.set2B,
      scores.set3A, scores.set3B,
      allowDraws,
      numberOfSets
    );

    if (validationError) return { success: false, error: validationError };

    const result = determineResult(
      scores.set1A!, scores.set1B!,
      scores.set2A, scores.set2B,
      scores.set3A, scores.set3B,
      allowDraws,
      numberOfSets
    );

    const winnerTeamId =
      result.resultType === "WIN_A" ? match.teamAId :
      result.resultType === "WIN_B" ? match.teamBId :
      null;

    await prisma.match.update({
      where: { id: matchId },
      data: {
        ...scores,
        status: "FINISHED",
        resultType: result.resultType,
        winnerTeamId,
        playedAt: new Date(),
      },
    });

    // Move tournament to RUNNING (but do NOT recalculate ranking —
    // ranking is only recalculated when the tournament is finished/concluded)
    await prisma.tournament.update({
      where: { id: match.tournamentId },
      data: { status: "RUNNING" },
    });

    logAudit("SAVE_MATCH_SCOREBOARD", "Match", matchId, { scores }).catch(() => {});
    revalidatePath(`/torneios/${match.tournamentId}`);
    return { success: true };
  } catch (e) {
    const msg = (e as Error).message || "";
    if (msg.includes("Não autenticado") || msg.includes("Sem permissão") || msg.includes("Não é gestor") || msg.includes("PLAN_")) {
      const { sanitizeError } = await import("./error-utils");
      return { success: false, error: sanitizeError(e) };
    }
    return { success: false, error: "Erro ao guardar o resultado. Tente novamente." };
  }
}

// ── Nonstop Queue Actions ──

export async function joinNonstopQueue(tournamentId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado.");

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { playerId: true } });
  if (!user?.playerId) throw new Error("Utilizador sem jogador associado.");

  // Check player is inscribed
  const inscription = await prisma.tournamentInscription.findUnique({
    where: { tournamentId_playerId: { tournamentId, playerId: user.playerId } },
  });
  if (!inscription || inscription.status !== "TITULAR") throw new Error("Não está inscrito neste torneio.");

  // Check not already in queue with WAITING or PLAYING
  const existing = await prisma.matchQueue.findFirst({
    where: { tournamentId, playerId: user.playerId, status: { in: ["WAITING", "PLAYING"] } },
  });
  if (existing) throw new Error("Já está na fila ou a jogar.");

  await prisma.matchQueue.create({
    data: { tournamentId, playerId: user.playerId, status: "WAITING" },
  });

  await processNonstopQueue(tournamentId);
  revalidatePath(`/torneios/${tournamentId}`);
}

export async function leaveNonstopQueue(tournamentId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado.");

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { playerId: true } });
  if (!user?.playerId) throw new Error("Utilizador sem jogador associado.");

  await prisma.matchQueue.updateMany({
    where: { tournamentId, playerId: user.playerId, status: "WAITING" },
    data: { status: "DONE" },
  });

  revalidatePath(`/torneios/${tournamentId}`);
}

export async function processNonstopQueue(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      tournamentCourts: { include: { court: true } },
      courts: true,
      rounds: { orderBy: { index: "asc" } },
      matches: { where: { status: { in: ["SCHEDULED", "IN_PROGRESS"] } } },
    },
  });
  if (!tournament) return;

  // Get or create the single "Nonstop" round
  let round = tournament.rounds[0];
  if (!round) {
    round = await prisma.round.create({
      data: { tournamentId, index: 1 },
    });
  }

  // Available courts
  const allCourts = tournament.tournamentCourts.length > 0
    ? tournament.tournamentCourts.map((tc) => tc.court)
    : tournament.courts;
  const busyCourtIds = new Set(
    tournament.matches.filter((m) => m.courtId).map((m) => m.courtId!)
  );
  const availableCourts = allCourts.filter((c) => !busyCourtIds.has(c.id));

  // Get WAITING queue entries
  const waitingEntries = await prisma.matchQueue.findMany({
    where: { tournamentId, status: "WAITING" },
    orderBy: { joinedAt: "asc" },
    include: { player: true },
  });

  let courtIdx = 0;

  while (waitingEntries.length >= 4 && courtIdx < availableCourts.length) {
    const fourEntries = waitingEntries.splice(0, 4);
    const court = availableCourts[courtIdx++];

    // Randomly pair into 2 teams
    const shuffled = [...fourEntries];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const p1Name = shuffled[0].player.nickname || shuffled[0].player.fullName;
    const p2Name = shuffled[1].player.nickname || shuffled[1].player.fullName;
    const p3Name = shuffled[2].player.nickname || shuffled[2].player.fullName;
    const p4Name = shuffled[3].player.nickname || shuffled[3].player.fullName;

    const teamA = await prisma.team.create({
      data: {
        tournamentId,
        name: `${p1Name} & ${p2Name}`,
        player1Id: shuffled[0].playerId,
        player2Id: shuffled[1].playerId,
        isRandomGenerated: true,
        roundId: round.id,
      },
    });

    const teamB = await prisma.team.create({
      data: {
        tournamentId,
        name: `${p3Name} & ${p4Name}`,
        player1Id: shuffled[2].playerId,
        player2Id: shuffled[3].playerId,
        isRandomGenerated: true,
        roundId: round.id,
      },
    });

    await prisma.match.create({
      data: {
        tournamentId,
        roundId: round.id,
        courtId: court.id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        status: "SCHEDULED",
        slotIndex: 0,
      },
    });

    // Mark queue entries as PLAYING
    for (const entry of fourEntries) {
      await prisma.matchQueue.update({
        where: { id: entry.id },
        data: { status: "PLAYING" },
      });
    }
  }

  // Update tournament status to RUNNING if there are active matches
  if (courtIdx > 0) {
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: "RUNNING" },
    });
  }

  revalidatePath(`/torneios/${tournamentId}`);
}

export async function finishNonstopMatch(
  matchId: string,
  scores: {
    set1A: number | null;
    set1B: number | null;
    set2A: number | null;
    set2B: number | null;
    set3A: number | null;
    set3B: number | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: { include: { season: true } },
        teamA: true,
        teamB: true,
      },
    });

    if (!match) return { success: false, error: "Jogo não encontrado." };

    const allowDraws = match.tournament.season?.allowDraws ?? false;
    const numberOfSets = match.tournament.numberOfSets;

    const validationError = validateMatchScores(
      scores.set1A, scores.set1B,
      scores.set2A, scores.set2B,
      scores.set3A, scores.set3B,
      allowDraws,
      numberOfSets
    );
    if (validationError) return { success: false, error: validationError };

    const result = determineResult(
      scores.set1A!, scores.set1B!,
      scores.set2A, scores.set2B,
      scores.set3A, scores.set3B,
      allowDraws,
      numberOfSets
    );

    const winnerTeamId =
      result.resultType === "WIN_A" ? match.teamAId :
      result.resultType === "WIN_B" ? match.teamBId :
      null;

    await prisma.match.update({
      where: { id: matchId },
      data: {
        set1A: scores.set1A,
        set1B: scores.set1B,
        set2A: scores.set2A,
        set2B: scores.set2B,
        set3A: scores.set3A,
        set3B: scores.set3B,
        status: "FINISHED",
        resultType: result.resultType,
        winnerTeamId,
        playedAt: new Date(),
      },
    });

    // Mark queue entries for these 4 players as DONE
    const playerIds = [
      match.teamA.player1Id,
      match.teamA.player2Id,
      match.teamB.player1Id,
      match.teamB.player2Id,
    ].filter(Boolean) as string[];

    await prisma.matchQueue.updateMany({
      where: {
        tournamentId: match.tournamentId,
        playerId: { in: playerIds },
        status: "PLAYING",
      },
      data: { status: "DONE" },
    });

    // Process queue to see if new matches can start
    await processNonstopQueue(match.tournamentId);

    // Update season rankings
    if (match.tournament.seasonId) {
      const season = match.tournament.season;
      const pointConfig = {
        pointsWin: season?.pointsWin ?? 3,
        pointsDraw: season?.pointsDraw ?? 1,
        pointsLoss: season?.pointsLoss ?? 0,
        pointsSetWon: season?.pointsSetWon ?? 2,
      };
      const deltas = computeMatchContribution(
        {
          set1A: scores.set1A,
          set1B: scores.set1B,
          set2A: scores.set2A,
          set2B: scores.set2B,
          set3A: scores.set3A,
          set3B: scores.set3B,
          status: "FINISHED",
          resultType: result.resultType,
          teamAId: match.teamAId,
          teamBId: match.teamBId,
          teamA: { player1Id: match.teamA.player1Id, player2Id: match.teamA.player2Id },
          teamB: { player1Id: match.teamB.player1Id, player2Id: match.teamB.player2Id },
          event: "NONE",
        },
        allowDraws,
        pointConfig
      );

      for (const delta of deltas) {
        await prisma.seasonRankingEntry.upsert({
          where: { seasonId_playerId: { seasonId: match.tournament.seasonId, playerId: delta.playerId } },
          create: {
            seasonId: match.tournament.seasonId,
            playerId: delta.playerId,
            pointsTotal: delta.points,
            matchesPlayed: delta.matchesPlayed,
            wins: delta.wins,
            draws: delta.draws,
            losses: delta.losses,
            setsWon: delta.setsWon,
            setsLost: delta.setsLost,
            setsDiff: delta.setsWon - delta.setsLost,
          },
          update: {
            pointsTotal: { increment: delta.points },
            matchesPlayed: { increment: delta.matchesPlayed },
            wins: { increment: delta.wins },
            draws: { increment: delta.draws },
            losses: { increment: delta.losses },
            setsWon: { increment: delta.setsWon },
            setsLost: { increment: delta.setsLost },
            setsDiff: { increment: delta.setsWon - delta.setsLost },
          },
        });
      }
    }

    revalidatePath(`/torneios/${match.tournamentId}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message || "Erro ao guardar resultado." };
  }
}

export async function rejoinNonstopQueue(tournamentId: string) {
  await joinNonstopQueue(tournamentId);
}

export async function getNonstopQueueStatus(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      tournamentCourts: { include: { court: true } },
      courts: true,
      matches: {
        where: { status: { in: ["SCHEDULED", "IN_PROGRESS"] } },
        include: {
          court: true,
          teamA: { include: { player1: true, player2: true } },
          teamB: { include: { player1: true, player2: true } },
        },
      },
    },
  });

  if (!tournament) throw new Error("Torneio não encontrado.");

  // Queue entries
  const queueEntries = await prisma.matchQueue.findMany({
    where: { tournamentId, status: "WAITING" },
    orderBy: { joinedAt: "asc" },
    include: { player: true },
  });

  const queue = queueEntries.map((e) => ({
    id: e.id,
    playerId: e.playerId,
    playerName: e.player.nickname || e.player.fullName,
    joinedAt: e.joinedAt.toISOString(),
    status: e.status,
  }));

  // Active matches
  const activeMatches = tournament.matches.map((m) => ({
    id: m.id,
    courtName: m.court?.name || "Campo",
    team1: [
      m.teamA.player1?.nickname || m.teamA.player1?.fullName || "?",
      m.teamA.player2?.nickname || m.teamA.player2?.fullName,
    ].filter(Boolean) as string[],
    team2: [
      m.teamB.player1?.nickname || m.teamB.player1?.fullName || "?",
      m.teamB.player2?.nickname || m.teamB.player2?.fullName,
    ].filter(Boolean) as string[],
    scores: {
      set1A: m.set1A ?? undefined,
      set1B: m.set1B ?? undefined,
      set2A: m.set2A ?? undefined,
      set2B: m.set2B ?? undefined,
      set3A: m.set3A ?? undefined,
      set3B: m.set3B ?? undefined,
    },
  }));

  // Available courts
  const allCourts = tournament.tournamentCourts.length > 0
    ? tournament.tournamentCourts.map((tc) => tc.court)
    : tournament.courts;
  const busyCourtIds = new Set(tournament.matches.filter((m) => m.courtId).map((m) => m.courtId!));
  const availableCourts = allCourts.filter((c) => !busyCourtIds.has(c.id)).length;

  // Individual standings (reuse Americano logic)
  const standings = await getAmericanoStandings(tournamentId);

  return { queue, activeMatches, availableCourts, standings };
}

// ══════════════════════════════════════════════════════════════════════
// Ladder (Escada) Actions
// ══════════════════════════════════════════════════════════════════════

export async function getLadderPositions(tournamentId: string) {
  const positions = await prisma.ladderPosition.findMany({
    where: { tournamentId },
    include: { player: true },
    orderBy: { position: "asc" },
  });

  const activeChallenges = await prisma.ladderChallenge.findMany({
    where: {
      tournamentId,
      status: { in: ["PENDING", "ACCEPTED"] },
    },
  });

  const activePlayerIds = new Set<string>();
  for (const c of activeChallenges) {
    activePlayerIds.add(c.challengerId);
    activePlayerIds.add(c.defenderId);
  }

  return positions.map(p => ({
    playerId: p.playerId,
    playerName: p.player.nickname || p.player.fullName,
    position: p.position,
    hasActiveChallenge: activePlayerIds.has(p.playerId),
  }));
}

export async function createLadderChallenge(tournamentId: string, defenderId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado");

  const user = await prisma.user.findUnique({ where: { id: (session.user as any).id } });
  if (!user?.playerId) throw new Error("Jogador não encontrado");

  const challengerId = user.playerId;

  const challengerPos = await prisma.ladderPosition.findUnique({
    where: { tournamentId_playerId: { tournamentId, playerId: challengerId } },
  });
  const defenderPos = await prisma.ladderPosition.findUnique({
    where: { tournamentId_playerId: { tournamentId, playerId: defenderId } },
  });

  if (!challengerPos || !defenderPos) throw new Error("Posições não encontradas");

  const diff = challengerPos.position - defenderPos.position;
  if (diff <= 0 || diff > 2) throw new Error("Só podes desafiar jogadores até 2 posições acima");

  const activeChallenger = await prisma.ladderChallenge.findFirst({
    where: { tournamentId, challengerId, status: { in: ["PENDING", "ACCEPTED"] } },
  });
  if (activeChallenger) throw new Error("Já tens um desafio ativo");

  const activeDefender = await prisma.ladderChallenge.findFirst({
    where: {
      tournamentId,
      OR: [
        { challengerId: defenderId, status: { in: ["PENDING", "ACCEPTED"] } },
        { defenderId: defenderId, status: { in: ["PENDING", "ACCEPTED"] } },
      ],
    },
  });
  if (activeDefender) throw new Error("O adversário já tem um desafio ativo");

  const challenge = await prisma.ladderChallenge.create({
    data: { tournamentId, challengerId, defenderId, status: "PENDING" },
  });

  // Notify defender about the challenge (fire-and-forget)
  (async () => {
    try {
      const defenderUser = await prisma.user.findFirst({
        where: { playerId: defenderId },
        select: { id: true },
      });
      const challengerPlayer = await prisma.player.findUnique({
        where: { id: challengerId },
        select: { fullName: true, nickname: true },
      });
      if (defenderUser) {
        const name = challengerPlayer?.nickname || challengerPlayer?.fullName || "Jogador";
        await createNotification(defenderUser.id, {
          title: "Novo desafio na escada",
          message: `${name} desafiou-te! Aceita ou recusa o desafio.`,
          type: "MATCH",
          href: `/torneios/${tournamentId}`,
        });
      }
    } catch {
      // Fire-and-forget
    }
  })();

  revalidatePath(`/torneios/${tournamentId}`);
  return challenge.id;
}

export async function acceptLadderChallenge(challengeId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado");

  const user = await prisma.user.findUnique({ where: { id: (session.user as any).id } });
  if (!user?.playerId) throw new Error("Jogador não encontrado");

  const challenge = await prisma.ladderChallenge.findUnique({
    where: { id: challengeId },
    include: { tournament: { include: { rounds: true } } },
  });

  if (!challenge) throw new Error("Desafio não encontrado");
  if (challenge.defenderId !== user.playerId) throw new Error("Não és o defensor deste desafio");
  if (challenge.status !== "PENDING") throw new Error("Desafio já não está pendente");

  let round = challenge.tournament.rounds[0];
  if (!round) {
    round = await prisma.round.create({
      data: { tournamentId: challenge.tournamentId, index: 1 },
    });
  }

  const challengerPlayer = await prisma.player.findUnique({ where: { id: challenge.challengerId }, select: { fullName: true, nickname: true } });
  const defenderPlayer = await prisma.player.findUnique({ where: { id: challenge.defenderId }, select: { fullName: true, nickname: true } });

  const teamA = await prisma.team.create({
    data: {
      tournamentId: challenge.tournamentId,
      name: challengerPlayer?.nickname || challengerPlayer?.fullName || "Desafiante",
      player1Id: challenge.challengerId,
    },
  });

  const teamB = await prisma.team.create({
    data: {
      tournamentId: challenge.tournamentId,
      name: defenderPlayer?.nickname || defenderPlayer?.fullName || "Defensor",
      player1Id: challenge.defenderId,
    },
  });

  const match = await prisma.match.create({
    data: {
      tournamentId: challenge.tournamentId,
      roundId: round.id,
      teamAId: teamA.id,
      teamBId: teamB.id,
      status: "SCHEDULED",
      resultType: "UNDECIDED",
    },
  });

  await prisma.ladderChallenge.update({
    where: { id: challengeId },
    data: { status: "ACCEPTED", matchId: match.id },
  });

  // Notify challenger that the challenge was accepted (fire-and-forget)
  (async () => {
    try {
      const challengerUser = await prisma.user.findFirst({
        where: { playerId: challenge.challengerId },
        select: { id: true },
      });
      const defName = defenderPlayer?.nickname || defenderPlayer?.fullName || "Defensor";
      if (challengerUser) {
        await createNotification(challengerUser.id, {
          title: "Desafio aceite",
          message: `${defName} aceitou o teu desafio! O jogo foi criado.`,
          type: "MATCH",
          href: `/torneios/${challenge.tournamentId}`,
        });
      }
    } catch {
      // Fire-and-forget
    }
  })();

  revalidatePath(`/torneios/${challenge.tournamentId}`);
  return match.id;
}

export async function declineLadderChallenge(challengeId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado");

  const user = await prisma.user.findUnique({ where: { id: (session.user as any).id } });
  if (!user?.playerId) throw new Error("Jogador não encontrado");

  const challenge = await prisma.ladderChallenge.findUnique({ where: { id: challengeId } });

  if (!challenge) throw new Error("Desafio não encontrado");
  if (challenge.defenderId !== user.playerId) throw new Error("Não és o defensor deste desafio");
  if (challenge.status !== "PENDING") throw new Error("Desafio já não está pendente");

  await prisma.ladderChallenge.update({
    where: { id: challengeId },
    data: { status: "DECLINED" },
  });

  // Notify challenger that the challenge was declined (fire-and-forget)
  (async () => {
    try {
      const challengerUser = await prisma.user.findFirst({
        where: { playerId: challenge.challengerId },
        select: { id: true },
      });
      const defenderPlayer = await prisma.player.findUnique({
        where: { id: challenge.defenderId },
        select: { fullName: true, nickname: true },
      });
      const defName = defenderPlayer?.nickname || defenderPlayer?.fullName || "Defensor";
      if (challengerUser) {
        await createNotification(challengerUser.id, {
          title: "Desafio recusado",
          message: `${defName} recusou o teu desafio.`,
          type: "MATCH",
          href: `/torneios/${challenge.tournamentId}`,
        });
      }
    } catch {
      // Fire-and-forget
    }
  })();

  revalidatePath(`/torneios/${challenge.tournamentId}`);
}

export async function completeLadderMatch(matchId: string) {
  const challenge = await prisma.ladderChallenge.findUnique({ where: { matchId } });
  if (!challenge) return;
  if (challenge.status !== "ACCEPTED") return;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { teamA: true, teamB: true },
  });

  if (!match || match.resultType === "UNDECIDED") return;

  const challengerWon = match.winnerTeamId === match.teamAId;

  if (challengerWon) {
    const challengerPos = await prisma.ladderPosition.findUnique({
      where: { tournamentId_playerId: { tournamentId: challenge.tournamentId, playerId: challenge.challengerId } },
    });
    const defenderPos = await prisma.ladderPosition.findUnique({
      where: { tournamentId_playerId: { tournamentId: challenge.tournamentId, playerId: challenge.defenderId } },
    });

    if (challengerPos && defenderPos) {
      const tempPos = -1;
      await prisma.ladderPosition.update({ where: { id: challengerPos.id }, data: { position: tempPos } });
      await prisma.ladderPosition.update({ where: { id: defenderPos.id }, data: { position: challengerPos.position } });
      await prisma.ladderPosition.update({ where: { id: challengerPos.id }, data: { position: defenderPos.position } });
    }
  }

  await prisma.ladderChallenge.update({ where: { id: challenge.id }, data: { status: "COMPLETED" } });
  revalidatePath(`/torneios/${challenge.tournamentId}`);
}

// ══════════════════════════════════════════════════════════════════════
// Feature C1: Tournament Photo Gallery
// ══════════════════════════════════════════════════════════════════════

export async function uploadTournamentPhoto(
  tournamentId: string,
  imageData: string,
  thumbnailData: string,
  caption?: string
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado.");

  // Validate base64 data sizes (imageData max ~2MB, thumbnail max ~200KB)
  if (imageData.length > 2 * 1024 * 1024) {
    throw new Error("A imagem é demasiado grande. Máximo 2MB.");
  }
  if (thumbnailData.length > 200 * 1024) {
    throw new Error("A miniatura é demasiado grande. Máximo 200KB.");
  }

  // Verify tournament exists
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, leagueId: true },
  });
  if (!tournament) throw new Error("Torneio não encontrado.");

  // Check permissions: must be league manager or admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMINISTRADOR") {
    if (tournament.leagueId) {
      const isManager = await prisma.leagueManager.findFirst({
        where: { userId: session.user.id, leagueId: tournament.leagueId },
      });
      if (!isManager) throw new Error("Sem permissão para adicionar fotos.");
    } else {
      throw new Error("Sem permissão para adicionar fotos.");
    }
  }

  const photo = await prisma.tournamentPhoto.create({
    data: {
      tournamentId,
      imageData,
      thumbnailData,
      caption: caption?.trim() || null,
      uploadedById: session.user.id,
    },
  });

  revalidatePath(`/torneios/${tournamentId}`);
  return { id: photo.id };
}

export async function getTournamentPhotos(tournamentId: string) {
  const photos = await prisma.tournamentPhoto.findMany({
    where: { tournamentId },
    select: {
      id: true,
      thumbnailData: true,
      caption: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return photos.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
  }));
}

export async function getTournamentPhoto(photoId: string) {
  const photo = await prisma.tournamentPhoto.findUnique({
    where: { id: photoId },
    select: { id: true, imageData: true, caption: true },
  });
  if (!photo) throw new Error("Foto não encontrada.");
  return photo;
}

export async function deleteTournamentPhoto(photoId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado.");

  const photo = await prisma.tournamentPhoto.findUnique({
    where: { id: photoId },
    include: { tournament: { select: { leagueId: true } } },
  });
  if (!photo) throw new Error("Foto não encontrada.");

  // Check permissions: uploader, league manager, or admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const isUploader = photo.uploadedById === session.user.id;
  const isAdmin = user?.role === "ADMINISTRADOR";
  let isManager = false;
  if (photo.tournament.leagueId) {
    const mgr = await prisma.leagueManager.findFirst({
      where: { userId: session.user.id, leagueId: photo.tournament.leagueId },
    });
    isManager = !!mgr;
  }
  if (!isUploader && !isAdmin && !isManager) {
    throw new Error("Sem permissão para apagar esta foto.");
  }

  await prisma.tournamentPhoto.delete({ where: { id: photoId } });
  revalidatePath(`/torneios/${photo.tournamentId}`);
  return { success: true };
}

export async function getLadderStatus(tournamentId: string) {
  const [positions, challenges] = await Promise.all([
    getLadderPositions(tournamentId),
    prisma.ladderChallenge.findMany({
      where: { tournamentId },
      include: { challenger: true, defender: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    positions,
    challenges: challenges.map(c => ({
      id: c.id,
      challengerName: c.challenger.nickname || c.challenger.fullName,
      defenderName: c.defender.nickname || c.defender.fullName,
      status: c.status,
      matchId: c.matchId || undefined,
      createdAt: c.createdAt.toISOString(),
    })),
  };
}

// ── C6: Drag-and-Drop Schedule Reordering ──

export async function reorderMatches(
  tournamentId: string,
  updates: { matchId: string; courtId: string | null; slotIndex: number }[]
) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new Error("Torneio não encontrado");
  await requireLeagueManager(tournament.leagueId ?? "");

  // Batch update all matches
  for (const update of updates) {
    await prisma.match.update({
      where: { id: update.matchId },
      data: { courtId: update.courtId, slotIndex: update.slotIndex },
    });
  }

  revalidatePath(`/torneios/${tournamentId}`);
}

// ── C4: Tournament Chat ──

export async function sendChatMessage(tournamentId: string, message: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Autenticação necessária.");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { playerId: true, player: { select: { fullName: true, nickname: true } } },
  });
  if (!user?.playerId) throw new Error("Jogador não encontrado.");

  const trimmed = message.trim();
  if (!trimmed) throw new Error("Mensagem não pode estar vazia.");
  if (trimmed.length > 500) throw new Error("Mensagem demasiado longa (máx. 500 caracteres).");

  const msg = await prisma.chatMessage.create({
    data: {
      tournamentId,
      playerId: user.playerId,
      message: trimmed,
    },
  });

  return {
    id: msg.id,
    playerId: user.playerId,
    playerName: user.player!.nickname || user.player!.fullName,
    message: msg.message,
    createdAt: msg.createdAt.toISOString(),
  };
}

export async function getChatMessages(tournamentId: string, limit?: number, before?: string) {
  const take = limit || 50;

  const where: any = { tournamentId };
  if (before) {
    const cursor = await prisma.chatMessage.findUnique({ where: { id: before }, select: { createdAt: true } });
    if (cursor) {
      where.createdAt = { lt: cursor.createdAt };
    }
  }

  const messages = await prisma.chatMessage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    include: {
      player: { select: { fullName: true, nickname: true } },
    },
  });

  return messages.map((m) => ({
    id: m.id,
    playerId: m.playerId,
    playerName: m.player.nickname || m.player.fullName,
    message: m.message,
    createdAt: m.createdAt.toISOString(),
  }));
}

export async function deleteChatMessage(messageId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Autenticação necessária.");

  const msg = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    include: { tournament: { select: { leagueId: true } } },
  });
  if (!msg) throw new Error("Mensagem não encontrada.");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { playerId: true, role: true },
  });

  const isAuthor = user?.playerId === msg.playerId;
  let isManager = false;
  if (!isAuthor && msg.tournament.leagueId) {
    const mgr = await prisma.leagueManager.findFirst({
      where: { userId: session.user.id, leagueId: msg.tournament.leagueId },
    });
    isManager = !!mgr;
  }
  if (!isAuthor && !isManager && user?.role !== "ADMINISTRADOR") {
    throw new Error("Sem permissão para apagar esta mensagem.");
  }

  await prisma.chatMessage.delete({ where: { id: messageId } });
}
