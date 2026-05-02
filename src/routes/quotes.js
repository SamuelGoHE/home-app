const express = require('express');
const router = express.Router();
const quoteController = require('../controllers/quoteController');
const { authenticate, authorize } = require('../middlewares/auth');

// Las rutas de cotizaciones requieren autenticación
router.use(authenticate);

// POST /api/quotes
router.post('/', quoteController.createQuote);

// GET /api/quotes/me
router.get('/me', quoteController.getMyQuotes);

// GET /api/quotes/worker
router.get('/worker', authorize('trabajador', 'admin'), quoteController.getWorkerQuotes);

// PATCH /api/quotes/:id/status
router.patch('/:id/status', authorize('trabajador', 'admin'), quoteController.updateQuoteStatus);

// GET /api/quotes
router.get('/', authorize('admin'), quoteController.getAllQuotes);

module.exports = router;
