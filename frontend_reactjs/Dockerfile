# Stage 1: Build Vite application
FROM node:20 AS build

ARG VITE_BASE_URL=/
ARG VITE_API_URL=http://gateway-service:8081
ARG VITE_DEV_SERVER_PORT=3000

ENV VITE_BASE_URL=${VITE_BASE_URL}
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_DEV_SERVER_PORT=${VITE_DEV_SERVER_PORT}

# Create app directory and set ownership to non-root user "node"
RUN mkdir -p /app && chown -R node:node /app

WORKDIR /app

# Run dependency install as root, copying the package files first
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Switch to non-root user for copying and building app
USER node
COPY --chown=node:node . .

# Run the build using node as non-root user
RUN node node_modules/vite/bin/vite.js build

# Stage 2: Production runtime with Node.js Express server
FROM node:20-alpine

ARG FRONTEND_PORT=8085
ENV PORT=${FRONTEND_PORT}

WORKDIR /app

# Copy built static assets
COPY --from=build /app/dist ./dist

# Copy server files and package.json
COPY server.js ./
COPY package*.json ./

# Install only production dependencies
RUN npm install --production --legacy-peer-deps

# Expose port for Express server
EXPOSE ${FRONTEND_PORT}

# Set environment to production
ENV NODE_ENV=production

# Run Express server
CMD ["node", "server.js"]
