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

# El CLI se INSTALA aquí, no se copia del builder.
#
# Copiar `node_modules/prisma` y `@prisma` sueltos deja el CLI sin su árbol de
# dependencias: arranca y muere con `MODULE_NOT_FOUND` dentro de `@prisma/dev`.
# Se ve tarde, en el arranque del contenedor, no en el build.
#
# Instalarlo con npm trae lo que necesita y nada más. La versión va FIJA y tiene
# que coincidir con la de package.json: un CLI más nuevo que el cliente puede
# escribir migraciones que el cliente generado no entiende.
RUN npm install --no-save --omit=dev prisma@7.2.0

USER nextjs

EXPOSE 3500
ENV PORT=3500
ENV HOSTNAME="0.0.0.0"

# migrate deploy (no db push): aplica solo las migraciones versionadas del
# repo. En un servicio de identidad no se improvisa el esquema.
# Se llama al CLI por su RUTA, no con `npx prisma`.
#
# La salida `standalone` de Next trae solo lo que la aplicación importa, y ahí no
# entra `node_modules/.bin` — que es el enlace que hace que `prisma` exista como
# comando. El contenedor arrancaba y moría en bucle con `sh: prisma: not found`,
# sin llegar a aplicar ni una migración.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
