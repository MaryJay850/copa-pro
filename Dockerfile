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

# Accept all env vars from Easypanel build-args
ARG STRIPE_SECRET_KEY=""
ARG STRIPE_WEBHOOK_SECRET=""
ARG STRIPE_PRICE_PRO_MONTHLY=""
ARG STRIPE_PRICE_PRO_YEARLY=""
ARG STRIPE_PRICE_CLUB_MONTHLY=""
ARG STRIPE_PRICE_CLUB_YEARLY=""
ARG AUTH_SECRET=""
ARG AUTH_URL=""
ARG APP_URL=""
ARG SMTP_HOST=""
ARG SMTP_PORT=""
ARG SMTP_USER=""
ARG SMTP_PASS=""
ARG SMTP_FROM=""
ARG WHATSAPP_API_URL=""
ARG WHATSAPP_API_KEY=""
ARG WHATSAPP_INSTANCE=""
ARG WHATSAPP_GROUP_AVATAR_URL=""
ENV STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
ENV STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET
ENV STRIPE_PRICE_PRO_MONTHLY=$STRIPE_PRICE_PRO_MONTHLY
ENV STRIPE_PRICE_PRO_YEARLY=$STRIPE_PRICE_PRO_YEARLY
ENV STRIPE_PRICE_CLUB_MONTHLY=$STRIPE_PRICE_CLUB_MONTHLY
ENV STRIPE_PRICE_CLUB_YEARLY=$STRIPE_PRICE_CLUB_YEARLY
ENV AUTH_SECRET=$AUTH_SECRET
ENV AUTH_URL=$AUTH_URL
ENV APP_URL=$APP_URL

# Generate Prisma client
RUN npx prisma generate

# Build Next.js (standalone mode)
RUN npm run build

# ── Stage 3: Runner (production) ──
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install netcat, cron, timezone data, and su-exec for privilege dropping
RUN apk add --no-cache netcat-openbsd dcron tzdata su-exec
ENV TZ=Europe/Lisbon

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

# Copy cron scripts and email modules (needed for cron notifications)
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src/lib/email.ts ./src/lib/email.ts
COPY --from=builder /app/src/lib/email-templates.ts ./src/lib/email-templates.ts

# Install runtime deps in a separate directory to avoid conflicts with standalone node_modules
RUN mkdir -p /app/runtime_deps && cd /app/runtime_deps && \
    npm init -y > /dev/null 2>&1 && \
    npm install prisma@7 @prisma/adapter-pg@7 pg postgres-array dotenv seedrandom bcryptjs nodemailer 2>&1 && \
    npm install -g tsx 2>&1

ENV NODE_PATH="/app/runtime_deps/node_modules"

# Copy entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

RUN chown -R nextjs:nodejs /app

# NOTE: No USER nextjs here — crond requires root.
# The entrypoint uses su-exec to drop to nextjs for the Node.js server.

EXPOSE 3000

ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

ENTRYPOINT ["./docker-entrypoint.sh"]
