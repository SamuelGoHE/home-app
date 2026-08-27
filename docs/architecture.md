# Arquitectura

## Visión general

HOME es un monorepo con **un backend** y **dos clientes** (web y móvil) que consumen la misma API:

```
home-frontend (Vite/React) ─┐
                              ├──► Backend Express (src/)  ──► PostgreSQL (Supabase)
home-mobile (Expo/RN)  ──────┘         │
                                        └──► Redis (sesiones, blacklist de tokens)
```

Ambos clientes hablan con el backend por dos canales:
- **REST** (`/api/*`) para todo el CRUD de negocio (auth, proyectos, cotizaciones, tareas, ratings, usuarios).
- **WebSocket** (Socket.io) para chat en tiempo real y notificaciones push (nueva solicitud, solicitud aceptada/rechazada). Ver [`realtime-chat.md`](realtime-chat.md).

## Backend: capas

El backend sigue (en la mayoría de los módulos) una separación en 3 capas:

```
routes/*.js        → define el endpoint HTTP + middlewares (auth, validación, rate limit)
controllers/*.js    → parsea req/res, delega al service, formatea la respuesta
services/*.js        → lógica de negocio pura (Sequelize, reglas de permisos, cálculos)
```

Esto **no es completamente uniforme** en todo el código — es la mayor fuente de deuda técnica del proyecto (detalle completo en [`quality-report.md`](quality-report.md)):

- `routes/users.js` y buena parte de `routes/ratings.js` tienen la lógica escrita **directamente en la ruta**, sin pasar por un `service`.
- Existen **dos implementaciones paralelas** para cotizaciones, tareas y catálogo de servicios:
  - Una "nueva" con router + controller + service dedicado (`routes/quotes.js` → `quoteController` → ~~`quoteService`~~, `routes/tasks.js` → `taskController` → `taskService`, `routes/services.js` → `serviceController` → `serviceService`).
  - Una "monolítica" dentro de `routes/projects.js` → `projectController` → `projectService`, montada como catch-all en `app.use('/api', projectRoutes)`.
  - Por el **orden de registro de middlewares en `app.js`**, las rutas montadas primero (`/api/quotes`, `/api/services`, `/api/tasks`) le ganan a las rutas equivalentes dentro del catch-all `/api`, dejando funciones completas sin usar (`quoteService.js` está 100% muerto; partes de `projectService.js` también). Ver el mapa completo de qué código realmente se ejecuta en [`backend.md`](backend.md#duplicación-de-rutas-quotesservicestasks).

## Modelo de datos

8 entidades principales, todas con `id` UUID. Diagrama de relaciones y detalle de columnas en [`database.md`](database.md).

```
User ──1:1──► WorkerProfile
User ──1:N──► Project (como client_id / worker_id / admin_id)
User ──1:N──► Quote   (como client_id / worker_id)
User ──1:N──► Task    (como assigned_to / created_by)
User ──1:N──► Rating  (como reviewer_id / worker_id)
User ──1:N──► Message (como sender_id)

Service ──1:N──► Project
Service ──1:N──► Quote

Project ──1:N──► Task
Project ──1:1──► Quote (opcional; se crea al aceptar la solicitud)
Project ──1:N──► Rating
Project ──1:N──► Message
```

## Flujo de negocio principal

```
1. Cliente ve catálogo de servicios (GET /api/services) y trabajadores (GET /api/users/workers)
2. Cliente envía una solicitud a un trabajador específico → Quote (status: solicitud_pendiente)
   → notificación en tiempo real al trabajador (Socket.io: new_service_request)
3. Trabajador acepta o rechaza:
   - Acepta  → se crea un Project automáticamente + una Task inicial de "revisión"
              → notificación al cliente (request_response)
   - Rechaza → notificación al cliente, el cliente puede elegir otro trabajador
4. Proyecto avanza por estados (pendiente → en_revision → aprobado → en_progreso → completado)
   sincronizando el estado de sus Tasks
5. Durante el proyecto: chat en tiempo real (Message + Socket.io) entre cliente y trabajador
6. Proyecto completado → el cliente puede calificar al trabajador una vez (Rating)
   → se recalcula el rating_avg / rating_count del trabajador
```

Detalle de reglas de permisos por rol (cliente / trabajador / admin) en [`backend.md`](backend.md).

## Autenticación

JWT de dos tokens (access + refresh) con Redis para revocación real, más OAuth (Google / Facebook / Apple) verificado server-side. Detalle completo en [`authentication.md`](authentication.md).

## Frontend web vs. Mobile

Ambos clientes son **implementaciones independientes** (no comparten código vía un paquete común), pero replican deliberadamente la misma estructura y, en varios archivos, **el mismo código casi al carácter** (`hooks/useApi.js` es idéntico byte a byte; `context/authStore.js`, `services/api.js` y `utils/favorites.js` solo cambian la capa de storage — `localStorage` vs `AsyncStorage`). Ver [`frontend.md`](frontend.md) y [`mobile.md`](mobile.md) para el detalle de cada uno, y [`quality-report.md`](quality-report.md) para el análisis de esta duplicación.

## Por qué no hay carpeta `shared/`

No existe ningún paquete compartido entre `home-frontend` y `home-mobile` (ni workspaces de npm, ni un paquete publicado). Cada uno tiene su propio `package.json`, `node_modules` y lockfile — son proyectos independientes que consumen la misma API REST/WebSocket, no un monorepo con dependencias internas.
