# ---- build stage: compile TypeScript ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build && cp -r src/db/migrations dist/db/migrations

# ---- runtime stage: production deps only ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 4000
# Apply migrations, seed (idempotent) then start the API
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/db/seed/index.js && node dist/server.js"]
