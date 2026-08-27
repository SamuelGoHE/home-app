const paymentService = require('../services/paymentService');

const createInitialPayment = async (req, res, next) => {
  try {
    const result = await paymentService.createInitialPayment(req.params.projectId, req.user);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getPaymentStatus = async (req, res, next) => {
  try {
    const payments = await paymentService.getPaymentStatus(req.params.projectId, req.user);
    res.json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
};

const wompiWebhook = async (req, res) => {
  try {
    await paymentService.handleWompiWebhook(req.body, req.app.get('io'));
    // Wompi reintenta si no recibe 200 — respondemos 200 incluso ante eventos
    // que ignoramos a propósito (referencia desconocida, tipo de evento distinto).
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

module.exports = { createInitialPayment, getPaymentStatus, wompiWebhook };
