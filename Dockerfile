# ==========================================
# Multi-Stage Dockerfile for WhatsApp Viewer
# ==========================================

# ------------------------------------------
# Stage 1: Build Frontend & Backend
# ------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy application sources
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY src/ ./src/
COPY server/ ./server/

# Build client SPA (dist/) and compile server TypeScript (dist-server/)
RUN npm run build

# ------------------------------------------
# Stage 2: Production Lightweight Runner
# ------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled frontend and backend assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

# Create persistent storage folder for SQLite DB and extracted media
RUN mkdir -p /app/data

# Declare volume for persistent data
VOLUME ["/app/data"]

# Expose web application port
EXPOSE 3000

# Start production server
CMD ["node", "dist-server/index.js"]
