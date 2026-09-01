# Roadmap hacia producción

Basado en el estado real del código verificado en esta auditoría (agosto 2026), no en la lista de features documentadas — algunas cosas que suenan implementadas (pagos, verificación de email) no tienen código detrás. Ver [`quality-report.md`](quality-report.md) para el detalle de cada hallazgo referenciado aquí.

> **Actualización 31-ago-2026:** los bloqueantes de *código* están cerrados. Pagos Wompi (checkout + payouts + reembolsos), envío real de emails, verificación de correo y monitoreo con Sentry ya están implementados y con tests. Lo que queda bloqueante es **puramente operativo** (Redis gestionado, secretos de producción, CORS/dominios). Ver el detalle abajo.

## 🔴 Bloqueante — debe resolverse antes de publicar

Estas son cosas que, si se lanza sin resolverlas, generan un producto roto o inseguro para usuarios reales, no solo "incompleto":

1. ✅ **Envío real de emails** (recuperación de contraseña). Implementado en `emailService.js` (nodemailer) con degradación elegante sin SMTP. Falta solo configurar credenciales SMTP reales en producción.
2. **Redis en producción, real y monitoreado**. El sistema arranca sin él, pero el logout y la revocación de sesiones dejan de funcionar de verdad. No lanzar sin Redis gestionado (Upstash, Redis Cloud, etc.) con alertas si se cae. — *operativo, pendiente*
3. **Secretos de producción generados desde cero**. `JWT_SECRET`/`JWT_REFRESH_SECRET` y credenciales OAuth de producción, nunca reusar los valores de desarrollo/`.env.example`. — *operativo, pendiente*
4. ✅ **Wompi (pagos)**. Flujo completo implementado: pago inicial 20% vía Payment Links, pago final 80%, payouts a trabajadores, reembolsos por cancelación, panel de Finanzas y rol `admin_finanzas`. Falta solo cambiar a llaves de producción.
5. ✅ **Monitoreo de errores en producción** (Sentry). Implementado en `instrument.js` + `errorHandler` (captura 5xx) + handlers globales. Falta solo configurar `SENTRY_DSN` de producción.
6. **CORS y dominios de producción configurados** (`FRONTEND_URL`), y decidir la relación de dominios entre frontend y backend (ver [`deployment.md`](deployment.md)) antes de desplegar en hosts separados. — *operativo, pendiente*

## 🟠 Alta prioridad — funcionalidades esperables para un lanzamiento serio

No rompen el producto si faltan el día 1, pero un usuario las va a extrañar rápido o el equipo las va a necesitar para operar con confianza:

7. ✅ **Verificación de email**. Implementada: `GET /api/auth/verify-email` consume el `verification_token`, el registro dispara el correo. Marca `is_verified` y redirige al frontend.
8. **Tests automatizados más allá de 2 servicios**. Backend: buen avance (10 suites, 102 tests — cubren pagos, payouts, reembolsos, createQuote, verifyEmail). Pendiente: `taskService`, `ratingService`, `serviceService`, y subir cobertura de `authService`/`projectService`. Frontend y mobile: aún sin smoke tests de flujos críticos (login, crear cotización, chat).
9. **CI mínimo** (GitHub Actions): correr tests + build en cada PR, antes de que el equipo crezca y los merges rotos empiecen a colarse.
10. **Paginación** en listados que van a crecer sin límite (`/api/projects`, `/api/quotes`, `/api/users`, `/api/ratings`, `/api/users/workers`). — *Backend ✅ (rama `feat/pagination`)*: helper reutilizable `utils/pagination.js`, respuesta retrocompatible (`data` array + campo hermano `pagination: { page, pageSize, total, totalPages, hasNext, hasPrev }`), `pageSize` por defecto 20 (máx 100). Verificado read-only contra la DB. **Consumidores ✅:** mobile — scroll infinito real en la búsqueda de trabajadores (hook `useInfiniteFetch` + `FlatList onEndReached` en `ResultsScreen`); el resto de listas mobile/web que combinan fuentes o calculan stats/filtros client-side (Proyectos, dashboards worker/admin) piden un page grande acotado (`pageSize:100`) para preservar la UX y las estadísticas sin fetch ilimitado. **Pendiente (futuro, no beta):** cuando alguna lista supere ~100 filas, migrar el panel admin a controles de página server-side con stats por conteo.
11. ✅ **Rate limiting específico por usuario** en creación de recursos (cotizaciones, ratings, proyectos), no solo por IP. Fábrica `createPerUserLimiter` en `middlewares/rateLimiter.js` (clave = `req.user.id`, fallback IP), montada tras `authenticate` en `POST /api/quotes` (30/h), `POST /api/ratings` (20/h) y `POST /api/projects` (30/h). Topes relajados en dev/test. Cubierto con tests de integración (supertest): 429 al superar el máximo y contadores independientes por usuario.
12. **Limpiar el código muerto** (`quoteService.js`, exports sin usar de `services/index.js` en ambos clientes, dependencias sin usar) — antes de que un desarrollador nuevo pierda tiempo entendiendo lógica que no corre.
13. **Resolver la duplicación quotes/services/tasks** entre `projectService` y los servicios dedicados — es la deuda técnica con más riesgo de causar un bug real si alguien edita el archivo equivocado.

## 🟡 Media prioridad — mejora la calidad pero no bloquea el lanzamiento

14. **Extraer código compartido entre frontend y mobile** (`useApi`, `authStore`, `favorites`) a un paquete común — reduce el riesgo de que ambos clientes diverjan silenciosamente.
15. **Indicador de "escribiendo..." / estado de conexión en el chat**, y manejo explícito de reconexión de Socket.io (hoy un mensaje enviado offline se pierde sin aviso).
16. **Campo `read` de mensajes**: implementar el "visto" ya que el campo existe en el modelo pero ningún endpoint lo actualiza.
17. **Optimizar el recálculo de rating** (`ratingService.createRating`) con una agregación SQL en vez de traer todas las filas a memoria.
18. **Uniformar el patrón de capas del backend** (mover la lógica de `routes/users.js` a un service dedicado).

## 🟢 Opcional — vale la pena pero no urgente

19. Convención de nombres consistente en `home-mobile/src/screens/` (cosmético, no afecta funcionamiento).
20. `.gitattributes` (ya agregado en esta sesión) y `.gitignore` de IDEs (`.vscode/`, `.idea/`).
21. Mover `activate_users.js` a una carpeta `scripts/` documentada, o retirarlo si ya no se usa.
22. Revisar si `GET /api/workers` (sin consumidores hoy) se puede eliminar a favor de `GET /api/users/workers`.
23. Explorar reemplazar el fetching manual de `useApi.js` por una librería de cache de datos (React Query/SWR) si el volumen de pantallas sigue creciendo — hoy cada hook gestiona su propio estado sin compartir cache.

## Qué SÍ está listo hoy

Vale la pena decirlo también: la base de autenticación (JWT + revocación real vía Redis + OAuth verificado server-side), el modelo de datos, el flujo completo cotización→proyecto→tareas→calificación, y el chat en tiempo real con control de acceso por sala, están **implementados correctamente y verificados funcionando end-to-end** en esta sesión (ver el informe de validación de entorno de la conversación anterior). El roadmap de arriba es sobre lo que falta para *escalar* y *lanzar con confianza*, no sobre reescribir lo que ya funciona.
