# ─── Stage 1 : Build ──────────────────────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app

# Install all dependencies (including devDependencies for TypeScript)
COPY package*.json ./
RUN npm ci

# Compile TypeScript
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Prune to production dependencies only
RUN npm ci --omit=dev

# ─── Stage 2 : Runtime ────────────────────────────────────────────────────────
FROM node:18-alpine AS runtime
WORKDIR /app

# Copy compiled output and production node_modules
COPY --from=builder /app/dist        ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json  ./package.json

CMD ["node", "dist/server.js"]
