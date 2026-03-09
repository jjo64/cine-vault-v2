# 🐳 Guía de Inicio Rápido: CineVault con Docker

Esta guía está diseñada para que cualquier integrante del equipo de TFG pueda levantar el proyecto en menos de 5 minutos, sin necesidad de instalar bases de datos o Redis manualmente.

---

## 1. Requisitos Previos

Solo necesitas tener instalado **Docker Desktop**. Puedes descargarlo aquí:
[Descargar Docker Desktop para Windows](https://www.docker.com/products/docker-desktop/)

> [!IMPORTANT]
> Asegúrate de que Docker Desktop esté abierto y funcionando antes de continuar.

---

## 2. Configuración del Proyecto

### Paso A: Clonar y entrar al proyecto
Si ya lo tienes, asegúrate de estar en la carpeta `backend`.

### Paso B: Crear el archivo .env
Docker necesita saber tus claves secretas. En la carpeta `backend`, crea un archivo llamado `.env` y copia lo siguiente (o duplica el `.env.example`):

```env
PORT=4000
JWT_SECRET="tfg_cinevault_secret_key"
REFRESH_SECRET="tfg_cinevault_refresh_key"
API_KEY_TMDB=tu_api_key_de_tmdb
FRONTEND_URL=http://localhost:5173
```
*(Pídeme la `API_KEY_TMDB` si no la tienes)*.

---

## 3. Levantar el Proyecto

Abre una terminal en la carpeta `backend` y ejecuta:

```bash
docker compose up -d --build
```

**¿Qué hace esto?**
- Descarga la imagen de base de datos (MariaDB).
- Descarga la imagen de Redis.
- Construye la aplicación de Node.js.
- Conecta todo automáticamente.

---

## 4. Comandos Útiles

| Acción | Comando |
|---|---|
| **Ver logs** (errores) | `docker compose logs -f backend` |
| **Detener todo** | `docker compose stop` |
| **Borrar y reiniciar** | `docker compose down -v` (⚠️ borra datos locales) |
| **Estado** | `docker compose ps` |

---

## 5. Solución de Problemas

- **Error de puerto ocupado:** Asegúrate de no tener XAMPP, MySQL o Redis corriendo localmente.
- **Cambios en el código:** Docker detectará los cambios, pero si algo falla, usa `docker compose up --build` para reconstruir.
- **Prisma no conecta:** Verifica que tu archivo `.env` NO tenga una `DATABASE_URL` que apunte a `localhost`. Deja que la configuración por defecto de Docker lo maneje.

---

¡Cualquier duda, pregunta por el grupo de TFG! 🚀
