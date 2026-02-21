"use server";

import { prisma } from "./db";
import { generateRoundRobinPairings, generateRandomTeams, type TeamRef } from "./scheduling";
import { computeMatchContribution, validateMatchScores, determineResult } from "./ranking";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { requireAuth, requireAdmin, requireLeagueManager } from "./auth-guards";
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
  const name = formData.get("name") as string;
  const location = (formData.get("location") as string) || null;

  if (!name?.trim()) throw new Error("Nome da liga é obrigatório.");

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
  const result = await prisma.league.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { seasons: true } } },
  });
  return serialize(result);
}

export async function getLeague(id: string) {
  const result = await prisma.league.findUnique({
    where: { id },
    include: {
      seasons: { orderBy: { createdAt: "desc" } },
    },
  });
  return serialize(result);
}

export async function deleteLeague(id: string) {
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
    // ── Sync existing group — add missing members ──
    const allPhones = [...new Set([...memberPhones, ...adminPhones])];
    if (allPhones.length > 0) {
      await addParticipants(league.whatsappGroupId, allPhones);
    }
    // Re-promote admins (idempotent)
    if (adminPhones.length > 0) {
      await promoteParticipants(league.whatsappGroupId, adminPhones);
    }
    // Update group profile picture (idempotent)
    await updateGroupPicture(league.whatsappGroupId);

    revalidatePath(`/ligas/${leagueId}`);
    return { created: false, groupJid: league.whatsappGroupId, membersAdded: allPhones.length };
  }
}

// ── Season actions ──

export async function createSeason(formData: FormData) {
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
  matchesPerPair: number;
  numberOfSets: number;
  teamSize?: number;
  teamMode: string;
  randomSeed?: string;
  teams: { name: string; player1Id: string; player2Id: string | null }[];
  allPlayerIds?: string[];
}) {
  await requireLeagueManager(data.leagueId);

  const teamSize = data.teamSize ?? 2;
  const maxTitulars = data.courtsCount * 2 * teamSize;

  const tournament = await prisma.tournament.create({
    data: {
      leagueId: data.leagueId,
      seasonId: data.seasonId,
      name: data.name,
      startDate: data.startDate ? new Date(data.startDate + "T00:00:00") : null,
      courtsCount: data.courtsCount,
      matchesPerPair: data.matchesPerPair,
      numberOfSets: data.numberOfSets,
      teamSize,
      teamMode: data.teamMode,
      randomSeed: data.randomSeed || null,
      status: "DRAFT",
    },
  });

  // Create courts with custom names
  for (let i = 0; i < data.courtsCount; i++) {
    await prisma.court.create({
      data: {
        tournamentId: tournament.id,
        name: data.courtNames?.[i] || `Campo ${i + 1}`,
      },
    });
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

  // ── WhatsApp: anunciar torneio no grupo da liga (fire-and-forget) ──
  (async () => {
    try {
      const league = await prisma.league.findUnique({
        where: { id: data.leagueId },
        select: { whatsappGroupId: true },
      });
      if (league?.whatsappGroupId) {
        const appUrl = process.env.APP_URL || "https://copapro.bitclever.pt";
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
    include: { teams: true, courts: true, rounds: true, matches: true },
  });

  if (!tournament) throw new Error("Torneio não encontrado.");
  await requireLeagueManager(tournament.leagueId);

  // Check if results exist
  const hasResults = tournament.matches.some((m) => m.status === "FINISHED");
  if (hasResults) {
    throw new Error("CONFIRM_REGENERATE");
  }

  // Delete existing schedule
  await prisma.match.deleteMany({ where: { tournamentId } });
  await prisma.round.deleteMany({ where: { tournamentId } });

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

  // Get court ids
  const courts = tournament.courts;

  // Create rounds and matches
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

  // Update status
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "PUBLISHED" },
  });

  // ── WhatsApp: divulgar calendário no grupo (fire-and-forget) ──
  (async () => {
    try {
      const league = await prisma.league.findUnique({
        where: { id: tournament.leagueId },
        select: { whatsappGroupId: true },
      });
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
  return { roundCount: roundMap.size, matchCount: pairings.length };
}

export async function forceRegenerateSchedule(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { teams: true, courts: true },
  });

  if (!tournament) throw new Error("Torneio não encontrado.");
  await requireLeagueManager(tournament.leagueId);

  // Delete all results first
  await prisma.match.deleteMany({ where: { tournamentId } });
  await prisma.round.deleteMany({ where: { tournamentId } });

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

  const courts = tournament.courts;
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

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "PUBLISHED" },
  });

  // Recompute season rankings since results were deleted
  await recomputeSeasonRanking(tournament.seasonId);

  revalidatePath(`/torneios/${tournamentId}`);
  return { roundCount: roundMap.size, matchCount: pairings.length };
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
    await requireLeagueManager(match.tournament.leagueId);

    const allowDraws = match.tournament.season.allowDraws;
    const numberOfSets = match.tournament.numberOfSets;

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
    await recomputeSeasonRanking(match.tournament.seasonId);

    revalidatePath(`/torneios/${match.tournamentId}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message || "Erro ao guardar resultado." };
  }
}

export async function resetMatch(matchId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { tournament: true },
    });

    if (!match) return { success: false, error: "Jogo não encontrado." };
    await requireLeagueManager(match.tournament.leagueId);

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
    await recomputeSeasonRanking(match.tournament.seasonId);

    revalidatePath(`/torneios/${match.tournamentId}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message || "Erro ao repor jogo." };
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

// ── Desistência / Substituição automática ──

export async function desistPlayer(tournamentId: string, playerId: string) {
  // 1. Validate permissions
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { teams: true },
  });
  if (!tournament) throw new Error("Torneio não encontrado.");
  await requireLeagueManager(tournament.leagueId);

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
        const league = await prisma.league.findUnique({ where: { id: tournament.leagueId } });
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

  // Compute all deltas
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
      },
      season.allowDraws
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

  // Delete old rankings and insert new ones (transactional)
  await prisma.$transaction(async (tx) => {
    await tx.seasonRankingEntry.deleteMany({ where: { seasonId } });

    for (const [playerId, data] of playerMap.entries()) {
      await tx.seasonRankingEntry.create({
        data: {
          seasonId,
          playerId,
          ...data,
          setsDiff: data.setsWon - data.setsLost,
        },
      });
    }
  });
}

// ── Tournament finalize ──

export async function finishTournament(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { matches: true },
  });

  if (!tournament) throw new Error("Torneio não encontrado.");
  await requireLeagueManager(tournament.leagueId);

  const allFinished = tournament.matches.every((m) => m.status === "FINISHED");
  if (!allFinished) {
    throw new Error("Existem jogos por completar. Finalize todos os jogos antes de encerrar o torneio.");
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "FINISHED" },
  });

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

      const appUrl = process.env.APP_URL || "https://copapro.bitclever.pt";
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
              leagueName: fullTournament.league.name,
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

        await sendGroupMessage(t.league.whatsappGroupId, tournamentFinishedMessage(t.name, rankings));

        // Season ranking
        const seasonRanking = await prisma.seasonRankingEntry.findMany({
          where: { seasonId: t.season.id },
          orderBy: { pointsTotal: "desc" },
          include: { player: { select: { fullName: true } } },
        });
        const seasonRankings = seasonRanking.map((r, i) => ({
          position: i + 1,
          playerName: r.player.fullName,
          points: r.pointsTotal,
          matchesPlayed: r.matchesPlayed,
        }));
        await sendGroupMessage(t.league.whatsappGroupId, seasonRankingMessage(t.season.name, seasonRankings));
      }
    } catch (err) {
      console.error("[WHATSAPP] Erro ao enviar ranking final:", err);
    }
  })();

  revalidatePath(`/torneios/${tournamentId}`);
}

// ── Delete tournament ──

export async function deleteTournament(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { seasonId: true, leagueId: true },
  });

  if (!tournament) throw new Error("Torneio não encontrado.");
  await requireLeagueManager(tournament.leagueId);

  // Cascade delete handles all child records (teams, courts, rounds, matches)
  await prisma.tournament.delete({ where: { id: tournamentId } });

  // Recompute season rankings since match data was removed
  await recomputeSeasonRanking(tournament.seasonId);

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
  await requireLeagueManager(tournament.leagueId);

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
  teams: { name: string; player1Id: string; player2Id: string | null }[];
  allPlayerIds?: string[];
}) {
  const existing = await prisma.tournament.findUnique({
    where: { id: data.tournamentId },
    include: { matches: { select: { status: true } } },
  });

  if (!existing) throw new Error("Torneio não encontrado.");
  await requireLeagueManager(existing.leagueId);

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
          isRandomGenerated: data.teamMode === "RANDOM_TEAMS",
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
        const league = await prisma.league.findUnique({
          where: { id: existing.leagueId },
          select: { whatsappGroupId: true },
        });
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
      const appUrl = process.env.APP_URL || "https://copapro.bitclever.pt";
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

  await prisma.$transaction(async (tx) => {
    const player = await tx.player.create({
      data: { fullName: data.fullName, nickname: data.nickname || null },
    });
    await tx.user.create({
      data: {
        email: data.email,
        phone: data.phone || "",
        hashedPassword,
        role: data.role,
        playerId: player.id,
      },
    });
  });

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
