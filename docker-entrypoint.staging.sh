#!/bin/sh
set -e

echo "🔄 Running database migrations..."
if pnpm exec prisma migrate deploy --config prisma.config.js; then
  echo "✅ Migrations complete. Starting application..."
else
  echo "⚠️  Migration failed (DB may be unreachable). Starting application anyway..."
fi

# next start runs from /app directly (no standalone bundle copy needed)
exec pnpm start
