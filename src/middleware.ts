import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "";
const BUILD_COOKIE = "x-build-id";

/**
 * Middleware with:
 * 1. JWT-based auth check (cookie detection)
 * 2. Build-version check — forces browser cache clear after deploy
 *
 * How it works:
 * - Each build generates a unique NEXT_PUBLIC_BUILD_ID (via next.config.ts)
 * - The middleware sets a cookie "x-build-id" on every response
 * - When a request arrives with an OLD build ID cookie, we know
 *   the user has a stale cached page → redirect with cache-bust + Clear-Site-Data header
 * - This eliminates "Failed to find Server Action" errors after deploy
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Skip internal / static routes ──
  const isApi = pathname.startsWith("/api/");
  const isNextInternal = pathname.startsWith("/_next/");

  // ── Public routes — always accessible (no auth required) ──
  const publicPaths = ["/", "/login", "/registar", "/api/auth", "/recuperar-password", "/alterar-password", "/convite", "/api/stripe/webhook", "/api/stripe/debug-prices"];
  const isPublic = publicPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  // ── Build version check ──
  const clientBuildId = request.cookies.get(BUILD_COOKIE)?.value;
  const isStale = BUILD_ID && clientBuildId && clientBuildId !== BUILD_ID;

  // For page navigations (not API, not static), if build is stale → force refresh
  if (isStale && !isApi && !isNextInternal) {
    // Only redirect once — check if we already have the _v param
    if (request.nextUrl.searchParams.get("_v") !== BUILD_ID) {
      const url = request.nextUrl.clone();
      url.searchParams.set("_v", BUILD_ID);
      const response = NextResponse.redirect(url);
      response.cookies.set(BUILD_COOKIE, BUILD_ID, {
        path: "/",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
      });
      // Ask browser to clear its cache
      response.headers.set("Clear-Site-Data", '"cache"');
      return response;
    }
  }

  // ── Auth check (protected routes) ──
  let response: NextResponse;

  if (isPublic) {
    response = NextResponse.next();
  } else {
    const sessionCookie =
      request.cookies.get("__Secure-authjs.session-token") ??
      request.cookies.get("authjs.session-token") ??
      request.cookies.get("next-auth.session-token") ??
      request.cookies.get("__Secure-next-auth.session-token");

    if (!sessionCookie?.value) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      response = NextResponse.redirect(loginUrl);
    } else {
      response = NextResponse.next();
    }
  }

  // ── Always stamp the build cookie on every response ──
  if (BUILD_ID && !isNextInternal) {
    response.cookies.set(BUILD_COOKIE, BUILD_ID, {
      path: "/",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  // ── Prevent aggressive browser caching of HTML pages ──
  if (!isApi && !isNextInternal) {
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
