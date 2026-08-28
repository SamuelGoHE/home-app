const axios = require('axios');
require('dotenv').config();

// Pagos a Terceros (Payouts) es un producto de Wompi separado de Checkout:
// dominio propio, llaves propias (x-api-key + user-principal-id, NO
// Authorization: Bearer como el resto de esta app) y secreto de eventos
// propio. Ver docs.wompi.co → Pagos a Terceros → Llaves de autenticación.
const baseURL = process.env.WOMPI_PAYOUTS_API_URL || 'https://api.payouts.wompi.co/v1';

const apiKey = process.env.WOMPI_PAYOUTS_API_KEY;
const userPrincipalId = process.env.WOMPI_PAYOUTS_USER_PRINCIPAL_ID;
const eventsSecret = process.env.WOMPI_PAYOUTS_EVENTS_SECRET;
// Cuenta de origen de HOME en Wompi (de donde sale la plata) — se obtiene
// una sola vez del dashboard o de GET /accounts y se deja fija acá; no vale
// la pena resolverla en cada request.
const sourceAccountId = process.env.WOMPI_PAYOUTS_ACCOUNT_ID;

const wompiPayouts = (apiKey && userPrincipalId)
  ? axios.create({
      baseURL,
      headers: {
        'x-api-key': apiKey,
        'user-principal-id': userPrincipalId,
        'Content-Type': 'application/json',
      },
    })
  : null;

// Cache en memoria del proceso — la lista de bancos prácticamente no cambia,
// no vale la pena golpear /banks en cada payout.
let banksCache = null;

/**
 * Resuelve el UUID de banco que pide POST /payouts (bankId) a partir del
 * nombre libre que guardamos nosotros (worker_payout_accounts.bank_name /
 * refunds.bank_name).
 *
 * NOTA: la forma exacta de la respuesta de GET /banks no se pudo confirmar
 * contra la referencia de Wompi (solo se confirmó que existe y que cada
 * banco trae un `id`) — se asume el mismo patrón `{ data: [...] }` que el
 * resto de su API. Verificar en cuanto Payouts esté activado y se pueda
 * probar contra su sandbox de verdad.
 */
const getBankId = async (bankName) => {
  if (!wompiPayouts) { const e = new Error('Wompi Payouts no configurado'); e.statusCode = 500; throw e; }

  if (!banksCache) {
    const { data } = await wompiPayouts.get('/banks');
    banksCache = data?.data || data;
  }

  const normalize = (s) => String(s).trim().toUpperCase();
  const match = banksCache.find((b) => normalize(b.name) === normalize(bankName));
  if (!match) {
    const e = new Error(`Wompi no reconoce el banco "${bankName}"`);
    e.statusCode = 400;
    throw e;
  }
  return match.id;
};

module.exports = { wompiPayouts, eventsSecret, sourceAccountId, getBankId };
