# ADR 0001: Implementación del Patrón Repository (Separación de Preocupaciones)

## Estado
Aceptado

## Contexto
Actualmente, los archivos de la capa de servicios (`src/services/auth.services.ts`, etc.) contienen acoplamiento directo con **Prisma ORM** (`import { prisma } from "../lib/prisma.js"`). 
Esto supone varios problemas de diseño:
1. **Falta de Escalabilidad y Testabilidad**: Es difícil escribir pruebas unitarias para los servicios porque la base de datos no se puede mockear fácilmente de forma aislada sin dependencias fuertes a Prisma.
2. **Violación del Principio de Responsabilidad Única (SRP)**: La capa de servicios gestiona tanto la lógica de negocio como las consultas CRUD complejas.
3. **Mucho código junto**: Dificulta el mantenimiento y la lectura rápida de los servicios al combinarlos con queries anidadas de base de datos.

## Decisión
Se decide introducir el **Patrón Repositorio (Repository Pattern)** de acuerdo a las mejores prácticas de **Node.js Backend Patterns (Clean Architecture / Layered Architecture)**. 
- Los controladores (Controllers) siguen manejando la lógica de Request/Response HTTP.
- Los servicios (Services) contienen exclusivamente la lógica estructurada de negocio (generación de tokens, validaciones complejas, lógicas if/else de auth).
- Los **Repositorios (Repositories)** abstraen la persistencia de datos y se comunican con Prisma. El servicio consumirá el repositorio.

Adicionalmente, se integrarán **Tipos Avanzados de TypeScript (Advanced Types)** (incluyendo interfaces genéricas, Record, Omit y Utility types) para garantizar seguridad de tipos durante toda la interacción de capas.

## Consecuencias
- **Positivas**: Mayor limpieza de código (Clean Code). La base de código será considerablemente más modular, escalable y aislada. Será más fácil reemplazar el ORM a futuro si así se desea.
- **Negativas**: Aumenta el número de archivos en el proyecto debido a la nueva capa física (una carpeta `repositories`). Requiere inicializar instancias o resolver la inyección de dependencias.
