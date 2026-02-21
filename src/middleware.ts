import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Simple JWT-based middleware that checks for the session cookie.
 * Does NOT import prisma, bcrypt or any Node.js-only modules.
 * Uses cookie-based detection instead of NextAuth Edge wrapper
 * to avoid the crypto module issue entirely.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — always accessible
  const publicPaths = ["/", "/login", "/registar", "/api/auth", "/recuperar-password", "/alterar-password", "/convite"];
  const isPublic = publicPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (isPublic) return NextResponse.next();

  // Check for NextAuth session cookie
  const sessionCookie =
    request.cookies.get("__Secure-authjs.session-token") ??
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("next-auth.session-token") ??
    request.cookies.get("__Secure-next-auth.session-token");

  if (!sessionCookie?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Note: admin role check is done at the page/layout level (server-side)
  // since we can't decode JWT in Edge without crypto
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
