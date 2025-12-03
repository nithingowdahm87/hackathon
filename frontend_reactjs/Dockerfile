# Stage 1: build (optional, but we already built manually above)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: serve static files with nginx (HTTP only)
FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html

# remove default nginx content
RUN rm -rf ./*

# copy built assets
COPY --from=builder /app/dist ./

# simple nginx config: listen on 8085 HTTP and proxy /api to gateway-service
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8085
CMD ["nginx", "-g", "daemon off;"]
