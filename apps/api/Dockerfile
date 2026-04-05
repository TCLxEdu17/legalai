FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 make g++ openssl openssl-dev

FROM base AS deps
COPY package*.json ./
RUN npm install --omit=dev

FROM base AS builder
COPY package*.json ./
RUN npm install
COPY . .
# Passa DATABASE_URL só para este comando — Prisma exige no generate mas não conecta de verdade
RUN DATABASE_URL="postgresql://placeholder:x@localhost:5432/placeholder" npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

RUN mkdir -p uploads logs

EXPOSE 3001

# prisma migrate deploy roda em runtime com DATABASE_URL real do ambiente
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
