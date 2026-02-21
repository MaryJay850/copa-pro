/**
 * Sanitiza mensagens de erro para mostrar ao utilizador.
 * Esconde detalhes técnicos (Prisma, DB, conexão) e mostra mensagens amigáveis.
 */
export function sanitizeError(err: unknown, fallback?: string): string {
  const message = err instanceof Error ? err.message : String(err || "");

  if (!message) return fallback || "Ocorreu um erro inesperado. Tente novamente.";

  // ── Plan guard errors: extract human-readable part ──
  if (message.startsWith("PLAN_UPGRADE_REQUIRED:")) {
    const parts = message.split(":");
    return parts[2] || "Esta funcionalidade requer um plano superior. Faça upgrade para continuar.";
  }
  if (message.startsWith("PLAN_LIMIT_REACHED:")) {
    const parts = message.split(":");
    return parts[2] || "Atingiu o limite do seu plano. Faça upgrade para continuar.";
  }

  // ── Prisma / Database errors ──
  if (
    message.includes("Unique constraint") ||
    message.includes("prisma") ||
    message.includes("PrismaClient") ||
    /\bP[0-9]{4}\b/.test(message) ||
    message.includes("Invalid `prisma")
  ) {
    // Specific: email duplicate
    if (message.includes("email")) {
      return "Este email já está registado.";
    }
    return fallback || "Ocorreu um erro ao processar o pedido. Tente novamente.";
  }

  // ── Connection / timeout errors ──
  if (
    message.includes("ECONNREFUSED") ||
    message.includes("ECONNRESET") ||
    message.includes("ETIMEDOUT") ||
    message.includes("timeout") ||
    message.includes("connect ENOENT") ||
    message.includes("Connection terminated")
  ) {
    return "Erro de ligação ao servidor. Tente novamente em alguns segundos.";
  }

  // ── Stripe errors ──
  if (message.includes("STRIPE_") || message.includes("stripe")) {
    if (message.includes("não configurado") || message.includes("não definido")) {
      return "Erro ao processar o pagamento. Por favor contacte o suporte.";
    }
  }

  // ── Next.js server action errors ──
  if (
    message.includes("Server Components render") ||
    message.includes("Failed to find Server Action") ||
    message.includes("digest")
  ) {
    return "Ocorreu um erro no servidor. Atualize a página e tente novamente.";
  }

  // ── Generic technical patterns ──
  if (
    message.includes("Cannot read properties") ||
    message.includes("is not a function") ||
    message.includes("undefined") ||
    message.includes("null")
  ) {
    return fallback || "Ocorreu um erro inesperado. Tente novamente.";
  }

  // ── If message is already user-friendly (Portuguese), keep it ──
  return message;
}
