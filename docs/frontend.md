# Frontend web (`home-frontend/`)

React 18 + Vite 5, sin TypeScript. Enrutado con React Router 6, estado global con Zustand, estilos con Tailwind CSS.

## Arranque y proxy al backend

`npm run dev` levanta Vite en `:5173`. `vite.config.js` define un proxy: cualquier request a `/api/*` se reenvía a `http://localhost:3000` (el backend). Por eso `services/api.js` usa `baseURL: '/api'` **relativo** en vez de una URL absoluta — funciona automáticamente en dev (vía proxy) y en producción si el frontend se sirve desde el mismo dominio/origen que el backend (o detrás de un reverse proxy que enrute `/api`). Si frontend y backend se despliegan en dominios distintos, hay que revisar esta suposición (ver [`deployment.md`](deployment.md)).

## Estructura

```
src/
├── App.jsx              # Definición de todas las rutas (React Router)
├── main.jsx               # Entry point
├── pages/                  # Una por pantalla (30 archivos)
├── components/              # common/ (UI genérica) y layout/ (AppShell, navegación)
├── context/authStore.js      # Estado de sesión (Zustand + persist en localStorage)
├── hooks/
│   ├── useApi.js             # useFetch genérico + hooks específicos (useServices, useProjects, ...)
│   ├── useChat.js             # Conexión Socket.io + historial REST del chat
│   └── useNotifications.js     # Deriva "notificaciones" de quotes/projects ya cargados
├── services/
│   ├── api.js                 # Instancia de axios + interceptors (token, refresh automático)
│   └── index.js                # authService (usado) + workerApi/serviceApi/quoteApi/projectApi (sin usar, ver abajo)
└── utils/favorites.js          # Favoritos (servicios/trabajadores) persistidos en localStorage
```

## Rutas (`App.jsx`)

Usa un layout compartido (`AppShell`) y dos guards:
- **`AuthGuard`** — envuelve pantallas públicas de auth (login/register/welcome) para redirigir si el usuario ya está logueado.
- **`ProtectedRoute`** — exige sesión, y opcionalmente una lista de `allowedRoles` (usado para `/admin` → solo `admin`, `/worker*` → solo `trabajador`).

`RoleRedirect` en `/` y `/home` decide a qué pantalla mandar según `user.role` (cliente → home de cliente, trabajador → `WorkerDashboard`, admin → `AdminDashboard`).

Rutas por rol, a alto nivel:
- **Cliente**: `/services`, `/quote`, `/results`, `/projects(/:id)`, `/chat/:projectId`, `/worker/:id`, `/favorites`, `/rate`, `/ratings/my`, `/profile(/edit)`.
- **Trabajador**: `/worker` (dashboard), `/worker/profile/edit`, `/worker/security`, `/worker/help`, `/worker/support`, `/worker/settings`.
- **Admin**: `/admin` (dashboard único, `AdminDashboard.jsx` — no tiene sub-rutas propias, a diferencia de trabajador).

## Estado global: `authStore.js` (Zustand)

Persistido en `localStorage` (vía middleware `persist` de Zustand). Guarda `user`, `accessToken`, `refreshToken`, `isAuthenticated`. Expone `login`, `register`, `oauthLogin`, `logout`, todos delegando a `authService` (que pega contra `/api/auth/*`) y sincronizando `localStorage` manualmente además del `persist` de Zustand (redundancia intencional: `services/api.js` lee el token directo de `localStorage` en sus interceptors, no del store, para evitar un ciclo de dependencias entre el cliente HTTP y el store).

## Cliente HTTP: `services/api.js`

Instancia de axios con dos interceptors:
- **Request**: adjunta `Authorization: Bearer <accessToken>` leyendo de `localStorage`.
- **Response**: si una respuesta falla con `401`, intenta refrescar el token automáticamente con el `refreshToken` guardado (`POST /api/auth/refresh`) y reintenta la petición original una vez; si el refresh también falla, limpia los tokens y redirige a `/login` (`window.location.href`).

## Datos: `hooks/useApi.js`

`useFetch(url, params, deps)` es el hook base: `GET` con axios, maneja `loading`/`error`/`data`, expone `refetch`. Los hooks específicos (`useServices`, `useProjects`, `useProject`, `useMyQuotes`, `useWorkers`, `useWorker`) son wrappers finos sobre `useFetch` que además normalizan la forma de la respuesta (el backend a veces envuelve el array en un objeto y a veces no — estos hooks lo homogeneízan del lado del cliente).

No hay ninguna librería de data-fetching/cache (React Query, SWR) — cada hook gestiona su propio estado local y no comparte cache entre componentes que pidan la misma URL. Ver [`quality-report.md`](quality-report.md).

## Código muerto detectado: `services/index.js`

`workerApi`, `serviceApi`, `quoteApi` y `projectApi` (exportados desde `services/index.js`) **no los importa ningún componente** — el único export realmente usado de ese archivo es `authService` (por `authStore.js` y `AuthPages.jsx`). Además, algunos de sus endpoints ni siquiera existen en el backend actual (`/workers`, `/workers/popular`, `/services/search` no están definidos en `src/routes/`) — si alguien los llegara a usar tal cual, fallarían. El flujo real de datos pasa por `hooks/useApi.js`, que sí golpea las rutas correctas (`/users/workers`, `/services`, etc.). Detalle en [`quality-report.md`](quality-report.md).

## Notificaciones

`useNotifications.js` no llama a ningún endpoint propio — deriva una lista de notificaciones en memoria a partir de `useMyQuotes()` y `useProjects()` (que ya se piden para otras pantallas), mapeando `status` a un mensaje. Los "leídos"/"descartados" se guardan en `localStorage` (`getDismissed`, definido en `components/notifications/NotificationsPanel.jsx`). Ver [`realtime-chat.md`](realtime-chat.md#notificaciones-no-son-un-sistema-separado).

## Chat: `hooks/useChat.js`

Combina REST (`GET /api/messages/:projectId` para el historial) con Socket.io (conexión autenticada con el `accessToken`, `join_room` + escucha de `new_message`). La URL del socket sale de `VITE_API_URL` (con fallback a `http://localhost:3000`), **distinta** de la `baseURL` relativa (`/api`) que usan las llamadas REST normales — ver la variable en el [README](../README.md#variables-de-entorno).
