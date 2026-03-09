# Imagen base para compilación
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

# Copiar código fuente
COPY . .

# Generar cliente Prisma y compilar TypeScript
RUN npx prisma generate
RUN npm run build

# Imagen de producción (ligera)
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000

CMD ["npm", "start"]
