import { auth } from "./auth";
import { prisma } from "./db";
import type { UserRole } from "../../generated/prisma/enums";

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  playerId: string | null;
}

export async function requireAuth(): Promise<AuthUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Não autenticado. Faça login para continuar.");
  }
  return session.user as AuthUser;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth();
  if (user.role !== "ADMINISTRADOR") {
    throw new Error("Sem permissão. Apenas administradores.");
  }
  return user;
}

export async function requireLeagueManager(leagueId: string): Promise<AuthUser> {
  const user = await requireAuth();
  if (user.role === "ADMINISTRADOR") return user;

  const manager = await prisma.leagueManager.findUnique({
    where: { userId_leagueId: { userId: user.id, leagueId } },
  });

  if (!manager) {
    throw new Error("Não é gestor desta liga.");
  }
  return user;
}

export async function isLeagueManager(leagueId: string): Promise<boolean> {
  try {
    const session = await auth();
    if (!session?.user?.id) return false;
    const user = session.user as AuthUser;
    if (user.role === "ADMINISTRADOR") return true;

    const manager = await prisma.leagueManager.findUnique({
      where: { userId_leagueId: { userId: user.id, leagueId } },
    });
    return !!manager;
  } catch {
    return false;
  }
}

export async function requireLeagueMember(leagueId: string): Promise<AuthUser> {
  const user = await requireAuth();
  if (user.role === "ADMINISTRADOR") return user;

  const manager = await prisma.leagueManager.findUnique({
    where: { userId_leagueId: { userId: user.id, leagueId } },
  });
  if (manager) return user;

  const membership = await prisma.leagueMembership.findUnique({
    where: { userId_leagueId: { userId: user.id, leagueId } },
  });
  if (!membership || membership.status !== "APPROVED") {
    throw new Error("Não é membro desta liga.");
  }
  return user;
}
