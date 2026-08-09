FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG API_BASE_URL=/api
ENV API_BASE_URL=${API_BASE_URL}
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=4096

RUN npm run build

FROM caddy:2.10-alpine

COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/build /srv

EXPOSE 80 443
