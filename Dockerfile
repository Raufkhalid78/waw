# Stage 1: Build API & Prisma Client
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN npm ci --workspace=@waw/types --workspace=@waw/api
RUN npm run build --workspace=@waw/types
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npm run build --workspace=@waw/api

# Stage 2: Production Runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

RUN addgroup -g 1001 -S waw && adduser -S waw -u 1001

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

RUN chown -R waw:waw /app
USER waw

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1
CMD ["node", "apps/api/dist/server.js"]
