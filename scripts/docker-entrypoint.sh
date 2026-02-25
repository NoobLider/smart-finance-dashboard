#!/bin/sh
set -eu

echo "[entrypoint] Waiting for database..."
until npx prisma db execute --stdin --schema prisma/schema.prisma <<'SQL'
SELECT 1;
SQL
do
  sleep 2
done

echo "[entrypoint] Running migrations..."
npx prisma migrate deploy

echo "[entrypoint] Checking whether seed is needed..."
if node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); (async () => { const count = await prisma.user.count({ where: { email: 'demo@smartfinance.local' } }); await prisma.\$disconnect(); process.exit(count > 0 ? 0 : 1); })().catch(async () => { await prisma.\$disconnect(); process.exit(1); });"; then
  echo "[entrypoint] Demo seed already present. Skipping seed."
else
  echo "[entrypoint] Seeding demo data..."
  npm run db:seed
fi

echo "[entrypoint] Starting app..."
exec npm run dev -- --hostname 0.0.0.0 --port 3000
