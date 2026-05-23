FROM node:20-alpine
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./

# Full install required for tests, typecheck, and Vite build.
RUN npm ci && npm cache clean --force

COPY . .

RUN npm run build:production && npm prune --omit=dev

CMD ["npm", "run", "docker-start"]
