'use strict';

// Envío de correos transaccionales (recuperación de contraseña, verificación
// de cuenta) vía SMTP con nodemailer.
//
// Degradación elegante: si no hay SMTP configurado (típico en desarrollo o en
// los tests), NO se lanza error — se registra el correo en consola y se sigue.
// Así el flujo de negocio nunca se rompe por falta de credenciales de correo,
// pero en producción con SMTP real el mensaje sí se entrega.

const nodemailer = require('nodemailer');

const FROM = process.env.EMAIL_FROM || 'HOME <no-reply@home.app>';

// Primer origen de FRONTEND_URL (puede venir como lista separada por comas).
const frontendBaseUrl = () =>
  (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');

// URL pública del backend, para construir el enlace de verificación que
// resuelve el propio API y luego redirige al frontend.
const backendBaseUrl = () =>
  (process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');

let transporter; // singleton perezoso
let warnedNotConfigured = false;

const isConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const getTransporter = () => {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    // true para 465 (SSL), false para 587/25 (STARTTLS). Se puede forzar con SMTP_SECURE.
    secure: process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === 'true'
      : Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
};

/**
 * Envía un correo. Si SMTP no está configurado, lo registra y retorna
 * { sent: false } sin lanzar. Nunca propaga errores de red al llamador:
 * un fallo de correo no debe tumbar un registro o un forgot-password.
 */
const sendMail = async ({ to, subject, html, text }) => {
  if (!isConfigured()) {
    if (!warnedNotConfigured) {
      console.warn('[email] SMTP no configurado — los correos se registran en consola, no se envían.');
      warnedNotConfigured = true;
    }
    console.info(`[email] (no enviado) → ${to} | ${subject}`);
    return { sent: false };
  }
  try {
    await getTransporter().sendMail({ from: FROM, to, subject, html, text });
    return { sent: true };
  } catch (err) {
    // Se registra pero no se propaga: el flujo de negocio continúa.
    console.error('[email] error enviando correo:', err.message);
    return { sent: false, error: err.message };
  }
};

const layout = (title, body) => `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a">
    <h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
    ${body}
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
    <p style="font-size:12px;color:#888">HOME — Plataforma de servicios del hogar</p>
  </div>`;

const button = (href, label) =>
  `<a href="${href}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${label}</a>`;

const sendPasswordResetEmail = async (to, resetToken) => {
  const link = `${frontendBaseUrl()}/reset-password?token=${resetToken}`;
  return sendMail({
    to,
    subject: 'Recupera tu contraseña — HOME',
    html: layout('Recupera tu contraseña', `
      <p>Recibimos una solicitud para restablecer tu contraseña. El enlace vence en 1 hora.</p>
      <p style="margin:20px 0">${button(link, 'Restablecer contraseña')}</p>
      <p style="font-size:13px;color:#666">Si no fuiste tú, ignora este correo — tu contraseña no cambiará.</p>
      <p style="font-size:12px;color:#999;word-break:break-all">Enlace: ${link}</p>`),
    text: `Restablece tu contraseña (vence en 1 hora): ${link}`,
  });
};

const sendVerificationEmail = async (to, verificationToken) => {
  const link = `${backendBaseUrl()}/api/auth/verify-email?token=${verificationToken}`;
  return sendMail({
    to,
    subject: 'Confirma tu cuenta — HOME',
    html: layout('Confirma tu cuenta', `
      <p>¡Bienvenido a HOME! Confirma tu correo para activar todas las funciones de tu cuenta.</p>
      <p style="margin:20px 0">${button(link, 'Confirmar mi correo')}</p>
      <p style="font-size:12px;color:#999;word-break:break-all">Enlace: ${link}</p>`),
    text: `Confirma tu cuenta en HOME: ${link}`,
  });
};

module.exports = { sendMail, sendPasswordResetEmail, sendVerificationEmail, isConfigured };
