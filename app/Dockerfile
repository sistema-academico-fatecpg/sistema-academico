FROM node:22-bookworm-slim AS base

RUN corepack enable \
    && corepack prepare pnpm@12.17.0 --activate

# Dependencies
FROM base AS dependencies

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

# Build
FROM base AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    pnpm exec prisma generate

RUN pnpm build

# Production
FROM node:22-bookworm-slim AS runner

WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/app/generated/prisma ./app/generated/prisma

USER nextjs

CMD ["node", "server.js"]
