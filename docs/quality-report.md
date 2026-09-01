# Reporte de calidad

Auditoría de código estático — **no se modificó ningún archivo de código** para producir este reporte. Cada hallazgo fue verificado leyendo el código real y/o con búsquedas (`grep`), no son suposiciones. Fecha: agosto 2026.

## Deuda técnica

### 1. Dos implementaciones paralelas de negocio para quotes/services/tasks
`routes/projects.js` se monta como catch-all (`app.use('/api', projectRoutes)`) *después* de `routes/quotes.js`, `routes/services.js` y `routes/tasks.js`. Como Express resuelve por orden de registro, hay rutas duplicadas dentro de `projectRoutes` que **nunca se ejecutan** porque el router específico ya respondió antes. Detalle completo con tabla ruta-por-ruta en [`backend.md`](backend.md#duplicación-de-rutas-quotesservicestasks). Riesgo concreto: un desarrollador que edite `projectService.updateTask` pensando que ahí vive la lógica de actualizar tareas no vería ningún efecto (la ruta real usa `taskService.updateTaskStatus`, una copia casi idéntica mantenida aparte).

### 2. Archivo completamente muerto: `src/services/quoteService.js`
Nadie lo importa (verificado por grep en todo `src/`). El controller de quotes (`quoteController.js`) delega a `projectService`, no a `quoteService`. Es una clase completa (`QuoteService`) sin ninguna referencia externa.

### 3. Código muerto en frontend y mobile: `services/index.js`
En **ambos** clientes, `workerApi`, `serviceApi`, `quoteApi` y `projectApi` (exportados desde `services/index.js`) no los importa ningún componente — solo `authService` del mismo archivo se usa. Peor aún: algunos de esos endpoints muertos apuntan a rutas que **no existen** en el backend (`/workers/popular`, `/services/search`) — si alguna vez alguien los conecta a un componente, fallarán en producción con un 404 silencioso hasta que se note.

### 4. Duplicación de lógica entre frontend web y mobile
No hay ningún paquete compartido entre `home-frontend` y `home-mobile`. Verificado con `diff`:
- `hooks/useApi.js` — **idéntico byte a byte** en ambos.
- `context/authStore.js`, `services/api.js`, `utils/favorites.js` — misma lógica, solo cambia la capa de storage (`localStorage` vs `AsyncStorage`).

Esto significa que **cada bug fix o cambio de lógica de negocio en estos archivos hay que aplicarlo a mano dos veces**. Ya hay evidencia de que empiezan a divergir (mobile tiene `needsWorkerOnboarding` que el web no tiene).

### 5. Inconsistencia arquitectónica: no todas las rutas usan capa de `service`
`routes/users.js` (11 endpoints) tiene toda su lógica escrita directo en el router, sin pasar por `src/services/`. `routes/ratings.js` mezcla ambos estilos (algunos endpoints llaman a `ratingService`, el de `GET /my` tiene la query inline). El resto del proyecto sí separa router/controller/service. No es un bug, pero dificulta saber dónde buscar la lógica de negocio de un endpoint dado.

### 6. Convención de nombres inconsistente en pantallas mobile
`home-mobile/src/screens/` mezcla PascalCase estricto (`HomeScreen.js`, `WorkerHomeScreen.js`) con nombres casi todo en minúscula (`Workerdetailscreen.js`, `Myratingscreen.js`, `Profileeditscreen.js`, `Helpcenterscreen.js`, `Appsettingsscreen.js`, `Projectsscreen.js`, `Projectdetailscreen.js`, `Calendarscreen.js`, `Chatscreen.js`, `Ratingscreen.js`, `Securityscreen.js`). Los imports en `App.js` coinciden exactamente con estos nombres (no hay bug de funcionamiento — se verificó que Metro bundlea sin error), pero es puramente cosmético y confunde a un desarrollador nuevo buscando un archivo.

### 7. Script administrativo suelto sin documentar
~~`activate_users.js` en la raíz del repo (activa a todos los usuarios en bloque)…~~ **Resuelto (sep-2026):** movido a `scripts/activate-users.js` con un encabezado que documenta su uso y alcance. Sigue sin validar permisos (es un script CLI con acceso directo a la DB, no un endpoint), lo cual es aceptable dado que requiere acceso al servidor/repo para ejecutarlo.

### 8. Endpoints duplicados con distinta implementación: lista de trabajadores
`GET /api/users/workers` (el que usan los clientes reales) y `GET /api/workers` (vía `projectService.getWorkers`, sin consumidores actuales) hacen lo mismo con código distinto. Candidato a eliminar el segundo.

## Código duplicado

Ver puntos 1, 2, 3 y 4 arriba — son, en esencia, todos casos de código duplicado o redundante. Resumen de impacto:

| Duplicación | Impacto | Recomendación |
|---|---|---|
| `quoteService.js` (muerto) | Ninguno en runtime; confunde a quien lo lea pensando que es la lógica activa | Eliminar el archivo |
| `projectService` vs `taskService`/`serviceService` | Código muerto + riesgo de editar el archivo equivocado | Eliminar las funciones/rutas duplicadas de `projectService`/`projectRoutes` que ya cubren los routers dedicados |
| `services/index.js` (frontend + mobile) | Confusión, endpoints inexistentes | Eliminar los exports no usados o completar los endpoints si se van a usar |
| `useApi.js`, `authStore.js`, `api.js`, `favorites.js` (frontend vs mobile) | Mantenimiento doble, riesgo de divergencia silenciosa | Extraer a un paquete compartido (`packages/shared-core` en un monorepo con workspaces, o un paquete npm privado) con una interfaz de storage inyectable |

## Posibles refactorizaciones

- **Extraer un paquete `@home/core` (o similar)** con `useApi`, la lógica de `authStore` (parametrizando el storage), `favorites` y los tipos/constantes de dominio (estados de `Quote`/`Project`/`Task`), consumido por ambos clientes vía npm workspaces. Es el cambio de mayor apalancamiento para reducir deuda técnica futura.
- **Unificar el patrón de capas del backend**: mover la lógica de `routes/users.js` a un `userService.js`, y decidir de una vez si `projectService.js` sigue siendo el dueño de proyectos/tareas/workers, o si se termina de migrar todo a los servicios dedicados (`taskService`, `serviceService`, y un `quoteService` real esta vez).
- **Paginación** en los endpoints de listado (`GET /api/projects`, `/api/quotes`, `/api/users`, `/api/ratings`, `/api/users/workers`) — hoy todos devuelven la tabla completa sin límite. Con pocos usuarios no se nota; es un problema cuando la base de datos crezca.
- **`ratingService.createRating`** recalcula el promedio recorriendo *todas* las calificaciones históricas del trabajador en cada nueva calificación (`Rating.findAll` + `reduce` en memoria). Con un trabajador con miles de reseñas esto se vuelve lento — se puede resolver con una query de agregación (`AVG`/`COUNT` en SQL, como ya se hace en `routes/users.js` para el listado de workers) en vez de traer todas las filas a Node.

## Riesgos para producción

| Riesgo | Detalle | Severidad |
|---|---|---|
| **Recuperación de contraseña incompleta** | El envío de emails vía `nodemailer` no está implementado (`TODO` explícito en `authService.js`). En producción, `forgot-password` genera el token pero el usuario nunca lo recibe — el flujo de "olvidé mi contraseña" no funciona hoy fuera de desarrollo. | Alto — bloquea una funcionalidad básica de cuenta |
| **No hay verificación de email** | El modelo tiene `is_verified`/`verification_token`, se generan en el registro, pero no existe ningún endpoint `GET /api/auth/verify-email` (o similar) que los consuma. Todo usuario queda con `is_verified: false` para siempre (excepto OAuth, que se marca verificado). | Medio — dato inconsistente, no bloquea uso pero rompe cualquier lógica futura que dependa de "email verificado" |
| **Pagos (Wompi) configurados pero no implementados** | Existen 5 variables de entorno de Wompi (`WOMPI_*`) en `.env.example`, pero **ninguna línea de código en `src/`, `home-frontend/src/` ni `home-mobile/src/` las usa**. No hay endpoint de checkout, ni webhook de confirmación, ni lógica de cobro. Si el negocio depende de cobrar a través de la app, esta es la brecha más grande. | Alto (si el modelo de negocio depende de pagos in-app) |
| **Sin paginación** | Ver arriba — riesgo de degradación de performance a medida que crecen `projects`/`quotes`/`users`. | Medio, crece con el tiempo |
| **Sin tests de integración ni CI** | Solo 2 de 6 servicios de backend tienen test (`authService`, `projectService`), ambos con mocks (no prueban contra una base de datos real ni las migraciones). Frontend y mobile no tienen ningún test automatizado. No hay workflow de CI que corra nada en cada PR. | Alto a mediano plazo — cada cambio depende de pruebas manuales |
| **Sin monitoreo/alerting** | No hay integración con ningún servicio de logging/error tracking (Sentry, Datadog, etc.) — los únicos logs son `console.log`/`morgan` a stdout. Sin acceso al servidor no hay forma de enterarse de errores en producción. | Alto para operar en producción con confianza |
| **`GOOGLE_IOS_CLIENT_ID`, `FACEBOOK_APP_ID/SECRET`, `APPLE_CLIENT_ID` sin configurar** | Verificado en el `.env` real de este entorno: faltan. Login con Apple/Facebook y verificación de Google en iOS quedan inactivos hasta configurarlos. | Medio |

## Riesgos de seguridad

| Riesgo | Detalle | Severidad |
|---|---|---|
| **Fail-open en Redis para revocación de tokens** | Si Redis está caído, `isTokenBlacklisted` devuelve `false` y `isRefreshTokenValid` devuelve `true` (por diseño, documentado en el propio código). Es una decisión consciente de disponibilidad sobre seguridad estricta, pero significa que **un token revocado (logout, cambio de contraseña) sigue siendo válido mientras Redis esté caído**. Ver [`authentication.md`](authentication.md#comportamiento-cuando-redis-no-está-disponible). | Medio — ventana de exposición acotada a incidentes de Redis |
| **`rejectUnauthorized: false` en la conexión SSL a Postgres** | `src/config/database.js` y `config.js` desactivan la verificación del certificado TLS al conectar a Supabase. Es una configuración común para el pooler de Supabase, pero técnicamente abre una ventana teórica a un ataque de intermediario si la red no es confiable. | Bajo (mitigado por ser tráfico saliente a un proveedor conocido), pero vale la pena confirmar si Supabase ya soporta verificación estricta hoy. |
| **`routes/tasks.js` no aplica `authenticate` a nivel de archivo** | A diferencia de todos los demás archivos de rutas protegidas (que hacen `router.use(authenticate)` al inicio), `tasks.js` no lo hace explícitamente — la protección real depende de que `taskService.updateTaskStatus` reciba y valide `req.user`, que en la práctica requiere haber pasado por `authenticate` en otro punto. No se encontró una forma de explotarlo hoy, pero es un patrón inconsistente y frágil: un cambio futuro en esa ruta podría quedar sin protección sin que sea obvio en el archivo. | Medio — inconsistencia peligrosa, aunque no explotable hoy |
| **Ruta inexistente bajo `/api/*` responde 401 en vez de 404** | Por el catch-all de `projectRoutes` con `router.use(authenticate)` antes de intentar matchear. No filtra información sensible, pero es una superficie confusa para debugging y para cualquier scanner automatizado que intente mapear rutas válidas. | Bajo |
| **Sin rate limiting específico en creación de recursos** | `POST /api/quotes`, `POST /api/ratings`, `POST /api/projects` solo están cubiertos por el rate limit global (5000 req/15min en dev, 100 en producción, por IP) — no hay un límite específico por usuario autenticado. Un usuario legítimo pero malicioso podría spamear solicitudes de cotización a un trabajador. | Bajo-medio |
| **Passwords de prueba documentadas en el README** (`Admin1234`, `Worker1234`, `Cliente1234`) | Intencional y correcto para un entorno de desarrollo/demo, pero hay que asegurarse de que el seed **nunca se corra contra una base de datos de producción real** con esas credenciales conocidas públicamente. | Bajo si se gestiona con disciplina, alto si se corre `npm run seed` en producción por error |

## Mejoras recomendadas

- Eliminar o completar el código muerto identificado (`quoteService.js`, exports sin uso de `services/index.js` en ambos clientes, dependencias sin usar listadas en el reporte de validación anterior: `multer`, `@supabase/ssr` en backend; `@react-native-community/netinfo`, `expo-auth-session`, `react-native-get-random-values`, `react-native-reanimated`, `react-native-worklets` en mobile).
- Agregar un `.github/workflows/` mínimo que corra `npm test` del backend y `npm run build` del frontend en cada PR.
- Completar el envío de emails (`nodemailer`) para que "olvidé mi contraseña" funcione fuera de desarrollo.
- Decidir si Wompi se implementa pronto o se retiran esas variables de `.env.example` hasta que haya código que las use (evita confundir a quien configura el entorno pensando que los pagos ya funcionan).
- Agregar `.vscode/` e `.idea/` al `.gitignore` (hoy no están explícitamente ignoradas en ningún nivel; no hay ninguna trackeada actualmente, pero es fácil que alguien la suba sin querer).
