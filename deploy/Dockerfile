FROM node:26.8.2-bookworm-slim AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json vite.team.config.ts team.html ./
COPY cloud ./cloud
# Typecheck references the legacy source as well; never change its APK build.
COPY src ./src
COPY tests/unit ./tests/unit
COPY tests/helpers ./tests/helpers
COPY vite.config.ts capacitor.config.ts ./
COPY scripts ./scripts
COPY docs ./docs
RUN npm run team:build

FROM node:26.8.2-bookworm-slim
ENV NODE_ENV=production TEAM_DB_PATH=/data/team.sqlite TEAM_PORT=4318
WORKDIR /app
RUN mkdir /data && chown node:node /data
COPY --chown=node:node server ./server
COPY --from=build --chown=node:node /build/dist-team ./dist-team
USER node
EXPOSE 4318
CMD ["node","server/app.mjs"]
