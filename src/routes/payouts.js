const express = require('express');
const router = express.Router();
const payoutService = require('../services/payoutService');
const payoutAccountService = require('../services/payoutAccountService');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate);

// GET /api/payouts — admin_finanzas ve todos (?status= filtra), trabajador solo los propios
router.get('/', async (req, res, next) => {
  try {
    res.json({ success: true, data: await payoutService.listPayouts(req.user, req.query.status) });
  } catch (error) {
    next(error);
  }
});

// POST /api/payouts/:id/approve — admin_finanzas
router.post('/:id/approve', authorize('admin_finanzas'), async (req, res, next) => {
  try {
    res.json({ success: true, data: await payoutService.approvePayout(req.params.id, req.user) });
  } catch (error) {
    next(error);
  }
});

// GET /api/payouts/accounts/pending — cuentas bancarias de trabajadores sin verificar
router.get('/accounts/pending', authorize('admin_finanzas'), async (req, res, next) => {
  try {
    res.json({ success: true, data: await payoutAccountService.listUnverifiedAccounts() });
  } catch (error) {
    next(error);
  }
});

// POST /api/payouts/accounts/:id/verify — admin_finanzas
router.post('/accounts/:id/verify', authorize('admin_finanzas'), async (req, res, next) => {
  try {
    res.json({ success: true, data: await payoutAccountService.verifyAccount(req.params.id, req.user) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
