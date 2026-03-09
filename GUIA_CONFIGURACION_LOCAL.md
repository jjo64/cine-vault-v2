# 🛠️ Guía de Configuración Manual (Sin Docker)

Si prefieres no usar Docker y configurar el entorno directamente en tu máquina (usando XAMPP o MySQL local), sigue estos pasos.

---

## 1. Instalación de Dependencias

Primero, instala todas las librerías necesarias del proyecto:

```bash
cd backend
npm install
```

---

## 2. Configuración de la Base de Datos

1. Crea una base de datos en tu MySQL (ej: `cinevault`).
2. Copia el archivo `.env.example` y renómbralo a `.env`.
3. Edita la línea `DATABASE_URL` con tus credenciales locales:

```env
# Ejemplo para XAMPP (sin contraseña)
DATABASE_URL="mysql://root:@localhost:3306/cinevault"
```

---

## 3. Configuración de Prisma (ORM)

Prisma es lo que conecta nuestro código con la base de datos. Debes ejecutar estos dos comandos en orden:

### Paso A: Generar el Cliente
Este comando crea las funciones necesarias para que TypeScript entienda las tablas de la base de datos:

```bash
npx prisma generate
```

---

## 4. Levantar el Servidor

Una vez configurado todo, puedes iniciar el backend en modo desarrollo:

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:4000`.

---

## 5. Resumen de Comandos

| Comando | Propósito |
|---|---|
| `npm install` | Instala las librerías |
| `npx prisma generate` | Genera el cliente de base de datos |
| `npm run dev` | Arranca el servidor con auto-recarga |

---

> [!TIP]
> Si tienes errores con Prisma después de cambiar alguna tabla, vuelve a ejecutar `npx prisma generate`.
