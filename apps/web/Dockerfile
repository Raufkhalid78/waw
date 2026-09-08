# Build context MUST be the monorepo root:
#   docker build -f apps/web/Dockerfile -t waw-web .
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json turbo.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

RUN npm ci --workspace=@waw/types --workspace=@waw/config --workspace=@waw/ui --workspace=@waw/web
RUN npm run build --workspace=@waw/types
RUN npm run build --workspace=@waw/config
RUN npm run build --workspace=@waw/web

# ─── Stage 2: Production Runner ───────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["npm", "start", "--workspace=@waw/web"]