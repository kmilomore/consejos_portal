#Dockerfile multi-stage build + produccion

#Stage 1: Construir la app Next.js
FROM node:20-alpine AS builder

WORKDIR /app

#Copiar package*.json
COPY package*.json ./

#Instalar dependencias (solo de producción)
RUN npm ci

#Copiar source code
COPY . .

#Build: genera carpeta `out/` con HTML/CSS/JS estático
RUN npm run build

#Stage 2: Servir con Nginx (ligero y rápido)
FROM nginx:alpine

#Copiar archivos estáticos generados desde Stage 1
COPY --from=builder /app/out /usr/share/nginx/html

#Copiar configuración nginx personalizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

#Health check: verifica que nginx esté respondiendo
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

#Expose puerto
EXPOSE 80

#Log de startup
RUN echo "Portal Consejos Escolares containerizado ✓"

# Comando: nginx en foreground (importante para docker logs)
CMD ["nginx", "-g", "daemon off;"]
