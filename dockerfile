
# ── Imagen base ──────────────────────────────────────────────────
FROM node:20-alpine
 
# ── Directorio de trabajo dentro del contenedor ───────────────────
WORKDIR /app
 
# ── Copiar dependencias primero (mejor uso de caché de Docker) ────
COPY package*.json ./
 
# ── Instalar dependencias de producción ───────────────────────────
RUN npm install --omit=dev
 
# ── Copiar el resto del proyecto ──────────────────────────────────
COPY . .
 
# ── Crear carpeta de uploads (para fotos de perfil) ───────────────
RUN mkdir -p uploads
 
# ── Puerto que expone la app ──────────────────────────────────────
EXPOSE 3000
 
# ── Comando de inicio ─────────────────────────────────────────────
CMD ["node", "app.js"]
 