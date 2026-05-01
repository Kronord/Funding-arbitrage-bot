FROM node:20-alpine

WORKDIR /app

# Копіюємо package files
COPY package.json ./
COPY apps/server/package.json ./apps/server/
COPY packages/types/package.json ./packages/types/

# Встановлюємо залежності
RUN npm install

# Копіюємо код
COPY packages/types ./packages/types
COPY apps/server ./apps/server

# Генеруємо Prisma клієнт
WORKDIR /app/apps/server
RUN npx prisma generate

# Білдимо TypeScript
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]