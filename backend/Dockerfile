# syntax=docker/dockerfile:1
#
# One image that runs the whole Layer 2 backend -- REST API, WebSocket hub,
# and the Solana log indexer -- as a single always-on process (src/server.ts).
# Any always-on container host works (Railway, Render, Fly.io, ECS); see
# DEPLOY.md.

# ---- build ----
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- runtime ----
FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
# migrate.js reads SQL from ./drizzle at runtime (relative to WORKDIR).
COPY drizzle ./drizzle

# server.ts reads PORT (defaults to 4000) and binds 0.0.0.0.
EXPOSE 4000

# Apply any pending DB migrations, then boot the API + indexer. drizzle's
# migrator is idempotent, so this is safe on every restart.
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/server.js"]
