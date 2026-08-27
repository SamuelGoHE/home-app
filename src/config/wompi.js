const axios = require('axios');
require('dotenv').config();

const baseURL = process.env.WOMPI_API_URL || 'https://sandbox.wompi.co/v1';

const publicKey = process.env.WOMPI_PUBLIC_KEY;
const privateKey = process.env.WOMPI_PRIVATE_KEY;
const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;

// Cliente para llamadas server-to-server (crear Payment Link, Payouts,
// consultar transacciones). El acceso público (widget/checkout del cliente)
// usa WOMPI_PUBLIC_KEY directamente, no este cliente.
const wompi = privateKey
  ? axios.create({
      baseURL,
      headers: { Authorization: `Bearer ${privateKey}` },
    })
  : null;

module.exports = { wompi, baseURL, publicKey, privateKey, eventsSecret, integritySecret };
