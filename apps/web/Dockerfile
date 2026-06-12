# Carbon Saathi web — Next.js standalone build for Cloud Run.
# Build context is the REPOSITORY ROOT: docker build -f apps/web/Dockerfile .
# API_BASE_URL is a BUILD argument because Next resolves rewrites at build time.

# Digest-pinned base: reproducible builds, immune to upstream tag re-pushes.
FROM node:22-alpine@sha256:9385cd9f3001dfc3431e8ead12c43e9e1f87cc1b9b5c6cfd0f73865d405b27c4 AS build
WORKDIR /app
ARG API_BASE_URL=http://localhost:8080
ENV API_BASE_URL=${API_BASE_URL}

COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# npm ci has a known bug with optional native deps when the lockfile was
# generated on a different OS (github.com/npm/cli/issues/4828). Use npm install
# so optional packages are re-evaluated for the current platform (linux musl).
RUN npm install --no-audit --no-fund

COPY tsconfig.base.json ./
COPY packages/core packages/core
COPY apps/web apps/web
RUN npm run build -w @carbon-saathi/core && npm run build -w @carbon-saathi/web

FROM node:22-alpine@sha256:9385cd9f3001dfc3431e8ead12c43e9e1f87cc1b9b5c6cfd0f73865d405b27c4
WORKDIR /app
# Cloud Run injects PORT; HOSTNAME must bind all interfaces inside the container.
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000

# Next standalone output mirrors the monorepo layout under .next/standalone.
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static

USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
