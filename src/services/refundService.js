const { Refund, Payment, Project, User } = require('../models');

const ACCOUNT_TYPES = ['ahorros', 'corriente'];

const validateBankDetails = (data) => {
  const { bank_name, account_type, account_number, account_holder_id_number } = data || {};
  if (!bank_name || !account_type || !account_number || !account_holder_id_number) {
    const e = new Error('Para cancelar un proyecto con el pago inicial ya cobrado debes indicar la cuenta bancaria para el reembolso');
    e.statusCode = 400;
    throw e;
  }
  if (!ACCOUNT_TYPES.includes(account_type)) {
    const e = new Error('Tipo de cuenta inválido'); e.statusCode = 400; throw e;
  }
};

/**
 * Crea la solicitud de reembolso al cancelar un proyecto que ya tenía el
 * pago inicial aprobado. Llamado desde projectService.updateProjectStatus,
 * no tiene ruta propia. No calcula el monto todavía — la penalización la
 * define admin_finanzas caso por caso al aprobar (no hay fórmula definida,
 * ver payments-wompi-model).
 */
const createRefundRequest = async (project, payment, bankDetails) => {
  validateBankDetails(bankDetails);
  return Refund.create({
    bank_name: bankDetails.bank_name,
    account_type: bankDetails.account_type,
    account_number: bankDetails.account_number,
    account_holder_id_number: bankDetails.account_holder_id_number,
    project_id: project.id,
    client_id: project.client_id,
    payment_id: payment.id,
  });
};

const listRefunds = async (user, status) => {
  const where = {};
  if (status) where.status = status;

  if (user.role === 'cliente') {
    where.client_id = user.id;
  } else if (!['admin_finanzas', 'admin'].includes(user.role)) {
    const e = new Error('Sin acceso a esta información'); e.statusCode = 403; throw e;
  }

  return Refund.findAll({
    where,
    include: [
      { model: Project, as: 'project', attributes: ['id', 'title', 'city'] },
      { model: User, as: 'client', attributes: ['id', 'name', 'email'] },
      { model: Payment, as: 'payment', attributes: ['id', 'amount', 'paid_at'] },
    ],
    order: [['created_at', 'DESC']],
  });
};

/**
 * Envía el reembolso a la cuenta del cliente vía la API de Payouts de
 * Wompi — mismo riel técnico que payoutService.sendWompiPayout, misma
 * limitación: su referencia de API no es accesible sin sesión iniciada en
 * docs.wompi.co, así que queda sin implementar hasta confirmar esos datos.
 */
const sendWompiRefund = async (/* { refund, amount } */) => {
  const e = new Error('El envío de reembolsos a Wompi todavía no está implementado (pendiente de verificar su API de referencia)');
  e.statusCode = 501;
  throw e;
};

/**
 * Aprueba un reembolso — solo admin_finanzas define la penalización
 * (todavía no existe una fórmula, es criterio manual caso por caso).
 */
const approveRefund = async (refundId, adminUser, penaltyAmount) => {
  const refund = await Refund.findByPk(refundId, { include: [{ model: Payment, as: 'payment' }] });
  if (!refund) { const e = new Error('Reembolso no encontrado'); e.statusCode = 404; throw e; }
  if (refund.status !== 'pendiente') {
    const e = new Error('Este reembolso ya fue procesado'); e.statusCode = 409; throw e;
  }

  const penalty = Number(penaltyAmount);
  if (penaltyAmount == null || Number.isNaN(penalty) || penalty < 0) {
    const e = new Error('Indica un monto de penalización válido'); e.statusCode = 400; throw e;
  }
  const paidAmount = Number(refund.payment.amount);
  if (penalty > paidAmount) {
    const e = new Error('La penalización no puede ser mayor al pago inicial cobrado'); e.statusCode = 400; throw e;
  }

  const refundAmount = paidAmount - penalty;

  // Sin try/catch a propósito, igual que payoutService.approvePayout: mientras
  // sendWompiRefund no esté implementado, el error deja el reembolso intacto
  // en 'pendiente' para reintentarlo, en vez de marcarlo 'fallido'.
  const wompiPayoutId = await sendWompiRefund({ refund, amount: refundAmount });

  await refund.update({
    penalty_amount: penalty,
    refund_amount: refundAmount,
    status: 'enviado',
    approved_by: adminUser.id,
    approved_at: new Date(),
    wompi_payout_id: wompiPayoutId,
  });
  return refund.reload();
};

module.exports = { createRefundRequest, listRefunds, approveRefund };
