const crypto = require('crypto');
const { eventsSecret } = require('../config/wompi');

/**
 * Verifica el checksum de un webhook de Wompi.
 *
 * IMPORTANTE: implementado según el esquema de checksum documentado por
 * Wompi al momento de escribir esto (SHA256 de los valores de
 * `signature.properties`, en el orden dado, más `timestamp` y el events
 * secret). Verificar contra la documentación vigente de Wompi antes de
 * activar esto en producción — su formato de eventos puede cambiar.
 */
const verifyWompiSignature = (payload) => {
  if (!eventsSecret) {
    const e = new Error('WOMPI_EVENTS_SECRET no configurado');
    e.statusCode = 500;
    throw e;
  }

  const { signature, timestamp, data } = payload || {};
  if (!signature?.properties || !signature?.checksum || !timestamp || !data) return false;

  const concatenated = signature.properties
    .map((path) => path.split('.').reduce((obj, key) => obj?.[key], { data }))
    .join('');

  const expected = crypto
    .createHash('sha256')
    .update(`${concatenated}${timestamp}${eventsSecret}`)
    .digest('hex');

  return expected === signature.checksum;
};

module.exports = { verifyWompiSignature };
