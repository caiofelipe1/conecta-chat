FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
RUN npm ci --workspace server --include-workspace-root=false --ignore-scripts --no-audit --no-fund
COPY shared shared
COPY server server
RUN npm run server:build
RUN npm prune --omit=dev --workspace server --include-workspace-root=false

FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/dist ./server/dist
EXPOSE 3000
USER node
CMD ["node", "server/dist/server/src/index.js"]
