# Chat y tiempo real (Socket.io)

El servidor Socket.io se monta sobre el mismo `httpServer` HTTP que Express (`src/index.js`), así que backend REST y WebSocket comparten puerto (`PORT`, default `3000`).

## Autenticación del handshake

```js
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
  if (!token) return next(new Error('No autenticado'));
  const decoded = verifyAccessToken(token);              // firma + expiración
  if (await isTokenBlacklisted(decoded.jti)) return next(new Error('Token inválido'));
  const user = await User.findByPk(decoded.userId);
  if (!user || !user.is_active) return next(new Error('Usuario no válido'));
  socket.userId = user.id;
  socket.userRole = user.role;
  next();
});
```

Sin `token` válido, la conexión se rechaza en el handshake (verificado en pruebas reales: conectar sin token responde con el error `"No autenticado"` y no se establece el socket). Cada evento posterior usa `socket.userId`/`socket.userRole` — **nunca un id que mande el cliente en el payload del evento**, evitando que un cliente pueda enviar mensajes suplantando a otro usuario.

## Salas (rooms)

- **Sala personal** `user:{userId}` — el socket se une automáticamente al conectar. Se usa para notificaciones dirigidas a un usuario específico (nueva solicitud, solicitud aceptada/rechazada) sin necesidad de que el cliente pida unirse.
- **Sala de proyecto** `{projectId}` — el cliente debe pedir unirse explícitamente con el evento `join_room`. El servidor valida con `canAccessProject(userId, role, projectId)` que quien pide unirse sea el cliente dueño, el trabajador asignado, o un admin, antes de aceptar el `socket.join()`.

## Eventos

| Evento | Dirección | Payload | Descripción |
|---|---|---|---|
| `join_room` | cliente → servidor | `roomId` (= `projectId`) | Une el socket a la sala del proyecto, si tiene acceso. Si no, responde `error_message`. |
| `send_message` | cliente → servidor | `{ roomId, text }` | Valida acceso al proyecto, persiste el mensaje (`Message.create`) y lo re-emite a toda la sala. |
| `new_message` | servidor → sala del proyecto | `{ id, projectId, senderId, text, createdAt }` | Emitido tras `send_message`. `senderId` viene del socket autenticado, no del payload entrante. |
| `new_service_request` | servidor → `user:{workerId}` | `{ quoteId/id, clientId, clientName, city, address, message }` | Emitido al crear una `Quote` dirigida a un trabajador (`createQuote` en `projectService`/`projectController`). |
| `request_response` | servidor → `user:{clientId}` | `{ type: 'aceptada'\|'rechazada', quoteId, projectId?, workerName, message }` | Emitido cuando el trabajador acepta/rechaza una solicitud (`updateQuoteStatus`). |
| `error_message` | servidor → cliente | `{ message }` | Acceso denegado a una sala o error al enviar. |

## Persistencia del historial

El chat **sí persiste** en Postgres (`Message` model, tabla `messages`) — no es solo en memoria. El historial se recupera vía REST, no por socket: `GET /api/messages/:projectId` (`routes/messages.js`), que aplica la misma regla de acceso (cliente/trabajador del proyecto o admin) y devuelve los mensajes ordenados por fecha con el remitente incluido (`id, name, avatar`).

Patrón de uso típico en los clientes: al entrar a la pantalla de chat, se hace `GET /api/messages/:projectId` para el historial, y en paralelo se conecta el socket y se emite `join_room` para recibir mensajes nuevos en vivo.

## Notificaciones (no son un sistema separado)

No existe un módulo de "notificaciones" dedicado en el backend ni una tabla `notifications`. Lo que la UI muestra como notificaciones (`useNotifications.js`, en frontend y mobile) se **calcula del lado del cliente** a partir de datos que ya se piden por REST (`GET /api/quotes/me`, `GET /api/projects`) — por ejemplo, una cotización con `status: 'solicitud_pendiente'` se traduce a una notificación "Solicitud enviada ⏳". El mobile además hace *polling* cada 10 segundos sobre esos mismos endpoints; el frontend web no hace polling (se apoya en los eventos de Socket.io / recarga de la pantalla). Ver riesgos de esta aproximación en [`quality-report.md`](quality-report.md).

## Campo `read` sin usar

El modelo `Message` tiene una columna `read` (boolean, default `false`) pensada para marcar mensajes como leídos, pero **ningún endpoint ni evento de socket la actualiza actualmente** — queda siempre en `false`. Es un campo preparado para una funcionalidad de "visto" que no se terminó de implementar (ver [`roadmap.md`](roadmap.md)).

## Reconexión y estado de conexión

Ni el frontend ni el mobile implementan lógica explícita de manejo de reconexión más allá del comportamiento por defecto de `socket.io-client` (reintentos automáticos). No hay indicador visual de "reconectando" ni cola de mensajes offline — un mensaje enviado mientras el socket está desconectado se pierde silenciosamente del lado del cliente (no hay ack ni retry). Ver [`roadmap.md`](roadmap.md).
