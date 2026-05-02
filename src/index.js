const { createServer } = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { Message } = require('./models');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173', methods: ['GET','POST'], credentials: true },
});

app.set('io', io);

// Socket.io básico (chat se expande en el siguiente módulo)
io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);

  // ── Sala personal del usuario (para notificaciones directas) ──
  socket.on('join_user_room', (userId) => {
    socket.join(`user:${userId}`);
    console.log(`👤 Socket ${socket.id} → sala personal user:${userId}`);
  });

  // ── Sala de proyecto (para chat) ──
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`📌 Socket ${socket.id} → sala ${roomId}`);
  });

  // ── Chat en tiempo real ──
  socket.on('send_message', async (data) => {
    try {
      const newMessage = await Message.create({
        project_id: data.roomId,
        sender_id: data.senderId,
        text: data.text
      });
      io.to(data.roomId).emit('new_message', {
        id: newMessage.id,
        projectId: data.roomId,
        senderId: data.senderId,
        text: data.text,
        createdAt: newMessage.createdAt
      });
    } catch (error) {
      console.error('Error al guardar mensaje:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Desconectado: ${socket.id}`);
  });
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
