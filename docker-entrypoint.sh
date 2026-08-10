#!/bin/sh
set -e

echo "🔄 Generating Prisma client..."
npx prisma generate --config prisma.config.js 2>/dev/null || npx prisma generate

echo "🔄 Running database migrations..."
if npx prisma migrate deploy --config prisma.config.js; then
  echo "✅ Migrations complete. Starting application..."
else
  echo "⚠️  Migration failed (DB may be unreachable). Starting application anyway..."
fi

exec node server.js
