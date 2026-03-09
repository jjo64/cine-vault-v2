# 📄 Estándares de Diseño de API — CineVault

Este documento establece las normas y convenciones para el desarrollo del Backend de CineVault, asegurando consistencia, seguridad y escalabilidad.

---

## 1. Convenciones de Naming

### 1.1 Rutas (Endpoints)
- Utilizar **kebab-case** para las URLs.
- Utilizar sustantivos en plural para los recursos (ej. `/users`, `/movies`).
- Estructura: `/api/[version]/[recurso]/[identificador]`.

### 1.2 Métodos HTTP
- `GET`: Recuperar datos (no debe tener efectos secundarios).
- `POST`: Crear nuevos recursos o procesos complejos (ej. `/login`).
- `PUT`: Reemplazar un recurso existente completamente.
- `PATCH`: Actualización parcial de un recurso.
- `DELETE`: Eliminar un recurso.

---

## 2. Formato de Respuestas

Todas las respuestas deben ser objetos JSON.

### 2.1 Éxito (Success)
Las respuestas exitosas deben devolver el objeto solicitado o un mensaje de confirmación.
```json
{
  "message": "Operación exitosa",
  "data": { ... }
}
```

### 2.2 Error (Failure)
Los errores deben ser descriptivos y seguir un formato estándar.
```json
{
  "error": "Nombre técnico del error",
  "message": "Descripción amigable para el usuario",
  "code": 400,
  "details": [ ... ] 
}
```

---

## 3. Códigos de Estado HTTP

| Código | Uso en CineVault |
|-------|------------------|
| `200 OK` | Petición exitosa con retorno de datos. |
| `201 Created` | Recurso creado exitosamente (ej. tras registro). |
| `400 Bad Request` | Error de validación o datos malformados. |
| `401 Unauthorized` | Falta de token o token inválido/expirado. |
| `403 Forbidden` | Autenticado pero sin permisos (ej. admin only). |
| `404 Not Found` | Recurso no encontrado. |
| `429 Too Many Requests` | Límite de ráfaga excedido (Rate Limiting). |
| `500 Internal Server Error` | Errores no controlados en el servidor. |

---

## 4. Seguridad y Autenticación

- **JWT**: Se utiliza `AccessToken` (corta duración, en memoria/header) y `RefreshToken` (larga duración, en Cookie HttpOnly).
- **CORS**: Solo se permiten orígenes definidos en variables de entorno.
- **Helmet**: Configurado para proteger contra ataques comunes (XSS, Clickjacking).
- **Validación**: Todos los inputs externos deben ser validados con **Zod** antes de procesarse.

---

## 5. Paginación y Filtrado

Para listados largos (ej. búsqueda de películas), utilizar parámetros de query:
- `page`: Número de página (empezando en 1).
- `limit`: Cantidad de elementos por página.
- `sort`: Campo para ordenar (ej. `created_at:desc`).

---

## 6. Manejo de Errores Asíncronos

Utilizamos Express 5, el cual captura automáticamente promesas rechazadas. Sin embargo, se mantiene el uso de `manejadorAsincrono` para decorar respuestas y asegurar que los errores lleguen al middleware global de forma controlada.
