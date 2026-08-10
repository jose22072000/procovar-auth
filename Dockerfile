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
# OJO: NO se copia `node_modules/.prisma`. Este esquema usa el generador nuevo
# (`provider = "prisma-client"`), que escribe el cliente en `src/generated/prisma`
# — la carpeta `.prisma` del generador viejo no llega a existir, y copiarla
# rompe el build con "not found" sin decir por qué.
COPY --from=builder --chown=nextjs:nodejs /app/src/generated/prisma ./src/generated/prisma

# El CLI de Prisma NO va en esta imagen, y las migraciones NO se aplican al
# arrancar. Dos razones, y las dos pesan:
#
# 1. Se intentó de las dos formas y ninguna sale bien. Copiar `node_modules/
#    prisma` del builder deja el CLI sin su árbol de dependencias y muere con
#    MODULE_NOT_FOUND dentro de `@prisma/dev`. Instalarlo con `npm install` en el
#    build lo baja de la red saltándose el lockfile: sin integridad comprobada y
#    con las dependencias transitivas sin fijar, en la imagen de un servicio de
#    IDENTIDAD. Eso no se hace.
#
# 2. Migrar al arrancar es mala idea aunque funcione. Con más de una réplica,
#    varias intentan migrar a la vez sobre la misma base; y un fallo de migración
#    tumba el arranque en vez de dejarte el servicio viejo en pie.
#
# Las migraciones se aplican como paso propio (ver README): `prisma migrate
# deploy` desde la imagen del build, que sí tiene todo. Es una acción
# deliberada, que es lo que corresponde al esquema de la identidad.

USER nextjs

EXPOSE 3500
ENV PORT=3500
ENV HOSTNAME="0.0.0.0"

# migrate deploy (no db push): aplica solo las migraciones versionadas del
# repo. En un servicio de identidad no se improvisa el esquema.
CMD ["node", "server.js"]
