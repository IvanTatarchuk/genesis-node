# Agent Arena — production image.
#
# The grading sandbox uses `unshare` (util-linux) to create mount/net/pid
# namespaces, so this image ships util-linux AND the container must run with
# CAP_SYS_ADMIN (see docker-compose.yml and the README launch checklist). On a
# stock container that drops that capability, grading fails with
# "unshare: Operation not permitted" — hit /api/health after deploy to confirm
# the sandbox is usable before sending users at it.
FROM node:20-bookworm-slim

# `unshare` comes from util-linux; ca-certificates for the outbound HTTPS of the
# player's own Anthropic call.
RUN apt-get update \
  && apt-get install -y --no-install-recommends util-linux ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first so the layer caches across source-only changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
# Bind to all interfaces so the port is reachable from outside the container.
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["npm", "start"]
