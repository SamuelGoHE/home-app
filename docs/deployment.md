# Despliegue

**Estado actual: no hay ninguna configuración de despliegue en el repositorio.** No existe `Dockerfile`, `docker-compose.yml`, `render.yaml`, `vercel.json`, `railway.json`, `Procfile`, ni workflows de CI/CD (`.github/workflows/`). Este documento describe qué necesita cada parte para desplegarse y qué falta decidir — no describe un pipeline existente.

## Backend

Es una app Node/Express estándar sin build step (`npm start` → `node src/index.js`). Se puede desplegar en cualquier plataforma que soporte procesos Node de larga duración con WebSocket (Socket.io necesita conexión persistente, así que **no sirve un entorno serverless de request/response corto** como Vercel Functions o AWS Lambda clásico sin adaptar):

- Plataformas compatibles tal cual: Railway, Render, Fly.io, un VPS con PM2, Heroku (clásico).
- Requiere configurar como variables de entorno del hosting **todas** las listadas en el [README](../README.md#variables-de-entorno) — especialmente `DATABASE_URL` (Supabase), `JWT_SECRET`/`JWT_REFRESH_SECRET` (¡generar valores nuevos para producción, nunca reusar los de desarrollo!), y `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD` apuntando a una instancia real de Redis (ej. Upstash, Redis Cloud, o el add-on del propio hosting).
- `NODE_ENV=production` es importante: cambia el comportamiento de CORS (restringe a `FRONTEND_URL` en vez de `origin: true`), el rate limiting (baja de 5000 a 100 req/15min) y el logging (`morgan combined` en vez de `dev`).
- **Redis es opcional para que el proceso arranque**, pero sin él el logout/blacklist de tokens no funciona de verdad (ver [`authentication.md`](authentication.md)) — no se recomienda desplegar a producción sin Redis real.
- Sequelize se conecta a Supabase con `ssl: { require: true, rejectUnauthorized: false }` — funciona, pero desactiva la verificación del certificado (ver riesgo de seguridad en [`quality-report.md`](quality-report.md)).

## Frontend web

`npm run build` genera un sitio estático en `home-frontend/dist/` (Vite) — se puede servir desde cualquier hosting estático (Vercel, Netlify, Cloudflare Pages, un bucket S3+CDN, o el propio Express del backend sirviendo el `dist/` como archivos estáticos).

Punto a decidir antes de desplegar: `services/api.js` usa `baseURL: '/api'` **relativo**, asumiendo que el frontend y el backend se sirven desde el mismo origen (o un reverse proxy que enrute `/api` al backend). Si se despliegan en dominios distintos (ej. frontend en Vercel, backend en Railway), hay que:
1. Cambiar `api.js` para usar una URL absoluta configurable (`VITE_API_URL` ya existe para el socket, pero las llamadas REST no la usan todavía), y
2. Configurar `FRONTEND_URL` en el backend con el dominio real del frontend para que CORS lo permita en producción.

Esto es una decisión de arquitectura pendiente, no algo que deba resolverse solo — ver [`roadmap.md`](roadmap.md).

## Mobile

Se compila y distribuye vía **EAS Build/Submit** (Expo Application Services), usando los perfiles ya definidos en `home-mobile/eas.json`:

```bash
npx eas build --profile production --platform ios
npx eas build --profile production --platform android
npx eas submit --platform ios       # sube a App Store Connect
npx eas submit --platform android    # sube a Google Play Console
```

Requiere una cuenta de Expo/EAS vinculada al proyecto y las credenciales de firma (Apple Distribution Certificate + Provisioning Profile; Android Keystore) — EAS puede generarlas y gestionarlas automáticamente la primera vez que se corre `eas build`. No hay evidencia en el repo de que estos builds de producción se hayan generado todavía (no hay credenciales, perfiles de firma ni historial de builds documentado).

`app.json` ya define `bundleIdentifier`/`package` (`com.samuelgomez.homeapp`) para ambas plataformas — pendiente: crear las apps correspondientes en App Store Connect y Google Play Console antes del primer submit.

## CI/CD (no existe todavía)

No hay ningún workflow que corra tests, lint o builds automáticamente en cada push/PR. Recomendación mínima antes de escalar el equipo (detalle priorizado en [`roadmap.md`](roadmap.md)):
1. Un workflow de GitHub Actions que corra `npm test` (backend) en cada PR.
2. Un workflow que corra `npm run build` del frontend para detectar errores de compilación antes de mergear.
3. Conectar `eas build` a CI (`eas build --auto-submit` en un trigger de tag/release) una vez el flujo de builds manuales esté validado.

## Checklist antes de un primer despliegue a producción

- [ ] Generar `JWT_SECRET`/`JWT_REFRESH_SECRET` nuevos y únicos para producción (nunca los de `.env` de desarrollo).
- [ ] Redis real y accesible desde el backend desplegado.
- [ ] Definir `FRONTEND_URL` con el/los dominios reales.
- [ ] Decidir la relación de dominios entre frontend/backend (mismo origen vs. `VITE_API_URL` absoluta + CORS).
- [ ] Configurar credenciales OAuth de producción (Google/Facebook/Apple) — las de desarrollo suelen tener restricciones de origen distintas.
- [ ] Configurar Wompi en modo producción (`WOMPI_API_URL=https://production.wompi.co/v1` + llaves de producción) — hoy todo apunta a sandbox.
- [ ] Implementar el envío real de emails (`nodemailer`, pendiente — ver [`authentication.md`](authentication.md)) antes de depender de recuperación de contraseña en producción.
