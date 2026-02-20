#!/bin/sh
set -e

echo "==> CopaPro: A iniciar..."

# Wait for PostgreSQL to be ready
echo "==> A aguardar PostgreSQL..."
MAX_RETRIES=30
RETRY=0
until node -e "
  const { Client } = require('pg');
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  c.connect().then(() => c.end()).catch(() => process.exit(1));
" 2>/dev/null; do
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
npx prisma db push --skip-generate 2>&1 || {
  echo "==> ERRO: Falha ao sincronizar schema"
  exit 1
}
echo "==> Schema sincronizado com sucesso!"

# Optional: Run seed if RUN_SEED=true
if [ "$RUN_SEED" = "true" ]; then
  echo "==> A semear base de dados..."
  npx tsx prisma/seed.ts 2>&1 || {
    echo "==> AVISO: Seed falhou (pode ja estar semeado)"
  }
  echo "==> Seed concluido!"
fi

echo "==> A iniciar servidor Next.js..."
exec node server.js
