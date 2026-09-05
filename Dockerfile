# syntax=docker/dockerfile:1.7
#
# Production image for the FasterFixes dashboard + widget API (apps/web).
#
#   docker build -t faster-fixes .
#   docker run --env-file .env -p 3000:3000 faster-fixes
#
# NEXT_PUBLIC_* variables are inlined into the client bundle at build time, so
# pass the ones you need as --build-arg (docker-compose.yml does this for you).

ARG NODE_VERSION=22

# ---------------------------------------------------------------- deps ------
FROM node:${NODE_VERSION}-bookworm-slim AS deps
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true
RUN corepack enable
WORKDIR /app
# The upstream .npmrc references an NPM_TOKEN only the maintainer has.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/database/package.json packages/database/
COPY packages/ui/package.json packages/ui/
COPY packages/mcp/package.json packages/mcp/
COPY packages/widget-core/package.json packages/widget-core/
COPY packages/widget-react/package.json packages/widget-react/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/typescript-config/package.json packages/typescript-config/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# --------------------------------------------------------------- build ------
FROM deps AS build
COPY . .
RUN rm -f .npmrc

ARG NEXT_PUBLIC_FF_API_ORIGIN
ARG NEXT_PUBLIC_STORAGE_BASE_URL
ARG NEXT_PUBLIC_UMAMI_SCRIPT_URL
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID
ARG NEXT_PUBLIC_FF_API_KEY
ENV NEXT_PUBLIC_FF_API_ORIGIN=$NEXT_PUBLIC_FF_API_ORIGIN \
    NEXT_PUBLIC_STORAGE_BASE_URL=$NEXT_PUBLIC_STORAGE_BASE_URL \
    NEXT_PUBLIC_UMAMI_SCRIPT_URL=$NEXT_PUBLIC_UMAMI_SCRIPT_URL \
    NEXT_PUBLIC_UMAMI_WEBSITE_ID=$NEXT_PUBLIC_UMAMI_WEBSITE_ID \
    NEXT_PUBLIC_FF_API_KEY=$NEXT_PUBLIC_FF_API_KEY \
    NEXT_PUBLIC_IS_CLOUD=false \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

# Build order: prisma client -> widget packages -> web (turbo handles the graph).
RUN pnpm --filter @workspace/db build \
 && pnpm --filter web... build

# -------------------------------------------------------------- runner ------
FROM node:${NODE_VERSION}-bookworm-slim AS runner
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app .
RUN chown -R node:node /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Apply pending migrations, then start Next.
CMD ["sh", "-c", "pnpm --filter @workspace/db exec prisma migrate deploy && pnpm --filter web start"]
