import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import type { UserRole } from "../../generated/prisma/enums";

declare module "next-auth" {
  interface User {
    role: UserRole;
    playerId: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    playerId: string | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
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
      } else {
        // Re-fetch role from DB on every request (ensures admin changes propagate)
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true, playerId: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.playerId = dbUser.playerId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      (session.user as { role: UserRole }).role = token.role;
      (session.user as { playerId: string | null }).playerId = token.playerId;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
