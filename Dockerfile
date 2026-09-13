# SafeJourney -- container image
# Simple single-stage-runtime build (favors correctness/simplicity for a
# demo/pilot deployment over minimal image size). Builds the app, then runs
# migrations + a demo seed on first boot before starting the server.

FROM node:20-slim AS base
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

FROM deps AS build
COPY . .
RUN npx prisma generate
RUN npm run build

FROM build AS runtime
ENV NODE_ENV=production
ENV DEMO_MODE=true
RUN mkdir -p /app/storage/uploads
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
