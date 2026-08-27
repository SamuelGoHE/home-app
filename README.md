# HOME — Plataforma de servicios del hogar

HOME conecta clientes que necesitan servicios de remodelación y mantenimiento (pintura, plomería, electricidad, obra gris, carpintería, etc.) con trabajadores independientes verificados. Un administrador supervisa el ciclo completo: solicitud → cotización → proyecto → tareas → calificación.

El sistema está compuesto por tres aplicaciones independientes que comparten un único backend:

| App | Para quién | Stack |
|---|---|---|
| `home-frontend` | Web (clientes, trabajadores, admin) | React 18 + Vite |
| `home-mobile` | iOS / Android (clientes, trabajadores) | Expo (React Native) |
| raíz (`src/`) | Backend de ambas | Node.js + Express + PostgreSQL |

> Documentación técnica detallada de cada parte en [`docs/`](docs/).

---

## Arquitectura general

```
┌─────────────────┐     ┌──────────────────┐
│  home-frontend   │     │   home-mobile    │
│  (Vite / React)  │     │  (Expo / RN)     │
└────────┬─────────┘     └────────┬─────────┘
         │  REST + WebSocket (Socket.io)     │
         └───────────────┬────────────────────┘
                          ▼
                 ┌──────────────────┐
                 │  Backend (Express) │  ← raíz del repo (src/)
                 │  + Socket.io       │
                 └──┬─────────┬──────┘
                    │         │
              ┌─────▼───┐ ┌───▼────┐
              │PostgreSQL│ │ Redis  │
              │(Supabase)│ │(sesiones,│
              │          │ │blacklist)│
              └──────────┘ └────────┘
```

- El backend expone una **API REST** (`/api/*`) consumida tanto por el frontend web como por la app móvil, y un servidor **Socket.io** para chat y notificaciones en tiempo real.
- La base de datos es **PostgreSQL**, normalmente alojada en **Supabase** (también funciona con Postgres local).
- **Redis** guarda la sesión (refresh tokens por dispositivo) y la blacklist de access tokens revocados (logout, cambio de contraseña). Si Redis no está disponible, el backend sigue funcionando en modo degradado (ver [`docs/authentication.md`](docs/authentication.md)).
- Detalle completo de la arquitectura, decisiones de diseño y flujos de datos: [`docs/architecture.md`](docs/architecture.md).

## Tecnologías utilizadas

**Backend** (raíz del repo)
- Node.js + Express 4
- Sequelize 6 (ORM) sobre PostgreSQL
- Redis (sesión / blacklist de tokens)
- Socket.io 4 (tiempo real)
- JWT (`jsonwebtoken`) + `bcryptjs`
- OAuth: Google (`google-auth-library`), Facebook (Graph API), Apple (verificación JWK propia)
- `express-validator`, `express-rate-limit`, `helmet`, `cors`
- Jest + Supertest (tests)

**Frontend web** (`home-frontend/`)
- React 18 + Vite 5
- React Router 6
- Zustand (estado global / auth)
- Tailwind CSS
- Socket.io-client
- `@react-oauth/google`

**Mobile** (`home-mobile/`)
- Expo SDK ~54 + React Native 0.81
- React Navigation 7 (stack + bottom tabs)
- Zustand + AsyncStorage (persistencia)
- NativeWind (Tailwind para RN)
- Socket.io-client
- `@react-native-google-signin/google-signin`, `expo-auth-session`

## Estructura de carpetas

```
home-app/
├── src/                      # Backend (Express)
│   ├── config/                # Conexión DB, Redis, Supabase, seed
│   ├── controllers/            # Capa HTTP (parsea request, llama al service)
│   ├── services/               # Lógica de negocio
│   ├── models/                 # Modelos Sequelize + asociaciones (models/index.js)
│   ├── routes/                  # Definición de endpoints
│   ├── middlewares/             # auth, rate limiting, manejo de errores
│   ├── utils/                   # JWT, verificación OAuth
│   ├── db/migrations/            # Migraciones Sequelize (fuente de verdad del schema)
│   ├── db/seeders/               # Seeders de sequelize-cli
│   ├── app.js                    # Configuración de Express (middlewares + rutas)
│   └── index.js                  # Punto de entrada: valida env, arranca HTTP + Socket.io
├── tests/                      # Tests unitarios (Jest, con mocks — no requieren DB real)
├── home-frontend/               # App web (Vite + React)
│   └── src/{pages,components,hooks,context,services}/
├── home-mobile/                 # App móvil (Expo)
│   └── src/{screens,components,hooks,context,services}/
├── docs/                        # Documentación técnica (este README las referencia)
├── .env.example                 # Plantilla de variables de entorno del backend
└── package.json                 # Scripts y dependencias del backend
```

## Requisitos del entorno

| Herramienta | Versión mínima | Notas |
|---|---|---|
| Node.js | **≥ 20.19.4** | Piso real exigido por `react-native@0.81.5` en `home-mobile/package-lock.json`. No hay `.nvmrc`; se recomienda usar la última LTS activa. |
| npm | ≥ 7 (viene con Node moderno) | El repo usa `lockfileVersion: 3`. |
| PostgreSQL | 13+ | Local o vía Supabase (recomendado). |
| Redis | 6+ | Opcional para arrancar, pero necesario para que el logout/blacklist de tokens funcione de verdad. |
| Watchman | — | Recomendado para Metro (mobile) en macOS/Linux. |
| CocoaPods | — | Solo si vas a compilar el proyecto iOS nativo localmente (`expo run:ios` / `expo prebuild`). No es necesario para desarrollo normal con Expo Dev Client / EAS Build. |
| Xcode / Android Studio | — | Solo si compilas nativo localmente. El flujo normal de este proyecto usa **EAS Build** (`home-mobile/eas.json`) y **Expo Dev Client**, no compilación nativa local. |

## Cómo instalar el proyecto desde cero

El proyecto es un monorepo con 3 `package.json` independientes: **hay que instalar cada uno por separado**.

```bash
# 1. Backend (raíz del repo)
npm install

# 2. Frontend web
cd home-frontend
npm install
cd ..

# 3. App móvil
cd home-mobile
npm install
cd ..
```

```bash
# 4. Variables de entorno del backend
cp .env.example .env
# Edita .env con tus valores reales (ver sección de abajo)

# 5. Variables de entorno del frontend (opcional, tiene fallbacks)
# Crea home-frontend/.env con VITE_API_URL, VITE_GOOGLE_CLIENT_ID, VITE_FACEBOOK_APP_ID

# 6. Base de datos
#   Opción A (recomendada): usa Supabase, solo configura DATABASE_URL en .env
#   Opción B: Postgres local
psql -U postgres -c "CREATE DATABASE home_db;"
npm run db:migrate   # crea las tablas a partir de src/db/migrations/

# 7. Poblar datos de prueba (usuarios + catálogo de servicios)
npm run seed
```

## Cómo ejecutar backend, frontend y mobile

**Backend** (raíz) — puerto `3000` por defecto:
```bash
npm run dev      # con nodemon (recarga automática)
npm start        # sin recarga (producción)
```

**Frontend web** — puerto `5173`, con proxy automático de `/api` hacia `localhost:3000` (ver `home-frontend/vite.config.js`):
```bash
cd home-frontend
npm run dev
```

**Mobile** — Metro bundler en `localhost:8081`:
```bash
cd home-mobile
npm start            # abre el menú de Expo (QR para Expo Dev Client)
npm run android       # build + run nativo Android (requiere Android SDK)
npm run ios           # build + run nativo iOS (requiere Xcode)
npm run web           # corre la app móvil en el navegador
```

> La app móvil **no usa Expo Go** (usa `expo-dev-client` porque depende de módulos nativos como Google Sign-In). Necesitas un development build instalado en el dispositivo/emulador, generado con `eas build --profile development` o `expo run:android` / `expo run:ios`.

## Variables de entorno

### Backend (`.env` en la raíz — ver plantilla en `.env.example`)

| Variable | Para qué sirve |
|---|---|
| `PORT` | Puerto del servidor HTTP (default `3000`). |
| `NODE_ENV` | `development` \| `production` \| `test`. Afecta CORS, rate limiting y logging. |
| `DATABASE_URL` | Cadena de conexión completa a Postgres (Supabase Session Pooler recomendado). Si se define, tiene prioridad sobre `DB_*`. |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Conexión a Postgres local, usada solo si `DATABASE_URL` está vacío. **`DB_PASSWORD` es obligatoria** si no usas `DATABASE_URL`. |
| `SUPABASE_URL`, `SUPABASE_KEY` | Cliente de Supabase (Storage/Auth) usado por el backend, aparte de la conexión SQL directa. |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | Conexión a Redis. Si Redis no responde, el servidor sigue arrancando en modo degradado. |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Firman el access y el refresh token respectivamente. **Obligatorias, mínimo 32 caracteres, deben ser distintas entre sí.** El servidor rehúsa arrancar si faltan o son cortas. |
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Duración de los tokens (default `15m` / `30d`). |
| `FRONTEND_URL` | Orígenes permitidos por CORS en producción (separados por coma si son varios). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_IOS_CLIENT_ID` | Client IDs de Google usados para **verificar** el ID token que llega del frontend/app (login con Google). |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | Verifican el access token de Facebook Login vía Graph API. |
| `APPLE_CLIENT_ID` | Bundle ID / Services ID aceptados como `aud` del identity token de Sign in with Apple (puede llevar varios separados por coma). |
| `WOMPI_API_URL`, `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET` | Integración con la pasarela de pagos Wompi (sandbox/producción). |

*(Nunca subas `.env` a git — ya está en `.gitignore`. Los valores de ejemplo arriba son solo nombres y su propósito, no credenciales reales.)*

### Frontend (`home-frontend/.env`)

| Variable | Para qué sirve |
|---|---|
| `VITE_API_URL` | URL base usada por el socket de chat (`useChat.js`). Las llamadas REST usan `/api` relativo + proxy de Vite, no dependen de esta variable. |
| `VITE_GOOGLE_CLIENT_ID` | Client ID de Google para el botón de login (`@react-oauth/google`). |
| `VITE_FACEBOOK_APP_ID` | App ID de Facebook para el login social. |

Solo las variables con prefijo `VITE_` se exponen al navegador — nunca pongas secretos de servidor aquí.

### Mobile (`home-mobile/.env`, opcional)

| Variable | Para qué sirve |
|---|---|
| `EXPO_PUBLIC_API_URL` | URL base del backend (REST + socket). Si no se define, cae al fallback hardcodeado en `src/services/api.js` (una IP de LAN de ejemplo) — **para probar en un dispositivo físico necesitas configurar esta variable con la IP real de tu máquina**. |

## Cómo ejecutar pruebas

```bash
# Backend — Jest + Supertest, con mocks (no requiere base de datos real)
npm test
```

Frontend y mobile no tienen suite de pruebas automatizadas todavía (ver [Roadmap](docs/roadmap.md)).

## Cómo compilar

**Frontend web** (genera `home-frontend/dist/`):
```bash
cd home-frontend
npm run build
npm run preview   # sirve el build localmente para verificar
```

**Mobile** — se compila en la nube con **EAS Build** (perfiles definidos en `home-mobile/eas.json`):
```bash
cd home-mobile
npx eas build --profile development   # build de desarrollo (dev client)
npx eas build --profile preview        # build interno para QA
npx eas build --profile production     # build de producción
```

**Backend**: no requiere build, corre directo con Node (`npm start`).

## Solución de problemas comunes

| Problema | Causa probable | Solución |
|---|---|---|
| El backend se cierra al arrancar con "Variables de entorno faltantes" | Falta `.env` o le faltan `JWT_SECRET`, `JWT_REFRESH_SECRET` o `DB_PASSWORD` | `cp .env.example .env` y complétalo. Los dos JWT deben tener ≥32 caracteres y ser distintos entre sí. |
| `❌ Error PostgreSQL` al arrancar | `DATABASE_URL`/`DB_*` incorrectos, o la IP no está permitida en Supabase | Verifica la cadena de conexión y que uses el **Session Pooler** de Supabase (IPv4) en `DATABASE_URL`. |
| El logout no invalida el token / las sesiones no se revocan | Redis no está corriendo | Instala/arranca Redis local (`brew services start redis` en macOS) o configura `REDIS_HOST`/`REDIS_PORT` hacia una instancia real. El servidor arranca igual sin Redis, pero degradado (ver `src/config/redis.js`). |
| El frontend no encuentra el backend (`ERR_CONNECTION_REFUSED` en `/api/...`) | El backend no está corriendo en el puerto 3000, o cambiaste `PORT` sin actualizar el proxy de Vite | Revisa `home-frontend/vite.config.js` → `server.proxy['/api'].target`. |
| La app móvil no conecta al backend desde un dispositivo físico | El fallback hardcodeado de IP en `src/services/api.js` no coincide con la IP real de tu red | Crea `home-mobile/.env` con `EXPO_PUBLIC_API_URL=http://TU_IP_LOCAL:3000/api`. Desde un simulador/emulador en la misma Mac, usa `http://localhost:3000/api` (Android emulator: `http://10.0.2.2:3000/api`). |
| Login con Google/Facebook/Apple falla silenciosamente | Faltan `GOOGLE_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID`, `FACEBOOK_APP_ID`/`SECRET` o `APPLE_CLIENT_ID` en el backend | Revisa que las credenciales OAuth estén configuradas tanto en el backend (verificación) como en el cliente correspondiente (frontend/mobile). |
| `expo-doctor` marca un mismatch de versión de `expo` | Se publicó un patch nuevo del SDK después de generar el lockfile | No es crítico. No actualices por tu cuenta si el equipo mantiene versiones fijas — sincronízalo deliberadamente cuando corresponda. |
| `npm install` tira warnings de `allow-scripts` (fsevents, esbuild) | Comportamiento nuevo de npm que revisa scripts de instalación | Es informativo, no bloquea la instalación. Ver `npm approve-scripts` si quieres silenciarlo. |

---

Documentación técnica completa: [`docs/architecture.md`](docs/architecture.md) · [`docs/backend.md`](docs/backend.md) · [`docs/frontend.md`](docs/frontend.md) · [`docs/mobile.md`](docs/mobile.md) · [`docs/database.md`](docs/database.md) · [`docs/authentication.md`](docs/authentication.md) · [`docs/realtime-chat.md`](docs/realtime-chat.md) · [`docs/deployment.md`](docs/deployment.md) · [`docs/quality-report.md`](docs/quality-report.md) · [`docs/roadmap.md`](docs/roadmap.md)
