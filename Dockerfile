# procovar-auth — Next.js 16 + Prisma + better-auth
#
# Multi-stage: Dokploy hace git clone limpio y construye ahi, asi que la imagen
# tiene que salir de cero. Nada de copiar un .next/ hecho a mano.
#
# Requiere output: "standalone" en next.config.ts (ya esta puesto).

FROM node:22-alpine AS deps
WORKDIR /app
# Se copian solo los manifiestos para que esta capa se reutilice mientras no
# cambien las dependencias: sin esto, cada commit reinstalaria todo npm.
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# El cliente de Prisma se genera ANTES del build: el codigo de Next lo importa
# al compilar y sin el fallan los tipos.
RUN npx prisma generate

# En el build, Next evalua rutas y puede tocar la base de datos. Estas variables
# son de relleno para que no falle; las de verdad se inyectan al arrancar.
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
ENV BETTER_AUTH_SECRET="build-time-placeholder-no-usar-en-produccion"
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3500

# Un servicio expuesto no debe correr como root dentro del contenedor.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

# El schema y el cliente generado hacen falta en ejecucion (migraciones y
# consultas). El standalone no los arrastra solo.
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3500
CMD ["node", "server.js"]
