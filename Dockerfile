# syntax=docker/dockerfile:1

# =============================================================================
# Base Stage - Common dependencies
# =============================================================================
FROM node:20-alpine AS base

# Install security updates
RUN apk upgrade --no-cache

# Set working directory
WORKDIR /app

# =============================================================================
# Dependencies Stage - Production dependencies only
# =============================================================================
FROM base AS deps

# Install libc6-compat for Node.js compatibility with Alpine Linux
# See: https://github.com/nodejs/docker-node/tree/main#nodealpine
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies only
# Use npm ci for reproducible builds
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# =============================================================================
# Builder Stage - Build the application
# =============================================================================
FROM base AS builder

# Install build dependencies
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies)
RUN npm ci --ignore-scripts && \
    npm cache clean --force

# Copy source code
COPY . .

# Copy production config and build
# Enable precompression for better performance
RUN cp svelte.config.prod.js svelte.config.js && \
    npm run build

# =============================================================================
# Runtime Stage - Final production image
# =============================================================================
FROM base AS runner

# Add OCI labels for metadata
LABEL org.opencontainers.image.title="Gruyere" \
      org.opencontainers.image.description="Multi Pi-hole management dashboard" \
      org.opencontainers.image.vendor="Gruyere" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.url="https://github.com/yourusername/gruyere" \
      org.opencontainers.image.documentation="https://github.com/yourusername/gruyere/blob/main/README.md" \
      org.opencontainers.image.version="0.0.1"

# Install runtime dependencies
# - su-exec: for dropping privileges safely
# - curl: for healthchecks
# - dumb-init: for proper signal handling
RUN apk add --no-cache \
    su-exec \
    curl \
    dumb-init

# Create non-root user and group
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs sveltekit

# Copy built application from builder stage
COPY --from=builder --chown=sveltekit:nodejs /app/build ./build
COPY --from=deps --chown=sveltekit:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=sveltekit:nodejs /app/package.json ./package.json

# Copy configuration templates (not actual config files)
COPY --chown=sveltekit:nodejs config/*.example.json ./config/

# Copy entrypoint script
COPY --chmod=755 entrypoint.sh /entrypoint.sh

# Create config directory with proper permissions
RUN mkdir -p /app/config && \
    chown -R sveltekit:nodejs /app/config

# Expose application port
EXPOSE 3141

# Set environment variables
ENV NODE_ENV=production \
    PORT=3141 \
    HOST=0.0.0.0 \
    ORIGIN=http://localhost:3141 \
    # Optimize Node.js for production
    NODE_OPTIONS="--max-old-space-size=512" \
    # Enable better error handling
    NODE_NO_WARNINGS=1

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Run entrypoint script
CMD ["/entrypoint.sh", "node", "build"]

# Healthcheck to verify the application is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3141/ || exit 1

# Add security configurations
# Note: read-only root filesystem would require additional tmpfs mounts
# for Node.js temp files, so we're not enabling it by default
# VOLUME ["/app/config"]
