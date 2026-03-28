# syntax=docker/dockerfile:1

FROM node:22-alpine AS client-build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/client/package.json apps/client/
COPY apps/server/package.json apps/server/

RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY assets ./assets
COPY apps/client ./apps/client

RUN mkdir -p apps/client/public/assets && cp -R assets/. apps/client/public/assets/
RUN npm run build:client

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV CLIENT_DIST_PATH=/app/dist

COPY apps/server/package.json ./
RUN npm install --omit=dev

COPY apps/server/index.js ./index.js
COPY --from=client-build /repo/apps/client/dist ./dist

EXPOSE 3000

CMD ["node", "index.js"]
