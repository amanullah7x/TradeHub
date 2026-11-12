# One image that serves both the TradeHub API and the website.

FROM node:24-alpine AS web
WORKDIR /build/app
COPY app/package.json app/package-lock.json ./
RUN npm ci
COPY app/ ./
ARG EXPO_PUBLIC_CONTACT_EMAIL
ARG EXPO_PUBLIC_CURRENCY_SYMBOL
ARG EXPO_PUBLIC_ADSENSE_CLIENT
ARG EXPO_PUBLIC_ADSENSE_SLOT
RUN npx expo export --platform web

FROM node:24-alpine
ENV NODE_ENV=production \
    PORT=4000 \
    WEB_DIR=/srv/app/dist \
    DB_FILE=/data/tradehub.db \
    UPLOADS_DIR=/data/uploads
WORKDIR /srv/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/src ./src
COPY --from=web /build/app/dist /srv/app/dist
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1
CMD ["node", "src/index.js"]
