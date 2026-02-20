#!/bin/sh
set -e

echo "==> CopaPro: A iniciar..."
echo "==> DATABASE_URL host: $(echo $DATABASE_URL | sed 's/.*@\(.*\):.*/\1/')"

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
npx prisma db push 2>&1 || {
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

# Auto-create or promote admin user if ADMIN_EMAIL is set
if [ -n "$ADMIN_EMAIL" ]; then
  echo "==> A verificar administrador ($ADMIN_EMAIL)..."
  node -e "
    const { PrismaPg } = require('@prisma/adapter-pg');
    const { PrismaClient } = require('./generated/prisma/client');
    const bcrypt = require('bcryptjs');

    async function ensureAdmin() {
      const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
      const prisma = new PrismaClient({ adapter });

      try {
        const existing = await prisma.user.findUnique({ where: { email: process.env.ADMIN_EMAIL } });

        if (existing) {
          if (existing.role !== 'ADMINISTRADOR') {
            await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMINISTRADOR' } });
            console.log('==> Utilizador promovido a ADMINISTRADOR');
          } else {
            console.log('==> Administrador ja existe');
          }
        } else if (process.env.ADMIN_PASSWORD) {
          const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
          const player = await prisma.player.create({
            data: { fullName: process.env.ADMIN_NAME || 'Administrador' },
          });
          await prisma.user.create({
            data: {
              email: process.env.ADMIN_EMAIL,
              hashedPassword: hashed,
              role: 'ADMINISTRADOR',
              playerId: player.id,
            },
          });
          console.log('==> Administrador criado com sucesso');
        } else {
          console.log('==> ADMIN_PASSWORD nao definido, a ignorar criacao');
        }
      } finally {
        await prisma.\$disconnect();
      }
    }

    ensureAdmin().catch(e => { console.error('==> AVISO: Falha ao configurar admin:', e.message); });
  " 2>&1
fi

echo "==> A iniciar servidor Next.js..."
exec node server.js
