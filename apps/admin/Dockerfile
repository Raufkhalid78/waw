# Stage 1: Build Next.js Admin Control Center
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json turbo.json ./
COPY packages/ ./packages/
COPY apps/admin/ ./apps/admin/

# NEXT_PUBLIC_API_URL is baked in at build time (fail-fast guard in
# @waw/config). Override with --build-arg in real deployments.
ARG NEXT_PUBLIC_API_URL=https://api.waw.com.pk
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm ci --workspace=@waw/types --workspace=@waw/config --workspace=@waw/admin
RUN npm run build --workspace=@waw/types
RUN npm run build --workspace=@waw/config
RUN npm run build --workspace=@waw/admin

# Stage 2: Production Runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# Run as non-root (container escape hardening)
RUN addgroup -S waw && adduser -S waw -G waw
RUN chown -R waw:waw /app
USER waw

COPY package*.json ./
COPY --from=builder --chown=waw:waw /app/node_modules ./node_modules
COPY --from=builder --chown=waw:waw /app/apps/admin/.next ./apps/admin/.next
COPY --from=builder --chown=waw:waw /app/apps/admin/public ./apps/admin/public
COPY --from=builder --chown=waw:waw /app/apps/admin/package.json ./apps/admin/package.json

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001/ || exit 1
CMD ["npm", "start", "--workspace=@waw/admin"]
