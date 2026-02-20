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
  node --import tsx/esm prisma/seed.ts 2>&1 || {
    echo "==> AVISO: Seed falhou (pode ja estar semeado)"
  }
  echo "==> Seed concluido!"
fi

echo "==> A iniciar servidor Next.js..."
exec node server.js
