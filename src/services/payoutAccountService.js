const { WorkerPayoutAccount } = require('../models');

const ACCOUNT_TYPES = ['ahorros', 'corriente'];

/**
 * Registra (o reemplaza) la cuenta de payout del trabajador autenticado.
 * No se llama a Wompi todavía — el registro del destinatario ante su API de
 * Payouts (wompi_recipient_id) está pendiente de implementar (ver
 * payoutService.sendWompiPayout: su referencia de API no es accesible sin
 * sesión iniciada en docs.wompi.co, así que por ahora esto solo maneja el
 * estado interno de verificación de admin_finanzas).
 */
const registerAccount = async (workerId, data) => {
  const { bank_name, account_type, account_number, account_holder_id_number } = data;

  if (!bank_name || !account_type || !account_number || !account_holder_id_number) {
    const e = new Error('Faltan datos de la cuenta bancaria'); e.statusCode = 400; throw e;
  }
  if (!ACCOUNT_TYPES.includes(account_type)) {
    const e = new Error('Tipo de cuenta inválido'); e.statusCode = 400; throw e;
  }

  const last4 = String(account_number).slice(-4);

  const [account] = await WorkerPayoutAccount.findOrCreate({
    where: { worker_id: workerId },
    defaults: {
      worker_id: workerId,
      bank_name,
      account_type,
      account_number_last4: last4,
      account_holder_id_number,
    },
  });

  // Si ya existía (ej. el trabajador corrige un dato), se actualiza y se
  // reinicia la verificación — admin_finanzas debe volver a confirmarla.
  await account.update({
    bank_name,
    account_type,
    account_number_last4: last4,
    account_holder_id_number,
    verified: false,
    verified_by: null,
    verified_at: null,
  });

  return account;
};

const getAccount = async (workerId) => {
  return WorkerPayoutAccount.findOne({ where: { worker_id: workerId } });
};

// admin_finanzas: cuentas todavía sin revisar.
const listUnverifiedAccounts = async () => {
  return WorkerPayoutAccount.findAll({
    where: { verified: false },
    include: [{ association: 'worker', attributes: ['id', 'name', 'email', 'phone'] }],
    order: [['created_at', 'ASC']],
  });
};

const verifyAccount = async (accountId, adminUser) => {
  const account = await WorkerPayoutAccount.findByPk(accountId);
  if (!account) { const e = new Error('Cuenta no encontrada'); e.statusCode = 404; throw e; }
  await account.update({ verified: true, verified_by: adminUser.id, verified_at: new Date() });
  return account;
};

module.exports = { registerAccount, getAccount, listUnverifiedAccounts, verifyAccount, ACCOUNT_TYPES };
