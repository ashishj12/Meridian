FROM node:24-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && mkdir -p /app/data && chown node:node /app/data

COPY --from=build /app/dist ./dist
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/fixtures ./fixtures

ENV NODE_ENV=production PORT=3001 PUBLIC_PORT=3001 DB_PATH=/app/data/meridian.sqlite
USER node

EXPOSE 3001
CMD ["node","apps/api/src/server.mjs"]
