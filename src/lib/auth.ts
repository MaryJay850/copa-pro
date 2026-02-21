import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import type { UserRole } from "../../generated/prisma/enums";

declare module "next-auth" {
  interface User {
    role: UserRole;
    playerId: string | null;
    playerName: string | null;
    phone: string;
    mustChangePassword: boolean;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    playerId: string | null;
    playerName: string | null;
    phone: string;
    mustChangePassword: boolean;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { player: { select: { fullName: true } } },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          playerId: user.playerId,
          playerName: user.player?.fullName ?? null,
          phone: user.phone,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = (user as { role: UserRole }).role;
        token.playerId = (user as { playerId: string | null }).playerId;
        token.playerName = (user as { playerName: string | null }).playerName;
        token.phone = (user as { phone: string }).phone;
        token.mustChangePassword = (user as { mustChangePassword: boolean }).mustChangePassword;
      } else {
        // Re-fetch from DB (ensures admin changes and profile updates propagate)
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: {
            role: true,
            playerId: true,
            phone: true,
            mustChangePassword: true,
            player: { select: { fullName: true } },
          },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.playerId = dbUser.playerId;
          token.playerName = dbUser.player?.fullName ?? null;
          token.phone = dbUser.phone;
          token.mustChangePassword = dbUser.mustChangePassword;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      (session.user as any).role = token.role;
      (session.user as any).playerId = token.playerId;
      (session.user as any).playerName = token.playerName;
      (session.user as any).phone = token.phone;
      (session.user as any).mustChangePassword = token.mustChangePassword;
      return session;
    },
  },
});
