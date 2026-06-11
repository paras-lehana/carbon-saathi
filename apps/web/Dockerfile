# Carbon Saathi web — Next.js standalone build for Cloud Run.
# Build context is the REPOSITORY ROOT: docker build -f apps/web/Dockerfile .
# API_BASE_URL is a BUILD argument because Next resolves rewrites at build time.

FROM node:22-alpine AS build
WORKDIR /app
ARG API_BASE_URL=http://localhost:8080
ENV API_BASE_URL=${API_BASE_URL}

COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --no-audit --no-fund

COPY tsconfig.base.json ./
COPY packages/core packages/core
COPY apps/web apps/web
RUN npm run build -w @carbon-saathi/core && npm run build -w @carbon-saathi/web

FROM node:22-alpine
WORKDIR /app
# Cloud Run injects PORT; HOSTNAME must bind all interfaces inside the container.
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000

# Next standalone output mirrors the monorepo layout under .next/standalone.
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static

USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
