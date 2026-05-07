FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/constants/package.json ./packages/constants/
COPY packages/validators/package.json ./packages/validators/
COPY packages/ui/package.json ./packages/ui/
RUN npm i -g pnpm && pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @apps/backend build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
USER nestjs
EXPOSE 3000
CMD ["node", "dist/main.js"]
