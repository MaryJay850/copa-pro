"use server";

import { prisma } from "../db";
import { requireLeagueManager } from "../auth-guards";
import { auth } from "../auth";
import { revalidatePath } from "next/cache";

/**
 * Calculate position points for Sobe e Desce scoring.
 * 1st = 10, 2nd = 8, 3rd = 7, 4th = 6, 5th = 5... down to 0 minimum.
 * All positions get +5 participation bonus.
 */
function calculatePositionPoints(position: number): { positionPts: number; bonusPts: number; totalPts: number } {
  const bonusPts = 5;
  let positionPts: number;

  if (position === 1) {
    positionPts = 10;
  } else if (position === 2) {
    positionPts = 8;
  } else {
    // 3rd = 7, 4th = 6, 5th = 5, 6th = 4... down to 0
    positionPts = Math.max(0, 10 - position);
  }

  return { positionPts, bonusPts, totalPts: positionPts + bonusPts };
}

/**
 * Save final results for a Sobe e Desce tournament.
 * Each entry is a position with a pair of players.
 */
export async function saveFinalResults(
  tournamentId: string,
  results: { position: number; player1Id: string; player2Id: string | null }[]
) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, leagueId: true, seasonId: true, teamMode: true, status: true },
  });

  if (!tournament) throw new Error("Torneio não encontrado.");

  // Auth: league manager or creator
  if (tournament.leagueId) {
    await requireLeagueManager(tournament.leagueId);
  } else {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Autenticação necessária.");
  }

  if (results.length === 0) throw new Error("É necessário pelo menos um resultado.");

  // Validate no duplicate positions
  const positions = results.map((r) => r.position);
  if (new Set(positions).size !== positions.length) {
    throw new Error("Posições duplicadas não são permitidas.");
  }

  // Delete existing results and insert new ones
  await prisma.$transaction(async (tx) => {
    await tx.tournamentFinalResult.deleteMany({ where: { tournamentId } });

    for (const result of results) {
      const { positionPts, bonusPts, totalPts } = calculatePositionPoints(result.position);

      await tx.tournamentFinalResult.create({
        data: {
          tournamentId,
          position: result.position,
          player1Id: result.player1Id,
          player2Id: result.player2Id || null,
          positionPts,
          bonusPts,
          totalPts,
        },
      });
    }
  });

  // If tournament is in a season, recompute season ranking
  if (tournament.seasonId) {
    const { recomputeSeasonRanking } = await import("../actions");
    await recomputeSeasonRanking(tournament.seasonId);
  }

  revalidatePath(`/torneios/${tournamentId}`);

  return { success: true };
}

/**
 * Get final results for a tournament.
 */
export async function getFinalResults(tournamentId: string) {
  const results = await prisma.tournamentFinalResult.findMany({
    where: { tournamentId },
    include: {
      player1: { select: { id: true, fullName: true, nickname: true } },
      player2: { select: { id: true, fullName: true, nickname: true } },
    },
    orderBy: { position: "asc" },
  });

  return results;
}

/**
 * Check if a tournament has final results.
 */
export async function hasFinalResults(tournamentId: string): Promise<boolean> {
  const count = await prisma.tournamentFinalResult.count({ where: { tournamentId } });
  return count > 0;
}
