# Build context MUST be the monorepo root:
#   docker build -f apps/seller/Dockerfile -t waw-seller .
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json turbo.json ./
COPY packages/ ./packages/
COPY apps/seller/ ./apps/seller/

RUN npm ci --workspace=@waw/types --workspace=@waw/config --workspace=@waw/seller
RUN npm run build --workspace=@waw/types
RUN npm run build --workspace=@waw/config
RUN npm run build --workspace=@waw/seller

# Stage 2: Production Runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3003

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/seller/.next ./apps/seller/.next
COPY --from=builder /app/apps/seller/public ./apps/seller/public
COPY --from=builder /app/apps/seller/package.json ./apps/seller/package.json

EXPOSE 3003
CMD ["npm", "start", "--workspace=@waw/seller"]
