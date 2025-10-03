# Use official Node.js image as base
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Build the application with production config
RUN cp svelte.config.prod.js svelte.config.js && npm run build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 sveltekit

# Copy the built application
COPY --from=builder /app/build ./build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Create config directory for volume mounting
RUN mkdir -p /app/config

# Copy default config files to config directory
COPY config.json ./config/
COPY instances.json ./config/

# Change ownership of the app directory to the sveltekit user
RUN chown -R sveltekit:nodejs /app
USER sveltekit

# Expose port 3141
EXPOSE 3141

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3141
ENV HOST=0.0.0.0

# Start the application
CMD ["node", "build"]
