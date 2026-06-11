# Carbon Saathi API — multi-stage build for Cloud Run.
# Build context is the REPOSITORY ROOT (monorepo workspaces need sibling
# manifests at install time): docker build -f apps/api/Dockerfile .

FROM node:22-alpine AS build
WORKDIR /app

# Manifests first so dependency layers cache independently of source edits.
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --no-audit --no-fund

COPY tsconfig.base.json ./
COPY packages/core packages/core
COPY apps/api apps/api
RUN npm run build -w @carbon-saathi/core && npm run build -w @carbon-saathi/api \
  # Efficiency: dev toolchain (tsc, vitest, types) never ships in the image.
  && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# The workspace symlink node_modules/@carbon-saathi/core resolves because
# packages/core is copied to the same relative path as in the build stage.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/core/package.json packages/core/
COPY --from=build /app/packages/core/dist packages/core/dist
COPY --from=build /app/apps/api/package.json apps/api/
COPY --from=build /app/apps/api/dist apps/api/dist

# Security: drop root before accepting traffic.
USER node
EXPOSE 8080
CMD ["node", "apps/api/dist/index.js"]
