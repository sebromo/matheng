FROM node:24-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS development
ENV NODE_ENV=development
COPY . .
RUN mkdir -p /app/.next && chown -R node:node /app/.next
USER node
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]

FROM base AS builder
ENV NODE_ENV=production
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
COPY . .
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
RUN addgroup -S -g 1001 forma && adduser -S -u 1001 -G forma forma
COPY --from=builder --chown=forma:forma /app/.next/standalone ./
COPY --from=builder --chown=forma:forma /app/.next/static ./.next/static
USER forma
EXPOSE 3000
CMD ["node", "server.js"]
    
FROM base AS migrator
ENV NODE_ENV=production
RUN npm prune --omit=dev
COPY --chown=node:node server/database/migrations ./server/database/migrations
COPY --chown=node:node scripts/migrate-production.mjs ./scripts/migrate-production.mjs
USER node
CMD ["node", "scripts/migrate-production.mjs"]