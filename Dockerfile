FROM node:20-slim AS deps

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci --omit=dev


FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
   python3 \
   build-essential \
   && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=development

COPY package.json package-lock.json* ./

RUN npm ci

COPY . .

RUN npm run build


FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY  package.json ./



RUN chown -R node:node /app

#Switch to non-root user
USER node

#Expose the port your app listens (default from your env/compose is 4000)
EXPOSE 4000

CMD ["node","dist/server.js"]
