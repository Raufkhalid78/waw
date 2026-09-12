# ─── Stage 1: Build ────────────────────────────────────────────────────────────
# Build context MUST be the monorepo root:
#   docker build -f apps/api/Dockerfile -t waw-api .
FROM node:22-alpine AS builder
WORKDIR /app

# 1. Copy workspace manifests first (better layer caching)
COPY package*.json turbo.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/api/package.json ./apps/api/

# 2. Install all workspace deps
RUN npm ci --workspace=@waw/types --workspace=@waw/api

# 3. Copy source code
COPY packages/types/ ./packages/types/
COPY apps/api/src/ ./apps/api/src/
COPY apps/api/tsconfig.json apps/api/openapi.yaml ./apps/api/

# 4. Build shared types, then API
RUN npm run build --workspace=@waw/types
RUN npm run build --workspace=@waw/api

# ─── Stage 2: Production Runner ───────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Run as non-root (container escape hardening)
RUN addgroup -S waw && adduser -S waw -G waw
RUN chown -R waw:waw /app
USER waw

# Copy only what is needed at runtime
COPY package*.json ./
COPY --from=builder --chown=waw:waw /app/node_modules ./node_modules
COPY --from=builder --chown=waw:waw /app/packages/types/dist ./packages/types/dist
COPY --from=builder --chown=waw:waw /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=waw:waw /app/apps/api/package.json ./apps/api/package.json

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "apps/api/dist/server.js"]