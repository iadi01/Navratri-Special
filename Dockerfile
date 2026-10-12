# ==============================================================================
# Production Dockerfile for Navratri Special - Pehchaan Kaun
# Framework: TanStack Start + Nitro SSR + Node.js 22
# ==============================================================================

# ---- Stage 1: Build ----
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache libc6-compat

# Copy package manifests
COPY package.json package-lock.json ./

# Install clean dependencies
RUN npm ci

# Copy project source
COPY . .

# Set build environment and build production bundle
ENV NODE_ENV=production
RUN npm run build

# ---- Stage 2: Production Runner ----
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Copy compiled Nitro server & static public output
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json

# Use non-root node user for container security
USER node

# Expose server port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

# Start Nitro SSR node server
CMD ["node", ".output/server/index.mjs"]
