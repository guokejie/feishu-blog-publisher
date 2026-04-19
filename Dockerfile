FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY scripts ./scripts
RUN npm run build

FROM node:20-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
COPY api ./api
COPY lib ./lib
COPY server.js ./server.js
COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["node", "server.js"]
