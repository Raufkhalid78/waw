# Stage 1: Build Next.js Admin Control Center
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json turbo.json ./
COPY packages/ ./packages/
COPY apps/admin/ ./apps/admin/

RUN npm ci --workspace=@waw/types --workspace=@waw/admin
RUN npm run build --workspace=@waw/types
RUN npm run build --workspace=@waw/admin

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/admin/.next ./apps/admin/.next
COPY --from=builder /app/apps/admin/public ./apps/admin/public
COPY --from=builder /app/apps/admin/package.json ./apps/admin/package.json

EXPOSE 3001
CMD ["npm", "start", "--workspace=@waw/admin"]
