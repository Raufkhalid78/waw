# Stage 1: Build API
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json turbo.json ./
COPY packages/ ./packages/
COPY apps/api/package.json apps/api/tsconfig.json apps/api/openapi.yaml apps/api/.env.example apps/api/Dockerfile ./apps/api/
COPY apps/api/src/ ./apps/api/src/

RUN npm ci --workspace=@waw/types --workspace=@waw/api
RUN npm run build --workspace=@waw/types
RUN npm run build --workspace=@waw/api

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
