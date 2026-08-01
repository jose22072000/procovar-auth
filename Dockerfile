# Imagen de produccion de procovar-auth.
#
# Multi-stage: se compila con todas las dependencias y a la imagen final solo
# pasa el servidor standalone de Next. Asi la imagen queda en decenas de MB en
# vez de arrastrar node_modules entero.
FROM node:22-alpine AS base

# ---- Dependencias ----
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- Build ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# El cliente de Prisma se genera ANTES del build: Next lo necesita resuelto al
# compilar las rutas que tocan la base.
RUN npx prisma generate

# Activa output:standalone en next.config.ts (ver el condicional de ahi).
ENV BUILD_STANDALONE=1
# Valores de relleno solo para que el build no falle al leer el entorno. Los
# reales llegan en tiempo de ejecucion desde las variables del despliegue.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV BETTER_AUTH_SECRET="build-time-placeholder-no-se-usa-en-runtime"
ENV AUTH_FLOW_SECRET="0000000000000000000000000000000000000000000000000000000000000000"
RUN npm run build

# ---- Runtime ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# El motor de consultas de Prisma necesita openssl en Alpine.
RUN apk add --no-cache openssl

# No corre como root: si alguien logra ejecutar algo dentro del contenedor, lo
# hace con un usuario sin privilegios.
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Esquema y migraciones: el arranque aplica las pendientes con prisma migrate
# deploy, y para eso hace falta el CLI y el cliente generado.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma

USER nextjs

EXPOSE 3500
ENV PORT=3500
ENV HOSTNAME="0.0.0.0"

# migrate deploy (no db push): aplica solo las migraciones versionadas del
# repo. En un servicio de identidad no se improvisa el esquema.
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
