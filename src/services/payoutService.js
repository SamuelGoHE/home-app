const { randomUUID } = require('crypto');
const { Payout, Refund, WorkerPayoutAccount, Project, User } = require('../models');
const { wompiPayouts, sourceAccountId, getBankId, eventsSecret: payoutsEventsSecret } = require('../config/wompiPayouts');
const { verifyWompiSignature } = require('../utils/verifyWompiSignature');

const listPayouts = async (user, status) => {
  const where = {};
  if (status) where.status = status;

  if (user.role === 'trabajador') {
    where.worker_id = user.id;
  } else if (!['admin_finanzas', 'admin'].includes(user.role)) {
    const e = new Error('Sin acceso a esta información'); e.statusCode = 403; throw e;
  }

  return Payout.findAll({
    where,
    include: [
      { model: Project, as: 'project', attributes: ['id', 'title', 'city', 'actual_end_date'] },
      { model: User, as: 'worker', attributes: ['id', 'name', 'email'] },
    ],
    order: [['created_at', 'DESC']],
  });
};

const toCents = (amount) => Math.round(Number(amount) * 100);

/**
 * Envía el payout a la cuenta bancaria del trabajador vía la API de Payouts
 * de Wompi (POST /payouts — confirmado contra docs.wompi.co 2026-08-28,
 * incluyendo el body de ejemplo exacto).
 *
 * NOTA: Wompi llama "lote" a cada envío aunque tenga una sola transacción
 * (nuestro caso siempre) — por eso el body tiene `transactions: [...]` con
 * un único elemento. `legalIdType` se asume 'CC' porque hoy no se le pide
 * ese dato al trabajador al registrar su cuenta (solo aplicaría distinto
 * para extranjeros/NIT — no cubierto todavía).
 */
const sendWompiPayout = async ({ account, amount, worker, reference }) => {
  if (!wompiPayouts) { const e = new Error('Wompi Payouts no configurado'); e.statusCode = 500; throw e; }
  if (!sourceAccountId) { const e = new Error('Falta configurar WOMPI_PAYOUTS_ACCOUNT_ID'); e.statusCode = 500; throw e; }

  const bankId = await getBankId(account.bank_name);

  let data;
  try {
    ({ data } = await wompiPayouts.post('/payouts', {
      reference,
      accountId: sourceAccountId,
      paymentType: 'PROVIDERS',
      transactions: [{
        legalIdType: 'CC',
        legalId: account.account_holder_id_number,
        bankId,
        accountType: account.account_type.toUpperCase(),
        accountNumber: account.account_number,
        name: worker.name,
        email: worker.email,
        amount: toCents(amount),
        reference,
      }],
    }, {
      headers: { 'idempotency-key': randomUUID() },
    }));
  } catch (err) {
    console.error('[Wompi Payouts] error creando payout:', err.response?.data || err.message);
    const e = new Error('No se pudo enviar el payout a Wompi'); e.statusCode = 502; throw e;
  }

  const payoutId = data?.data?.id || data?.id;
  if (!payoutId) { const e = new Error('Wompi no devolvió un id de payout válido'); e.statusCode = 502; throw e; }
  return payoutId;
};

/**
 * Aprueba y envía un payout. Solo admin_finanzas — es el control de fraude
 * central del modelo de pagos (separación preparador/aprobador que
 * recomienda la propia Wompi).
 */
const approvePayout = async (payoutId, adminUser) => {
  const payout = await Payout.findByPk(payoutId);
  if (!payout) { const e = new Error('Payout no encontrado'); e.statusCode = 404; throw e; }

  if (payout.status !== 'pendiente') {
    const e = new Error('Este payout ya fue procesado'); e.statusCode = 409; throw e;
  }
  if (new Date() < payout.eligible_at) {
    const e = new Error('Todavía no se cumple la ventana de espera para este payout'); e.statusCode = 400; throw e;
  }

  const account = await WorkerPayoutAccount.findOne({ where: { worker_id: payout.worker_id } });
  if (!account) {
    const e = new Error('El trabajador no tiene una cuenta bancaria registrada'); e.statusCode = 400; throw e;
  }
  if (!account.verified) {
    const e = new Error('La cuenta bancaria del trabajador todavía no está verificada'); e.statusCode = 400; throw e;
  }

  const worker = await User.findByPk(payout.worker_id);

  // Sin try/catch a propósito: si Wompi rechaza el request (banco inválido,
  // llaves mal configuradas, etc.) el payout se queda en 'pendiente' para
  // poder reintentarlo después de corregir el problema — no lo marcamos
  // 'fallido' por un rechazo síncrono del request. Un rechazo real de Wompi
  // ya en procesamiento (fondos, cuenta inactiva) llega después vía el
  // webhook transaction.updated con status FAILED, y ESE sí marca 'fallido'
  // (ver handleWompiPayoutWebhook más abajo).
  const wompiPayoutId = await sendWompiPayout({
    account,
    worker,
    amount: payout.amount,
    reference: `home-payout-${payout.id}`,
  });

  await payout.update({
    status: 'enviado',
    approved_by: adminUser.id,
    approved_at: new Date(),
    wompi_payout_id: wompiPayoutId,
  });
  return payout.reload();
};

const TRANSACTION_FINAL_STATUS = { APPROVED: 'completado', CANCELLED: 'fallido', FAILED: 'fallido' };

/**
 * Procesa un webhook de la API de Payouts de Wompi (evento `transaction.updated`
 * — confirmado contra docs.wompi.co 2026-08-28, mismo esquema de firma que
 * el webhook de Checkout pero con secreto propio, WOMPI_PAYOUTS_EVENTS_SECRET).
 *
 * El evento `payout.updated` (a nivel de "lote") se ignora a propósito: cada
 * payout/reembolso nuestro es siempre un lote de una sola transacción, así
 * que el estado de la transacción ya nos dice todo lo que necesitamos.
 *
 * Resuelve tanto payouts (a trabajadores) como refunds (a clientes) — ambos
 * comparten el mismo riel/webhook de Wompi, se distinguen por el prefijo de
 * `reference` que nosotros mismos generamos al enviarlos.
 */
const handleWompiPayoutWebhook = async (payload, io) => {
  if (!verifyWompiSignature(payload, payoutsEventsSecret)) {
    const e = new Error('Firma de webhook inválida'); e.statusCode = 401; throw e;
  }

  const tx = payload?.data?.transaction;
  if (!tx?.reference) return;

  const newStatus = TRANSACTION_FINAL_STATUS[tx.status];
  if (!newStatus) return; // PENDING: todavía en trámite, nada que actualizar todavía

  const failureReason = newStatus === 'fallido' ? (tx.failureReason?.message || tx.status) : null;

  if (tx.reference.startsWith('home-payout-')) {
    const payout = await Payout.findByPk(tx.reference.slice('home-payout-'.length));
    if (!payout || payout.status !== 'enviado') return;
    await payout.update({ status: newStatus, failure_reason: failureReason });
    if (io) io.to(`user:${payout.worker_id}`).emit('payout_status', { payoutId: payout.id, status: newStatus });
  } else if (tx.reference.startsWith('home-refund-')) {
    const refund = await Refund.findByPk(tx.reference.slice('home-refund-'.length));
    if (!refund || refund.status !== 'enviado') return;
    await refund.update({ status: newStatus });
    if (io) io.to(`user:${refund.client_id}`).emit('refund_status', { refundId: refund.id, status: newStatus });
  }
};

module.exports = { listPayouts, approvePayout, handleWompiPayoutWebhook };
