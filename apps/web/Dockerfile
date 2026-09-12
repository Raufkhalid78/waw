# Build context MUST be the monorepo root:
#   docker build -f apps/web/Dockerfile -t waw-web .
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json turbo.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# NEXT_PUBLIC_* vars are baked into the client bundle at build time. CI's
# build-proof uses the default; deployments override with --build-arg (or a
# build-time env). Without it the fail-fast guard in @waw/config aborts
# production builds that would ship a bundle calling localhost.
ARG NEXT_PUBLIC_API_URL=https://api.waw.com.pk
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm ci --workspace=@waw/types --workspace=@waw/config --workspace=@waw/ui --workspace=@waw/web
RUN npm run build --workspace=@waw/types
RUN npm run build --workspace=@waw/config
RUN npm run build --workspace=@waw/web

# ─── Stage 2: Production Runner ───────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Run as non-root (container escape hardening)
RUN addgroup -S waw && adduser -S waw -G waw
RUN chown -R waw:waw /app
USER waw

COPY package*.json ./
COPY --from=builder --chown=waw:waw /app/node_modules ./node_modules
COPY --from=builder --chown=waw:waw /app/apps/web/.next ./apps/web/.next
COPY --from=builder --chown=waw:waw /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=waw:waw /app/apps/web/package.json ./apps/web/package.json

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["npm", "start", "--workspace=@waw/web"]