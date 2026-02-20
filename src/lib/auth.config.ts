import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible auth config (no Node.js modules like bcrypt or prisma).
 * Used by middleware.ts for JWT-based route protection.
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" as const, maxAge: 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.playerId = user.playerId;
      }
      return token;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.playerId = token.playerId;
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      // Public routes
      const publicPaths = ["/", "/login", "/registar", "/api/auth"];
      const isPublic = publicPaths.some(
        (p) => pathname === p || pathname.startsWith(p + "/")
      );
      if (isPublic) return true;

      // Protected routes require auth
      if (!isLoggedIn) return false; // redirects to signIn page

      // Admin-only routes
      if (pathname.startsWith("/admin")) {
        const role = (auth?.user as { role?: string })?.role;
        if (role !== "ADMINISTRADOR") {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
      }

      return true;
    },
  },
  providers: [], // Providers added in auth.ts (Node runtime only)
};
