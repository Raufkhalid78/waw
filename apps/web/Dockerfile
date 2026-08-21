# Stage 1: Build Next.js Web Storefront
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json turbo.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

RUN npm ci --workspace=@waw/types --workspace=@waw/ui --workspace=@waw/web
RUN npm run build --workspace=@waw/types
RUN npm run build --workspace=@waw/web

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json

EXPOSE 3000
CMD ["npm", "start", "--workspace=@waw/web"]
