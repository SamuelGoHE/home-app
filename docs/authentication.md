# Autenticación

Esquema de **access + refresh token** (JWT, `HS256`) con revocación real vía Redis, más login social (Google, Facebook, Apple) verificado del lado del servidor.

## Access token vs. Refresh token

| | Access token | Refresh token |
|---|---|---|
| Duración | 15 min (`JWT_EXPIRES_IN`) | 30 días (`JWT_REFRESH_EXPIRES_IN`) |
| Firmado con | `JWT_SECRET` | `JWT_REFRESH_SECRET` (secreto **distinto**) |
| Payload | `{ userId, role, jti }` | `{ userId, role, jti }` |
| Uso | Header `Authorization: Bearer <token>` en cada request | Solo se envía a `POST /api/auth/refresh` y `POST /api/auth/logout` |
| Se revoca vía | Blacklist en Redis por `jti` (hasta que expira naturalmente) | Se borra la clave `refresh_token:{userId}:{jti}` de Redis |

Cada token lleva su propio `jti` (UUID v4) único — **no es el mismo `jti` en ambos tokens de un par**, así que el logout puede revocar el access token (blacklist) y el refresh token (borrado) de forma independiente. Esto permite además que **cada dispositivo/sesión tenga su propio refresh token** en Redis (clave `refresh_token:{userId}:{jti}`), habilitando "cerrar sesión en este dispositivo" sin afectar los demás.

## Flujo completo

```
1. POST /api/auth/login { email, password }
   → valida contraseña (bcrypt), chequea bloqueo por intentos fallidos (Redis)
   → genera { accessToken, refreshToken }, guarda el refresh en Redis
   → responde { user, accessToken, refreshToken }

2. Cliente guarda ambos tokens (localStorage en web, AsyncStorage en mobile)
   y envía accessToken en cada request: Authorization: Bearer <accessToken>

3. Middleware `authenticate` (src/middlewares/auth.js) en cada ruta protegida:
   a. Verifica firma + expiración del JWT
   b. Verifica que el jti NO esté en la blacklist de Redis
   c. Carga el User real de la base de datos y verifica is_active
   → si todo pasa, agrega req.user / req.token / req.tokenJti

4. Cuando el accessToken expira (401 { code: 'TOKEN_EXPIRED' }):
   POST /api/auth/refresh { refreshToken }
   → verifica firma del refresh, verifica que su jti siga en Redis (no revocado)
   → ROTACIÓN: borra el refresh viejo, genera y guarda un par nuevo
   → responde { user, accessToken, refreshToken } nuevos

5. POST /api/auth/logout (requiere accessToken vigente + refreshToken en el body)
   → blacklist del access token por el tiempo que le quedaba de vida
   → borra el refresh token de esta sesión en Redis
   (existe también logoutAllDevices en authService, usado tras cambio de contraseña,
    que revoca TODAS las sesiones del usuario vía SCAN sobre refresh_token:{userId}:*)
```

## Protección de fuerza bruta en login

Dos capas independientes:
1. **Por IP** (`rateLimiter.js` → `loginLimiter`): 20 intentos/15min en producción. Protege contra scraping/scanning masivo, pero es permisivo porque IPs compartidas (NAT corporativo) no deben bloquear a usuarios legítimos.
2. **Por email** (`authService.login`): contador en Redis (`login_fails:{email}`), bloquea la cuenta específica tras **5 fallos en 15 minutos**, independiente de la IP del atacante. Esta es la protección real por cuenta. Se resetea automáticamente en un login exitoso.

Si Redis está caído, la capa por email se salta (fail-open) mientras que la capa por IP sigue activa vía `express-rate-limit` (que no depende de Redis en este proyecto, corre en memoria del proceso).

## Comportamiento cuando Redis no está disponible

El proyecto está diseñado para **no caerse** si Redis no responde (`src/config/redis.js`: `disableOfflineQueue: true`, timeout de conexión de 3s, reintentos con backoff). El efecto práctico según la operación:

| Operación | Si Redis está caído |
|---|---|
| Login | Se salta el conteo de intentos fallidos por email (solo queda la protección por IP) |
| Verificar blacklist (`isTokenBlacklisted`) | Devuelve `false` — **un token recién revocado seguiría siendo válido** hasta que Redis vuelva |
| Verificar refresh token (`isRefreshTokenValid`) | Devuelve `true` — **fail-open deliberado**: se prefiere no desloguear a todos los usuarios por un corte de Redis, a costa de no poder revocar sesiones mientras Redis está caído |
| Guardar/revocar refresh token | Falla silenciosamente (`catch {}`) |

Es una decisión de diseño explícita (documentada en comentarios del propio código): disponibilidad por encima de revocación estricta durante una caída de Redis. Vale la pena tenerlo en cuenta como riesgo de seguridad aceptado — ver [`quality-report.md`](quality-report.md).

## Login social (OAuth)

`src/utils/verifyOAuthToken.js` — el backend **nunca confía en los datos que manda el cliente**, siempre verifica el token contra el proveedor:

- **Google** (`verifyGoogleToken`): si el token tiene forma de JWT, se verifica su firma con `google-auth-library` contra `GOOGLE_CLIENT_ID` **o** `GOOGLE_IOS_CLIENT_ID` (Android/web usan el cliente Web como audience; iOS usa el cliente iOS). Si es un access token plano, se valida contra `oauth2.googleapis.com/tokeninfo` y se pide el perfil a `googleapis.com/oauth2/v3/userinfo`.
- **Facebook** (`verifyFacebookToken`): valida el access token contra `graph.facebook.com/debug_token` usando el app token (`FACEBOOK_APP_ID|FACEBOOK_APP_SECRET`), confirma que el `app_id` coincide, y luego pide el perfil a la Graph API.
- **Apple** (`verifyAppleToken`): el más elaborado — descarga y cachea (24h) las claves públicas JWK de `appleid.apple.com/auth/keys`, verifica la firma RS256 del `identityToken` con la clave correspondiente al `kid` del header, y valida `iss`/`aud`. El nombre solo lo manda Apple en el primer login (vía el cliente, no en el token en logins posteriores), por eso se acepta un `fallbackProfile.name` opcional.

`authService.oauthSignIn(provider, token, fallbackProfile)`: busca un usuario existente por `(oauth_provider, oauth_id)`; si no existe, intenta emparejar por email (vincula la cuenta local existente al proveedor OAuth); si tampoco existe, crea un usuario nuevo con `role: 'cliente'` por defecto y `is_verified: true`.

## Autenticación de Socket.io

El handshake de conexión WebSocket exige el mismo access token JWT (`socket.handshake.auth.token` o header `Authorization`), lo verifica igual que el middleware REST (firma + blacklist + usuario activo), y **deriva `socket.userId`/`socket.userRole` del token** — nunca del payload que manda el cliente. Antes de este esquema (ver commit de seguridad en el historial de git) cualquiera podía conectarse sin token y suplantar el `senderId` de un mensaje; ahora la conexión se rechaza sin token válido y todo evento usa la identidad ya verificada del socket. Detalle en [`realtime-chat.md`](realtime-chat.md).

## Cambio y recuperación de contraseña

- **Cambio de contraseña autenticado** (`PATCH /api/users/me/password`): valida complejidad (8+ caracteres, mayúscula, minúscula, número) y la contraseña actual, y **revoca todas las sesiones activas** del usuario tras el cambio (fuerza a volver a loguearse en todos los dispositivos).
- **Recuperación por email** (`forgot-password` / `reset-password`): genera un token aleatorio de 32 bytes con expiración de 1 hora. En `NODE_ENV=development` el token se devuelve directo en la respuesta (para poder probarlo sin servidor de correo). En producción, el envío por email vía `nodemailer` **está pendiente de implementar** (hay un `TODO` explícito en `authService.js`) — hoy en producción el flujo genera el token pero no hay forma de que el usuario lo reciba. Ver [`roadmap.md`](roadmap.md).
- La respuesta de `forgot-password` es **idéntica exista o no el email** registrado, deliberadamente, para no permitir enumeración de usuarios.
