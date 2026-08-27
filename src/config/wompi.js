const axios = require('axios');
require('dotenv').config();

const WOMPI_ENV = process.env.WOMPI_ENV || 'sandbox';
const baseURL = WOMPI_ENV === 'production'
  ? 'https://production.wompi.co/v1'
  : 'https://sandbox.wompi.co/v1';

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

module.exports = { wompi, WOMPI_ENV, publicKey, privateKey, eventsSecret, integritySecret };
