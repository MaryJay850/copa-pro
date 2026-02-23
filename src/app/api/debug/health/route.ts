import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * DEBUG: Health check — verifies DB connection and basic queries.
 * GET /api/debug/health
 * Remove after debugging.
 */
export async function GET() {
  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? "unknown",
  };

  // 1. DB connection
  try {
    const userCount = await prisma.user.count();
    checks.db = { ok: true, users: userCount };
  } catch (err) {
    checks.db = { ok: false, error: String(err) };
  }

  // 2. plan_prices table
  try {
    const priceCount = await prisma.planPrice.count();
    checks.planPrices = { ok: true, count: priceCount };
  } catch (err) {
    checks.planPrices = { ok: false, error: String(err) };
  }

  // 3. Seasons + rankings query (what the novo page does)
  try {
    const seasonCount = await prisma.season.count();
    checks.seasons = { ok: true, count: seasonCount };
  } catch (err) {
    checks.seasons = { ok: false, error: String(err) };
  }

  // 4. League memberships query
  try {
    const memberCount = await prisma.leagueMembership.count();
    checks.memberships = { ok: true, count: memberCount };
  } catch (err) {
    checks.memberships = { ok: false, error: String(err) };
  }

  const allOk = Object.values(checks).every(
    (v) => typeof v !== "object" || (v as any)?.ok !== false
  );

  return NextResponse.json(checks, { status: allOk ? 200 : 500 });
}
