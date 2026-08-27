const { Payout, WorkerPayoutAccount, Project, User } = require('../models');

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

/**
 * Envía el payout a la cuenta bancaria del trabajador vía la API de Payouts
 * de Wompi.
 *
 * TODO(pagos): la referencia de API de Wompi para /payouts está detrás de
 * un login (docs.wompi.co devuelve 403 sin sesión autenticada) — no se pudo
 * verificar el endpoint exacto para registrar el destinatario, los nombres
 * de campo requeridos (banco, tipo/número de cuenta, cédula, monto), ni el
 * evento de webhook que confirma el envío. Antes de habilitar esto en
 * producción: entrar a docs.wompi.co con la cuenta ya verificada de Samuel
 * y confirmar esos tres puntos contra la referencia real.
 */
const sendWompiPayout = async (/* { account, amount, reference } */) => {
  const e = new Error('El envío de payouts a Wompi todavía no está implementado (pendiente de verificar su API de referencia)');
  e.statusCode = 501;
  throw e;
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

  // Sin try/catch a propósito: mientras sendWompiPayout no esté implementado
  // de verdad, cualquier error deja el payout intacto en 'pendiente' para
  // poder reintentarlo — no lo marcamos 'fallido' por un error que es
  // "todavía no construido", no un rechazo real de Wompi. Una vez exista la
  // llamada real, decidir ahí cómo distinguir un fallo de Wompi (→ 'fallido')
  // de un error de red/timeout (→ dejar 'pendiente' para reintentar).
  const wompiPayoutId = await sendWompiPayout({
    account,
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

module.exports = { listPayouts, approvePayout };
