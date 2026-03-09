import swaggerJsdoc from "swagger-jsdoc"

const esProduccion = process.env.NODE_ENV === "production"

const options = {
  definition: {
    openapi: "3.1.0",
    info: {
      title: "API CineVault",
      description: "Documentación oficial de la API de CineVault. Red social para amantes del cine.",
      version: "1.0.0",
      contact: { name: "Equipo CineVault" },
    },
    servers: [
      { url: "https://api.cinevault.art/api", description: "Servidor de Producción" },
      { url: "http://localhost:4000/api", description: "Servidor de desarrollo" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "refresh_token",
        },
      },
      schemas: {
        UsuarioPublico: {
          type: "object",
          properties: {
            id: { type: "integer" },
            username: { type: "string" },
            email: { type: "string", format: "email" },
            role: { type: "string", enum: ["admin", "editor", "user"] },
            avatar_url: { type: "string", format: "uri", nullable: true },
            bio: { type: "string", maxLength: 160, nullable: true },
            is_verified: { type: "boolean" },
          },
        },
        EntradaDiario: {
          type: "object",
          properties: {
            movie_id: { type: "integer" },
            watched_date: { type: "string", format: "date" },
            tmdb_id: { type: "integer" },
            movie_info: {
              type: "object",
              nullable: true,
              properties: {
                title: { type: "string" },
                poster_path: { type: "string" },
              },
            },
            review: {
              type: "object",
              nullable: true,
              properties: {
                movie_id: { type: "integer" },
                rating: { type: "number" },
                content: { type: "string" },
                created_at: { type: "string", format: "date-time" },
              },
            },
          },
        },
        Resena: {
          type: "object",
          properties: {
            id: { type: "integer" },
            user_id: { type: "integer" },
            movie_id: { type: "integer" },
            content: { type: "string" },
            rating: { type: "number" },
            likes: { type: "integer" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Favorito: {
          type: "object",
          properties: {
            movie_id: { type: "integer" },
            rank_position: { type: "integer", nullable: true },
          },
        },
        Suscripcion: {
          type: "object",
          properties: {
            id: { type: "integer" },
            plan: { type: "string", enum: ["free", "vip", "pro"] },
            status: { type: "string", enum: ["active", "expired", "cancelled"] },
            start_date: { type: "string", format: "date" },
            end_date: { type: "string", format: "date" },
          },
        },
        Comentario: {
          type: "object",
          properties: {
            id: { type: "integer" },
            review_id: { type: "integer" },
            user_id: { type: "integer" },
            content: { type: "string" },
            created_at: { type: "string", format: "date-time" },
            users: {
              type: "object",
              properties: {
                id: { type: "integer" },
                username: { type: "string" },
                avatar_url: { type: "string", nullable: true },
              },
            },
          },
        },
        Notificacion: {
          type: "object",
          properties: {
            id: { type: "integer" },
            user_id: { type: "integer" },
            sender_id: { type: "integer", nullable: true },
            type: {
              type: "string",
              enum: ["follow", "like", "comment", "report_resolved"],
            },
            read: { type: "boolean" },
            created_at: { type: "string", format: "date-time" },
            sender: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "integer" },
                username: { type: "string" },
                avatar_url: { type: "string", nullable: true },
              },
            },
          },
        },
        TokenResponse: {
          type: "object",
          properties: {
            accessToken: { type: "string" },
          },
        },
        MensajeResponse: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string" },
            message: { type: "string" },
            code: { type: "integer" },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: "No autorizado",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        NotFound: {
          description: "Recurso no encontrado",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        Forbidden: {
          description: "Sin permisos suficientes",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        ValidationError: {
          description: "Error de validación",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
  },
  apis: esProduccion
    ? ["./dist/src/routes/*.js"]
    : ["./src/routes/*.ts"],
}

export const swaggerSpec = swaggerJsdoc(options)