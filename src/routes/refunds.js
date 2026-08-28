const express = require('express');
const router = express.Router();
const refundService = require('../services/refundService');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate);

// GET /api/refunds — admin_finanzas ve todos (?status= filtra), cliente ve los propios
router.get('/', async (req, res, next) => {
  try {
    res.json({ success: true, data: await refundService.listRefunds(req.user, req.query.status) });
  } catch (error) {
    next(error);
  }
});

// POST /api/refunds/:id/approve — admin_finanzas define la penalización y dispara el envío
router.post('/:id/approve', authorize('admin_finanzas'), async (req, res, next) => {
  try {
    res.json({ success: true, data: await refundService.approveRefund(req.params.id, req.user, req.body.penaltyAmount) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
