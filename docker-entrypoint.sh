#!/bin/sh
set -e

echo "==> CopaPro: A iniciar..."
echo "==> DATABASE_URL host: $(echo $DATABASE_URL | sed 's/.*@\(.*\):.*/\1/')"

# Runtime deps are in a separate directory
export NODE_PATH="/app/runtime_deps/node_modules:$NODE_PATH"
export PATH="/app/runtime_deps/node_modules/.bin:$PATH"

# Wait for PostgreSQL to be ready using simple TCP check
echo "==> A aguardar PostgreSQL..."
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

echo "==> Host: $DB_HOST Port: $DB_PORT"

MAX_RETRIES=30
RETRY=0
while ! nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
  RETRY=$((RETRY + 1))
  if [ $RETRY -ge $MAX_RETRIES ]; then
    echo "==> ERRO: PostgreSQL nao respondeu apos ${MAX_RETRIES} tentativas"
    exit 1
  fi
  echo "==> PostgreSQL nao disponivel, a tentar novamente ($RETRY/$MAX_RETRIES)..."
  sleep 2
done
echo "==> PostgreSQL disponivel!"

# Push schema (creates tables if they don't exist, safe for existing data)
echo "==> A sincronizar schema da base de dados..."
npx prisma db push --accept-data-loss 2>&1 || {
  echo "==> ERRO: Falha ao sincronizar schema"
  exit 1
}
echo "==> Schema sincronizado com sucesso!"

# Optional: Run seed if RUN_SEED=true
if [ "$RUN_SEED" = "true" ]; then
  echo "==> A semear base de dados..."
  tsx prisma/seed.ts 2>&1 || {
    echo "==> AVISO: Seed falhou (pode ja estar semeado)"
  }
  echo "==> Seed concluido!"
fi

# Auto-create or promote admin user using raw SQL (no Prisma, no module conflicts)
if [ -n "$ADMIN_EMAIL" ]; then
  echo "==> A verificar administrador ($ADMIN_EMAIL)..."
  node -e "
    const { Client } = require('pg');
    const bcrypt = require('bcryptjs');
    const crypto = require('crypto');

    function cuid() {
      return 'c' + crypto.randomBytes(12).toString('hex');
    }

    async function ensureAdmin() {
      const client = new Client({ connectionString: process.env.DATABASE_URL });
      await client.connect();

      try {
        const res = await client.query('SELECT id, role FROM users WHERE email = \$1', [process.env.ADMIN_EMAIL]);

        if (res.rows.length > 0) {
          if (res.rows[0].role !== 'ADMINISTRADOR') {
            await client.query('UPDATE users SET role = \$1 WHERE id = \$2', ['ADMINISTRADOR', res.rows[0].id]);
            console.log('==> Utilizador promovido a ADMINISTRADOR');
          } else {
            console.log('==> Administrador ja existe');
          }
        } else if (process.env.ADMIN_PASSWORD) {
          const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
          const playerId = cuid();
          const userId = cuid();
          const adminName = process.env.ADMIN_NAME || 'Administrador';

          await client.query('INSERT INTO players (id, \"fullName\", \"createdAt\") VALUES (\$1, \$2, NOW())', [playerId, adminName]);
          await client.query(
            'INSERT INTO users (id, email, phone, \"hashedPassword\", role, \"playerId\", \"createdAt\", \"updatedAt\") VALUES (\$1, \$2, \$3, \$4, \$5, \$6, NOW(), NOW())',
            [userId, process.env.ADMIN_EMAIL, process.env.ADMIN_PHONE || '', hashed, 'ADMINISTRADOR', playerId]
          );
          console.log('==> Administrador criado com sucesso');
        } else {
          console.log('==> ADMIN_PASSWORD nao definido, a ignorar criacao');
        }
      } finally {
        await client.end();
      }
    }

    ensureAdmin().catch(e => { console.error('==> AVISO: Falha ao configurar admin:', e.message); });
  " 2>&1
fi

# ── Setup cron for email notifications ──
if [ -n "$SMTP_USER" ] && [ -n "$SMTP_PASS" ]; then
  echo "==> A configurar cron para notificacoes por email..."

  # Export env vars to a file that cron jobs can source
  env | grep -E '^(DATABASE_URL|SMTP_|APP_URL|NODE_PATH|PATH|TZ)=' > /app/.cron-env

  # Write crontab — run daily at 8:00 AM
  echo "0 8 * * * . /app/.cron-env && tsx /app/scripts/cron-notifications.ts >> /var/log/cron-notifications.log 2>&1" > /tmp/crontab
  crontab /tmp/crontab
  rm /tmp/crontab

  # Start crond in background
  crond -b -l 8
  echo "==> Cron ativo (diariamente as 8h)"
else
  echo "==> SMTP nao configurado, cron de notificacoes desativado"
fi

echo "==> A iniciar servidor Next.js..."
exec su-exec nextjs node server.js
