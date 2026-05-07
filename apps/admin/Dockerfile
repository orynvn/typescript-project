FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY apps/admin/package.json ./apps/admin/
RUN npm i -g pnpm && pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @apps/admin build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/admin/.next ./.next
COPY --from=builder /app/apps/admin/public ./public
COPY --from=builder /app/apps/admin/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node_modules/.bin/next", "start", "-p", "3001"]
