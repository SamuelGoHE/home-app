const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middlewares/auth');

// Webhook de Wompi — público, verificado por firma propia (verifyWompiSignature),
// no por el middleware authenticate. Debe ir ANTES de router.use(authenticate).
router.post('/webhooks/wompi', paymentController.wompiWebhook);

router.use(authenticate);

// POST /api/payments/:projectId/initial
router.post('/:projectId/initial', authorize('cliente'), paymentController.createInitialPayment);

// GET /api/payments/:projectId
router.get('/:projectId', paymentController.getPaymentStatus);

module.exports = router;
