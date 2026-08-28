const crypto = require('crypto');
const { eventsSecret: checkoutEventsSecret } = require('../config/wompi');

/**
 * Verifica el checksum de un webhook de Wompi (Checkout o Payouts — ambos
 * usan exactamente el mismo esquema, confirmado contra su documentación
 * oficial: SHA256 de los valores de `signature.properties` en el orden
 * dado, más `timestamp`, más el events secret). Lo único que cambia entre
 * productos es CUÁL secreto usar — Payouts tiene el suyo propio, separado
 * del de Checkout (ver src/config/wompiPayouts.js) — por eso `secret` es
 * un parámetro en vez de venir siempre del mismo config.
 */
const verifyWompiSignature = (payload, secret = checkoutEventsSecret) => {
  if (!secret) {
    const e = new Error('Events secret no configurado');
    e.statusCode = 500;
    throw e;
  }

  const { signature, timestamp, data } = payload || {};
  if (!signature?.properties || !signature?.checksum || !timestamp || !data) return false;

  const concatenated = signature.properties
    .map((path) => path.split('.').reduce((obj, key) => obj?.[key], data))
    .join('');

  const expected = crypto
    .createHash('sha256')
    .update(`${concatenated}${timestamp}${secret}`)
    .digest('hex');

  return expected.toLowerCase() === String(signature.checksum).toLowerCase();
};

module.exports = { verifyWompiSignature };
