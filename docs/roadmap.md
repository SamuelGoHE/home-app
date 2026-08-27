# Roadmap hacia producción

Basado en el estado real del código verificado en esta auditoría (agosto 2026), no en la lista de features documentadas — algunas cosas que suenan implementadas (pagos, verificación de email) no tienen código detrás. Ver [`quality-report.md`](quality-report.md) para el detalle de cada hallazgo referenciado aquí.

## 🔴 Bloqueante — debe resolverse antes de publicar

Estas son cosas que, si se lanza sin resolverlas, generan un producto roto o inseguro para usuarios reales, no solo "incompleto":

1. **Envío real de emails** (recuperación de contraseña). Hoy el flujo genera el token pero nadie lo recibe fuera de `NODE_ENV=development`. Sin esto, cualquier usuario que olvide su contraseña queda bloqueado permanentemente.
2. **Redis en producción, real y monitoreado**. El sistema arranca sin él, pero el logout y la revocación de sesiones dejan de funcionar de verdad. No lanzar sin Redis gestionado (Upstash, Redis Cloud, etc.) con alertas si se cae.
3. **Secretos de producción generados desde cero**. `JWT_SECRET`/`JWT_REFRESH_SECRET` y credenciales OAuth de producción, nunca reusar los valores de desarrollo/`.env.example`.
4. **Decisión y configuración de Wompi**, si el modelo de negocio depende de cobrar dentro de la app: hoy no hay ningún código de pagos, solo variables de entorno sin usar. O se implementa el flujo completo (checkout + webhook de confirmación + estado de pago en `Project`/`Quote`), o se retira temporalmente la promesa de pagos in-app del producto.
5. **Monitoreo de errores en producción** (Sentry o equivalente, al menos en el backend). Sin esto, un fallo en producción solo se detecta cuando un usuario se queja.
6. **CORS y dominios de producción configurados** (`FRONTEND_URL`), y decidir la relación de dominios entre frontend y backend (ver [`deployment.md`](deployment.md)) antes de desplegar en hosts separados.

## 🟠 Alta prioridad — funcionalidades esperables para un lanzamiento serio

No rompen el producto si faltan el día 1, pero un usuario las va a extrañar rápido o el equipo las va a necesitar para operar con confianza:

7. **Verificación de email**. El campo y el token ya existen (`is_verified`, `verification_token`) — falta el endpoint que los consuma y el email que lo dispare (depende del punto 1).
8. **Tests automatizados más allá de 2 servicios**. Backend: cubrir `quoteService`/la lógica de quotes real en `projectService`, `taskService`, `ratingService`, `serviceService`. Frontend y mobile: al menos smoke tests de los flujos críticos (login, crear cotización, chat).
9. **CI mínimo** (GitHub Actions): correr tests + build en cada PR, antes de que el equipo crezca y los merges rotos empiecen a colarse.
10. **Paginación** en listados que van a crecer sin límite (`/api/projects`, `/api/quotes`, `/api/users`, `/api/ratings`, `/api/users/workers`).
11. **Rate limiting específico por usuario** en creación de recursos (cotizaciones, ratings, proyectos), no solo por IP.
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
