# Base image
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci || npm install

# Copy source and build
COPY . .
RUN npm run build

# Production runtime
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

# Copy built application and dependencies
COPY package*.json ./
RUN npm ci --omit=dev || npm install --production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src/server ./src/server
COPY --from=builder /app/node_modules ./node_modules

# Ensure data directory for SQLite database persistence in Coolify volumes
RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 3000

# Volume for SQLite persistence across deployments
VOLUME ["/app/data"]

CMD ["npm", "start"]
