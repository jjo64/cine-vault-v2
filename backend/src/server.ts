import "dotenv/config"
import express from "express"
import cors from "cors"
import helmet from "helmet"
import cookieParser from "cookie-parser"
import cron from "node-cron"
import { createServer } from "http"
import "./config/passport.config.js"
import passport from "passport"

// Importación de rutas
import rutasAuth from "./routes/auth.routes.js"
import rutasUsuarios from "./routes/users.routes.js"
import rutasPeliculas from "./routes/movies.routes.js"
import rutasDiario from "./routes/diary.routes.js"
import rutasWatchlist from "./routes/watchlist.routes.js"
import rutasListas from "./routes/lists.routes.js"
import rutasResenas from "./routes/reviews.routes.js"
import rutasBusqueda from "./routes/search.routes.js"
import rutasPagos from "./routes/payments.routes.js"
import rutasRbac from "./routes/rbac.routes.js"
import rutasInformacion from "./routes/information.routes.js"
import rutasFavorities from "./routes/favorities.routes.js"
import rutasSettings from "./routes/settings.routes.js"
import rutasNotificaciones from "./routes/notifications.routes.js"

// Middlewares
import { manejadorErrores } from "./middlewares/error.middlewares.js"
import { limitadorGlobal } from "./middlewares/rateLimit.middleware.js"

// Importación de helpers
import { limpiarUsuariosNoVerificados } from "./lib/jobs.js"
import { initSocketIO } from "./config/socketio.config.js"

// Swagger & Documentación
import swaggerUi from "swagger-ui-express"
//import fs from "fs"
//import path from "path"
//import yaml from "yaml"
//import { fileURLToPath } from "url"
import { swaggerSpec } from "../docs/swagger.js"

//const __filename = fileURLToPath(import.meta.url)
//const __dirname = path.dirname(__filename)

// Configuración inicial
const app = express()
const httpServer = createServer(app)
initSocketIO(httpServer)
app.set("trust proxy", 1)
const PUERTO = process.env.PORT || 3000
if (!process.env.JWT_SECRET)
  throw new Error("JWT_SECRET no definido. Detén la app.")
if (!process.env.API_KEY_TMDB) throw new Error("API_KEY_TMDB no definido")

app.use(helmet()) // Seguridad HTTP headers

// Configuración de CORS robusta
const allowedOrigins = process.env.FRONTEND_URLS
  ? process.env.FRONTEND_URLS.split(",").map((url) => url.trim())
  : []

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir solicitudes sin origen (ej: Postman, scripts) o desde URLs permitidas
      if (!origin) return callback(null, true)

      if (allowedOrigins.includes(origin)) {
        return callback(null, true)
      }

      console.warn("Bloqueo CORS para origen:", origin)
      return callback(new Error("No permitido por CORS"))
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
)

app.use(limitadorGlobal)
// Stripe Webhook necesita el cuerpo raw para verificar la firma
app.use("/api/payments/webhook", express.raw({ type: "application/json" }))
app.use(express.json({ limit: "10mb" })) // Parseo de JSON body con límite
app.use(cookieParser()) // Parseo de cookies
app.disable("x-powered-by") // Ocultar tecnología del servidor por seguridad
cron.schedule("0 * * * *", limpiarUsuariosNoVerificados)
app.use(passport.initialize())

/* ==========================================================================
   RUTA RAÍZ DE PRUEBA (ANTES del manejador de errores)
   ========================================================================== */

app.get("/", (req, res) => {
  res.json({
    message: "API CineVault funcionando correctamente",
    status: "OK",
  })
})

/* ==========================================================================
   RUTAS DE LA API
   ========================================================================== */

/* ==========================================================================   
   DOCUMENTACIÓN API (OpenAPI)
   ========================================================================== */
// try {
//   const swaggerPath = path.join(__dirname, "../docs", "openapi.yaml")
//   const swaggerFile = fs.readFileSync(swaggerPath, "utf8")
//   const swaggerDocument = yaml.parse(swaggerFile)

//   app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument))
// } catch (error) {
//   console.warn(
//     "No se pudo cargar la documentación Swagger OpenAPI en /api-docs. Verifica que backend/docs/openapi.yaml exista."
//   )
//   console.error(error)
// }
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec))
app.use("/api/auth", rutasAuth)
app.use("/api/users", rutasUsuarios)
app.use("/api/movies", rutasPeliculas)
app.use("/api/search", rutasBusqueda)
app.use("/api/diary", rutasDiario)
app.use("/api/watchlist", rutasWatchlist)
app.use("/api/lists", rutasListas)
app.use("/api/reviews", rutasResenas)
app.use("/api/payments", rutasPagos)
app.use("/api/rbac", rutasRbac)
app.use("/api/information", rutasInformacion)
app.use("/api/favorites", rutasFavorities)
app.use("/api/settings", rutasSettings)
app.use("/api/notifications", rutasNotificaciones)

/* ==========================================================================
   MIDDLEWARE DE MANEJO DE ERRORES (SIEMPRE AL FINAL)
   ========================================================================== */

app.use(manejadorErrores)

/* ==========================================================================
   INICIO DEL SERVIDOR
   ========================================================================== */

httpServer.listen(PUERTO, () => {
  console.log(`\nServidor corriendo en: http://localhost:${PUERTO}`)
  console.log(
    `Frontend permitido: ${process.env.FRONTEND_URL || "No definido"}\n`
  )
})
