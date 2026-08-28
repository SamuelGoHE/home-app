const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Importar modelos para que las asociaciones se registren
require('./models');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const ratingRoutes = require('./routes/ratings');
const servicesRoutes = require('./routes/services');
const quotesRoutes = require('./routes/quotes');
const tasksRoutes = require('./routes/tasks');
const usersRoutes = require('./routes/users');
const messagesRoutes = require('./routes/messages');
const paymentsRoutes = require('./routes/payments');
const payoutsRoutes = require('./routes/payouts');
const refundsRoutes = require('./routes/refunds');
const { errorHandler, notFound } = require('./middlewares/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.FRONTEND_URL || '').split(',').map(u => u.trim()).filter(Boolean)
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 5_000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// Health check
app.get('/health', (req, res) => res.json({ success: true, service: 'HOME API', version: '1.0.0', timestamp: new Date().toISOString() }));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/tasks', tasksRoutes);
// payments va ANTES del catch-all '/api' de projectRoutes: su webhook de
// Wompi debe ser público (Wompi nunca manda nuestro JWT) y projectRoutes
// tiene un router.use(authenticate) sin path que, al montarse en '/api',
// interceptaría cualquier ruta más específica registrada después de él
// (ver [[backend-route-shadowing]] en memoria — mismo problema, más amplio
// de lo documentado ahí: también afecta a /api/ratings/worker/:id, pensado
// como público, y en general a cualquier ruta pública montada después).
app.use('/api/payments', paymentsRoutes);
app.use('/api/payouts', payoutsRoutes);
app.use('/api/refunds', refundsRoutes);
app.use('/api', projectRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/messages', messagesRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
