"use server";

import { prisma } from "../db";
import { requireAuth, requireLeagueManager } from "../auth-guards";
import { getStripe } from "../stripe";
import { revalidatePath } from "next/cache";

// ── Types ──

export type PaymentStatus = "PENDING" | "PAID" | "REFUNDED" | "MANUAL";

export type TournamentPaymentInfo = {
  id: string;
  tournamentId: string;
  playerId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paidAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  player: {
    id: string;
    name: string;
    nickname: string | null;
  };
};

export type LeagueFinancialSummary = {
  totalReceived: number;
  totalPending: number;
  totalRefunded: number;
  totalManual: number;
  currency: string;
  tournaments: {
    id: string;
    name: string;
    received: number;
    pending: number;
    refunded: number;
    manual: number;
    paymentCount: number;
  }[];
};

// ── 1. Create Inscription Payment (Stripe Checkout) ──

export async function createInscriptionPayment(
  tournamentId: string,
  playerId: string
): Promise<string> {
  await requireAuth();
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  // Lookup tournament and its fee
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      name: true,
      inscriptionFee: true,
      requiresPayment: true,
      leagueId: true,
    },
  });

  if (!tournament) {
    throw new Error("Torneio não encontrado.");
  }

  if (!tournament.requiresPayment || !tournament.inscriptionFee) {
    throw new Error("Este torneio não requer pagamento de inscrição.");
  }

  // Check player exists
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, fullName: true, nickname: true },
  });

  if (!player) {
    throw new Error("Jogador não encontrado.");
  }

  // Check for existing payment
  const existing = await prisma.tournamentPayment.findUnique({
    where: { tournamentId_playerId: { tournamentId, playerId } },
  });

  if (existing && (existing.status === "PAID" || existing.status === "MANUAL")) {
    throw new Error("Pagamento já efetuado para este torneio.");
  }

  // Create Stripe Checkout session
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `Inscrição: ${tournament.name}`,
            description: `Pagamento de inscrição no torneio ${tournament.name}`,
          },
          unit_amount: Math.round(tournament.inscriptionFee * 100), // cents
        },
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/torneios/${tournamentId}?payment=success`,
    cancel_url: `${appUrl}/torneios/${tournamentId}?payment=cancelled`,
    metadata: {
      tournamentId,
      playerId,
    },
    customer_email: undefined,
  });

  // Create or update TournamentPayment record
  if (existing) {
    await prisma.tournamentPayment.update({
      where: { id: existing.id },
      data: {
        status: "PENDING",
        stripeSessionId: session.id,
        amount: tournament.inscriptionFee,
      },
    });
  } else {
    await prisma.tournamentPayment.create({
      data: {
        tournamentId,
        playerId,
        amount: tournament.inscriptionFee,
        currency: "EUR",
        status: "PENDING",
        stripeSessionId: session.id,
      },
    });
  }

  revalidatePath(`/torneios/${tournamentId}`);

  return session.url!;
}

// ── 2. Mark Payment as Manual (cash/transfer) ──

export async function markPaymentManual(
  tournamentId: string,
  playerId: string
): Promise<void> {
  // Verify league manager permission
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { leagueId: true, inscriptionFee: true },
  });

  if (!tournament) {
    throw new Error("Torneio não encontrado.");
  }

  if (!tournament.leagueId) {
    throw new Error("Torneio não associado a uma liga.");
  }

  await requireLeagueManager(tournament.leagueId);

  // Upsert the payment record
  await prisma.tournamentPayment.upsert({
    where: { tournamentId_playerId: { tournamentId, playerId } },
    create: {
      tournamentId,
      playerId,
      amount: tournament.inscriptionFee ?? 0,
      currency: "EUR",
      status: "MANUAL",
      paidAt: new Date(),
    },
    update: {
      status: "MANUAL",
      paidAt: new Date(),
    },
  });

  revalidatePath(`/torneios/${tournamentId}`);
}

// ── 3. Get Payment Status ──

export async function getPaymentStatus(
  tournamentId: string,
  playerId: string
): Promise<{ status: PaymentStatus | null; paidAt: string | null }> {
  const payment = await prisma.tournamentPayment.findUnique({
    where: { tournamentId_playerId: { tournamentId, playerId } },
    select: { status: true, paidAt: true },
  });

  if (!payment) {
    return { status: null, paidAt: null };
  }

  return {
    status: payment.status as PaymentStatus,
    paidAt: payment.paidAt?.toISOString() ?? null,
  };
}

// ── 4. Get All Tournament Payments ──

export async function getTournamentPayments(
  tournamentId: string
): Promise<TournamentPaymentInfo[]> {
  const payments = await prisma.tournamentPayment.findMany({
    where: { tournamentId },
    include: {
      player: {
        select: { id: true, fullName: true, nickname: true },
      },
    },
    orderBy: [
      { status: "asc" }, // MANUAL, PAID, PENDING, REFUNDED — PENDING sorts first alphabetically
      { createdAt: "desc" },
    ],
  });

  // Custom sort: PENDING first, then MANUAL, PAID, REFUNDED
  const statusOrder: Record<string, number> = {
    PENDING: 0,
    MANUAL: 1,
    PAID: 2,
    REFUNDED: 3,
  };

  const sorted = payments.sort(
    (a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99)
  );

  return sorted.map((p) => ({
    id: p.id,
    tournamentId: p.tournamentId,
    playerId: p.playerId,
    amount: p.amount,
    currency: p.currency,
    status: p.status as PaymentStatus,
    paidAt: p.paidAt?.toISOString() ?? null,
    refundedAt: p.refundedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    player: {
      id: p.player.id,
      name: p.player.fullName,
      nickname: p.player.nickname,
    },
  }));
}

// ── 5. Refund Payment ──

export async function refundPayment(
  tournamentId: string,
  playerId: string
): Promise<void> {
  // Verify league manager permission
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { leagueId: true },
  });

  if (!tournament) {
    throw new Error("Torneio não encontrado.");
  }

  if (!tournament.leagueId) {
    throw new Error("Torneio não associado a uma liga.");
  }

  await requireLeagueManager(tournament.leagueId);

  const payment = await prisma.tournamentPayment.findUnique({
    where: { tournamentId_playerId: { tournamentId, playerId } },
  });

  if (!payment) {
    throw new Error("Pagamento não encontrado.");
  }

  if (payment.status === "REFUNDED") {
    throw new Error("Pagamento já foi reembolsado.");
  }

  // Refund via Stripe if it was a Stripe payment
  if (payment.stripePaymentId && payment.status === "PAID") {
    const stripe = getStripe();
    await stripe.refunds.create({
      payment_intent: payment.stripePaymentId,
    });
  }

  await prisma.tournamentPayment.update({
    where: { id: payment.id },
    data: {
      status: "REFUNDED",
      refundedAt: new Date(),
    },
  });

  revalidatePath(`/torneios/${tournamentId}`);
}

// ── 6. Handle Payment Webhook (Stripe Checkout completed) ──

export async function handlePaymentWebhook(sessionId: string): Promise<void> {
  const payment = await prisma.tournamentPayment.findFirst({
    where: { stripeSessionId: sessionId },
  });

  if (!payment) {
    throw new Error(`Pagamento não encontrado para sessão: ${sessionId}`);
  }

  if (payment.status === "PAID") {
    // Already processed — idempotent
    return;
  }

  // Retrieve session from Stripe to get payment intent ID
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  await prisma.tournamentPayment.update({
    where: { id: payment.id },
    data: {
      status: "PAID",
      paidAt: new Date(),
      stripePaymentId: paymentIntentId,
    },
  });

  revalidatePath(`/torneios/${payment.tournamentId}`);
}

// ── 7. Get League Financials ──

export async function getLeagueFinancials(
  leagueId: string,
  seasonId?: string
): Promise<LeagueFinancialSummary> {
  await requireLeagueManager(leagueId);

  // Build tournament filter
  const tournamentWhere: Record<string, unknown> = { leagueId };
  if (seasonId) {
    tournamentWhere.seasonId = seasonId;
  }

  // Fetch tournaments with their payments
  const tournaments = await prisma.tournament.findMany({
    where: tournamentWhere,
    select: {
      id: true,
      name: true,
      payments: {
        select: {
          amount: true,
          status: true,
          currency: true,
        },
      },
    },
    orderBy: { startDate: "desc" },
  });

  let totalReceived = 0;
  let totalPending = 0;
  let totalRefunded = 0;
  let totalManual = 0;

  const tournamentBreakdown = tournaments
    .filter((t) => t.payments.length > 0)
    .map((t) => {
      let received = 0;
      let pending = 0;
      let refunded = 0;
      let manual = 0;

      for (const p of t.payments) {
        switch (p.status) {
          case "PAID":
            received += p.amount;
            break;
          case "PENDING":
            pending += p.amount;
            break;
          case "REFUNDED":
            refunded += p.amount;
            break;
          case "MANUAL":
            manual += p.amount;
            break;
        }
      }

      totalReceived += received;
      totalPending += pending;
      totalRefunded += refunded;
      totalManual += manual;

      return {
        id: t.id,
        name: t.name,
        received,
        pending,
        refunded,
        manual,
        paymentCount: t.payments.length,
      };
    });

  // Determine currency (default EUR)
  const firstCurrency = tournaments
    .flatMap((t) => t.payments)
    .find((p) => p.currency)?.currency ?? "EUR";

  return {
    totalReceived,
    totalPending,
    totalRefunded,
    totalManual,
    currency: firstCurrency,
    tournaments: tournamentBreakdown,
  };
}
