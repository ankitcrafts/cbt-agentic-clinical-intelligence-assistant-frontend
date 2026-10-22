# syntax=docker/dockerfile:1

# Stage 1: Build Angular application
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --prefer-offline --no-audit

COPY . .
RUN npm run build -- --configuration production

# Stage 2: Production Nginx runtime
FROM nginx:1.25-alpine

COPY --from=build /app/dist/cbt-clinical-app/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
