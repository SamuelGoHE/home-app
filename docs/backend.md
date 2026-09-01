# Backend

Node.js + Express 4, ORM Sequelize 6 sobre PostgreSQL, Redis para sesión/blacklist, Socket.io para tiempo real.

## Arranque (`src/index.js`)

1. Valida que `JWT_SECRET`, `JWT_REFRESH_SECRET` y `DB_PASSWORD` existan en el entorno, y que los dos JWT tengan ≥ 32 caracteres. Si algo falta, el proceso termina (`process.exit(1)`) **antes** de intentar conectar nada — evita arrancar en un estado a medias.
2. Carga `app.js` (Express configurado), crea el `httpServer` HTTP nativo y monta Socket.io sobre él (necesario para que REST y WebSocket compartan el mismo puerto).
3. Conecta a PostgreSQL (`connectDB`) y Redis (`connectRedis`) — si Postgres falla, el proceso también termina; si Redis falla, sigue arrancando en modo degradado (ver [`authentication.md`](authentication.md)).
4. Expone el objeto `io` de Socket.io vía `app.set('io', io)` para que los controllers puedan emitir eventos (por ejemplo, notificar a un trabajador cuando llega una solicitud).

## Middlewares globales (`src/app.js`)

Orden real de registro (importa: Express resuelve por orden de `app.use`):

1. `helmet()` — cabeceras de seguridad HTTP.
2. `cors()` — en producción restringido a `FRONTEND_URL` (lista separada por comas); en desarrollo abierto (`origin: true`).
3. `globalLimiter` — rate limit general: 5000 req/15min en dev, 100 en producción, por IP.
4. `express.json({ limit: '10mb' })` / `express.urlencoded`.
5. `morgan` (logging de requests) — desactivado en `NODE_ENV=test`.
6. `GET /health` — healthcheck sin autenticación.
7. Rutas de negocio (ver tabla abajo).
8. `notFound` — 404 genérico.
9. `errorHandler` — captura errores, traduce `SequelizeValidationError` (400) y `SequelizeUniqueConstraintError` (409) a respuestas JSON consistentes.

Rate limits específicos adicionales (`src/middlewares/rateLimiter.js`), aplicados solo en las rutas de auth:
- **Login**: 20 intentos/IP/15min en producción (1000 en dev). La protección real por cuenta (no por IP) vive en `authService.login` — bloquea el email tras 5 fallos usando un contador en Redis.
- **Forgot password**: 5 solicitudes/IP/hora en producción, para evitar spam de emails.

## Mapa de rutas

| Prefijo montado en `app.js` | Archivo de rutas | Requiere auth |
|---|---|---|
| `/api/auth` | `routes/auth.js` | Parcial (login/register públicos, `/me` y `/logout` requieren token) |
| `/api/services` | `routes/services.js` | No (lectura pública) |
| `/api/quotes` | `routes/quotes.js` | Sí |
| `/api/tasks` | `routes/tasks.js` | Sí (implícito, ver nota abajo) |
| `/api` (catch-all) | `routes/projects.js` | Sí (`router.use(authenticate)` en la línea 7) |
| `/api/ratings` | `routes/ratings.js` | Sí |
| `/api/users` | `routes/users.js` | Sí |
| `/api/messages` | `routes/messages.js` | Sí |

⚠️ **`routes/tasks.js` no aplica `authenticate` explícitamente** sobre `PATCH /:id` — queda sin protección propia a nivel de archivo. En la práctica no es explotable porque no hay forma de operar sobre una tarea sin conocer su UUID y `taskService.updateTaskStatus` sí filtra por rol/asignación, pero es inconsistente con el resto del código y vale la pena revisarlo (ver [`quality-report.md`](quality-report.md)).

### Duplicación de rutas quotes/services/tasks

`routes/projects.js` se monta como **catch-all** en `/api` (línea 55 de `app.js`), *después* de `/api/quotes`, `/api/services` y `/api/tasks`. Express resuelve middlewares en el orden en que se registran, así que para cualquier ruta que exista en ambos lados, **gana la que se registró primero** y el handler duplicado dentro de `projectRoutes` nunca se ejecuta:

| Ruta | Quién la maneja realmente | Código muerto (nunca se ejecuta) |
|---|---|---|
| `GET/POST /api/quotes`, `/api/quotes/me`, `/api/quotes/worker`, `PATCH /api/quotes/:id/status` | `quotes.js` → `quoteController` → **`projectService.js`** (el controller de quotes delega directo a `projectService`, no a `quoteService`) | `services/quoteService.js` completo — nadie lo importa. `projectRoutes`'s `/quotes*` (líneas 48-67) también quedan sin alcanzar. |
| `GET /api/services`, `GET /api/services/:id` | `services.js` → `serviceController` → `serviceService.js` | `projectService.getServices` / `getServiceById`, y las rutas equivalentes en `projectRoutes` (líneas 10-11) |
| `PATCH /api/tasks/:id` | `tasks.js` → `taskController` → `taskService.js` | `projectService.updateTask` para ese verbo/ruta específico (aunque el código es casi idéntico al de `taskService`, mantenido por separado) |
| `POST /api/services`, `POST /api/tasks`, `PATCH /api/tasks/:id/assign`, todo `/api/projects*`, `GET /api/users/... ` no, `GET /api/workers` (nota: hay dos endpoints de workers, ver abajo) | **Sí se ejecutan** vía `projectController` → `projectService` — no tienen competencia porque `quotes.js`/`services.js`/`tasks.js` no definen esos verbos/rutas | — |

**Resuelto (sep-2026):** se eliminaron de `projectRoutes`/`projectController`/`projectService` las rutas y funciones shadoweadas (GET `/services*`, PATCH `/tasks/:id`, todo `/quotes*`); los routers dedicados quedan como únicos dueños. `quoteController` es ahora el único que sirve `/quotes*`, consumiendo `projectService`. `quoteService.js` ya se había eliminado. La tabla de arriba queda como referencia histórica del problema.

### Dos endpoints distintos para "lista de trabajadores"

- `GET /api/users/workers` (`routes/users.js`) — el que usa el frontend/mobile actualmente. Incluye filtro por ciudad (con escape SQL manual vía `sequelize.escape`) y especialidad, y enriquece con rating agregado.
- `GET /api/workers` (vía `projectRoutes` → `projectService.getWorkers`) — implementación más simple, ordena por `rating_avg` directamente de la columna desnormalizada en `User`. Sigue activo (no hay colisión de ruta), pero no se usa desde ningún cliente actual — es candidato a eliminar o documentar como legacy.

## Servicios de negocio relevantes

- **`services/authService.js`** — registro, login (con bloqueo por intentos fallidos vía Redis), refresh con rotación de token, logout (blacklist + revocación), forgot/reset password, y `oauthSignIn` (unifica Google/Facebook/Apple). Ver [`authentication.md`](authentication.md).
- **`services/projectService.js`** — el más grande y con más responsabilidades: catálogo, proyectos, tareas, cotizaciones y workers. Contiene la regla de negocio central: **aceptar una cotización crea un `Project` + una `Task` inicial automáticamente** (`updateQuoteStatus`).
- **`services/ratingService.js`** — valida que solo el cliente dueño de un proyecto **completado** pueda calificar, una sola vez, y recalcula `rating_avg`/`rating_count` del trabajador en cada nueva calificación (recorriendo todas sus calificaciones — ver riesgo de performance en [`quality-report.md`](quality-report.md)).

## Manejo de errores

Todos los controllers usan el patrón `try/catch` con `e.statusCode` opcional en el error (`404`, `403`, `409`, etc., default `500`), o delegan a `next(error)` para que lo capture `errorHandler` centralizado. `errorHandler` traduce automáticamente los errores de validación y de restricción única de Sequelize a respuestas JSON consistentes (`{ success: false, message, errors? }`).

## Migraciones (fuente de verdad del schema)

`src/db/migrations/` contiene 8 migraciones de `sequelize-cli`, en orden: `users` → `services` → `worker_profiles` → `projects` → `tasks` → `quotes` → `ratings` → `messages`. Los modelos en `src/models/*.js` deben mantenerse sincronizados a mano con las migraciones (Sequelize no las genera automáticamente desde los modelos). Comandos:

```bash
npm run db:migrate           # aplica migraciones pendientes
npm run db:migrate:undo       # revierte la última
npm run db:migrate:undo:all    # revierte todas
npm run db:seed:services       # seed específico del catálogo de servicios
```

`src/db/stamp-existing-db.sql` existe para marcar como "ya aplicadas" las migraciones en una base de datos que ya tenía el schema creado manualmente (típico de cuando se conecta por primera vez a un proyecto de Supabase existente).

## Script administrativo: `scripts/activate-users.js`

Utilidad standalone, fuera de `src/`, que activa (`is_active = true`) a todos los usuarios de la base de datos. Es una operación administrativa puntual, no parte del flujo normal de la app. Se ejecuta manualmente con `node scripts/activate-users.js` y lleva un encabezado que documenta cuándo usarla y su alcance (afecta a todos los usuarios de golpe).
