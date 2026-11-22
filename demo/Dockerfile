FROM node:22-bookworm AS api
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma
RUN npm ci && ./node_modules/.bin/prisma generate
COPY backend/tsconfig.json ./
COPY backend/src ./src
COPY backend/templates ./templates
RUN npm run build
USER node
CMD ["node", "dist/server.js"]

FROM node:22-bookworm AS web
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/index.html frontend/tsconfig.json frontend/vite.config.ts ./
COPY frontend/src ./src
ENV VITE_API_URL=http://127.0.0.1:3000/api
RUN npm run build
USER node
CMD ["./node_modules/.bin/vite", "preview", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]
