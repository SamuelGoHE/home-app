const { WorkerPayoutAccount } = require('../models');

const ACCOUNT_TYPES = ['ahorros', 'corriente'];

/**
 * Registra (o reemplaza) la cuenta de payout del trabajador autenticado.
 * No se llama a Wompi todavía — el registro del destinatario ante Wompi
 * (wompi_recipient_id) ocurre cuando admin_finanzas la verifica, no aquí
 * (ver payoutService, siguiente fase).
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

module.exports = { registerAccount, getAccount, ACCOUNT_TYPES };
