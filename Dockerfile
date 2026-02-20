# ── Stage 1: Dependencies ──
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: Builder ──
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Dummy DATABASE_URL for build time (prisma generate + next build don't need real DB)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV NEXT_TELEMETRY_DISABLED=1

# Generate Prisma client
RUN npx prisma generate

# Build Next.js (standalone mode)
RUN npm run build

# ── Stage 3: Runner (production) ──
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install netcat for TCP health checks
RUN apk add --no-cache netcat-openbsd

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build (includes server.js and minimal node_modules)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Create public dir (may not exist if empty)
RUN mkdir -p ./public
COPY --from=builder /app/public ./public

# Copy Prisma schema + config (needed for db push at startup)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/generated ./generated

# Install only runtime deps needed for DB migrations and seeding
RUN npm init -y > /dev/null 2>&1 && \
    npm install --no-save prisma@7 @prisma/adapter-pg@7 pg dotenv tsx seedrandom 2>&1

# Copy entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000

ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

ENTRYPOINT ["./docker-entrypoint.sh"]
