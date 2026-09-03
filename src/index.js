// Sentry primero de todo, antes de cargar Express/rutas (auto-instrumentación).
const Sentry = require('./instrument');

const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Red de seguridad final: cualquier promesa rechazada o excepción que se
// escape de toda la app se reporta antes de que el proceso muera.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
  Sentry.captureException?.(reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
  Sentry.captureException?.(err);
});

// ── Validar variables de entorno críticas antes de iniciar ──────────
// Si falta alguna el servidor no arranca, evitando fallos silenciosos.
const REQUIRED_ENV = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DB_PASSWORD'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`❌ Variables de entorno faltantes: ${missing.join(', ')}`);
  console.error('   Revisa tu archivo .env (copia de .env.example)');
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32 || process.env.JWT_REFRESH_SECRET.length < 32) {
  console.error('❌ JWT_SECRET y JWT_REFRESH_SECRET deben tener al menos 32 caracteres');
  process.exit(1);
}

const app = require('./app');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { Message, Project, User } = require('./models');
const messageService = require('./services/messageService');
const { verifyAccessToken, isTokenBlacklisted } = require('./utils/jwt');

const PORT = process.env.PORT || 3000;
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? (process.env.FRONTEND_URL || '').split(',').map(u => u.trim()).filter(Boolean)
      : true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.set('io', io);

// ── Autenticación del handshake de Socket.io ────────────────────────
// Sin esto, cualquiera podía conectarse, leer chats ajenos y suplantar
// usuarios (el senderId llegaba del cliente). Ahora la identidad se deriva
// del JWT y no se confía en ningún id enviado por el cliente.
io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('No autenticado'));

    const decoded = verifyAccessToken(token); // lanza si firma inválida / expirado
    if (await isTokenBlacklisted(decoded.jti)) return next(new Error('Token inválido'));

    const user = await User.findByPk(decoded.userId);
    if (!user || !user.is_active) return next(new Error('Usuario no válido'));

    socket.userId = user.id;
    socket.userRole = user.role;
    next();
  } catch {
    next(new Error('No autenticado'));
  }
});

/**
 * ¿El usuario puede acceder a la sala/chat de este proyecto?
 * Participan: el cliente dueño, el trabajador asignado y cualquier admin.
 */
const canAccessProject = async (userId, userRole, projectId) => {
  if (userRole === 'admin') return true;
  const project = await Project.findByPk(projectId, {
    attributes: ['id', 'client_id', 'worker_id'],
  });
  if (!project) return false;
  return project.client_id === userId || project.worker_id === userId;
};

io.on('connection', (socket) => {
  // La sala personal se une automáticamente con la identidad del token:
  // el cliente ya NO decide de quién recibe notificaciones.
  socket.join(`user:${socket.userId}`);

  // ── Sala de proyecto (para chat) — solo si es participante ──
  socket.on('join_room', async (roomId) => {
    try {
      if (!(await canAccessProject(socket.userId, socket.userRole, roomId))) {
        return socket.emit('error_message', { message: 'Sin acceso a este chat' });
      }
      socket.join(roomId);
    } catch (error) {
      console.error('Error en join_room:', error.message);
    }
  });

  // ── Chat en tiempo real — sender = identidad del token ──
  socket.on('send_message', async (data) => {
    try {
      const roomId = data?.roomId;
      if (!roomId || !data?.text?.trim()) return;
      if (!(await canAccessProject(socket.userId, socket.userRole, roomId))) {
        return socket.emit('error_message', { message: 'Sin acceso a este chat' });
      }

      const newMessage = await Message.create({
        project_id: roomId,
        sender_id: socket.userId, // ← derivado del token, no del cliente
        text: data.text.trim(),
      });
      io.to(roomId).emit('new_message', {
        id: newMessage.id,
        projectId: roomId,
        senderId: socket.userId,
        text: newMessage.text,
        createdAt: newMessage.createdAt,
      });
    } catch (error) {
      console.error('Error al guardar mensaje:', error.message);
    }
  });

  // ── Recibo de lectura ("visto") en tiempo real ──
  // El lector marca como leídos los mensajes de la contraparte y se notifica
  // a la sala para que el remitente vea el ✓✓ en vivo, sin recargar.
  socket.on('mark_read', async (roomId) => {
    try {
      if (!roomId) return;
      // markAsRead valida el acceso (lanza si no es participante) antes de tocar la DB.
      await messageService.markAsRead(roomId, { id: socket.userId, role: socket.userRole });
      io.to(roomId).emit('messages_read', { projectId: roomId, readerId: socket.userId });
    } catch (error) {
      console.error('Error en mark_read:', error.message);
    }
  });

  // ── Indicador "escribiendo…" ──
  // Se retransmite a la sala (menos al emisor). El guard `socket.rooms.has`
  // evita tocar la DB en cada tecleo y bloquea spoofing: solo estás en la
  // sala si `join_room` ya validó tu acceso.
  socket.on('typing', (roomId) => {
    if (!roomId || !socket.rooms.has(roomId)) return;
    socket.to(roomId).emit('user_typing', { projectId: roomId, userId: socket.userId });
  });

  socket.on('stop_typing', (roomId) => {
    if (!roomId || !socket.rooms.has(roomId)) return;
    socket.to(roomId).emit('user_stop_typing', { projectId: roomId, userId: socket.userId });
  });

  socket.on('disconnect', () => { /* limpieza automática de salas */ });
});

const start = async () => {
  try {
    await connectDB();
    await connectRedis();

    httpServer.listen(PORT, () => {
      console.log('\n🏠 ═══════════════════════════════════');
      console.log(`   HOME API  →  http://localhost:${PORT}`);
      console.log(`   Health    →  http://localhost:${PORT}/health`);
      console.log(`   Servicios →  http://localhost:${PORT}/api/services`);
      console.log('   ─────────────────────────────────────');
      console.log('   Para poblar la BD: npm run seed');
      console.log('═══════════════════════════════════\n');
    });
  } catch (error) {
    console.error('❌ Error al iniciar:', error);
    process.exit(1);
  }
};

start();
module.exports = { httpServer, io };
