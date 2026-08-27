const { randomUUID } = require('crypto');
const { Payment, Project, Task } = require('../models');
const { wompi } = require('../config/wompi');
const { verifyWompiSignature } = require('../utils/verifyWompiSignature');
const { redisClient } = require('../config/redis');

const INITIAL_COMMISSION_RATE = 0.20;

// Estados previos a que arranque el trabajo facturable. 'en_revision' y
// 'aprobado' son pasos de reconocimiento entre cliente/trabajador anteriores
// a esta lógica de pagos — el pago inicial puede cobrarse en cualquiera de
// ellos, no solo en 'pendiente'. Lo único que importa es que el proyecto
// todavía no haya arrancado ni terminado.
const PRE_PROGRESS_STATUSES = ['pendiente', 'en_revision', 'aprobado', 'pausado'];

// Wompi trabaja en centavos — evita errores de redondeo con floats.
const toCents = (amount) => Math.round(Number(amount) * 100);

const assertClientOwnsProject = (project, user) => {
  if (!project) { const e = new Error('Proyecto no encontrado'); e.statusCode = 404; throw e; }
  if (project.client_id !== user.id) { const e = new Error('Sin acceso a este proyecto'); e.statusCode = 403; throw e; }
};

const createPaymentLink = async ({ reference, amountInCents, name, description }) => {
  if (!wompi) { const e = new Error('Wompi no configurado (faltan WOMPI_PRIVATE_KEY/WOMPI_PUBLIC_KEY)'); e.statusCode = 500; throw e; }

  let data;
  try {
    ({ data } = await wompi.post('/payment_links', {
      name,
      description,
      single_use: true,
      collect_shipping: false,
      currency: 'COP',
      amount_in_cents: amountInCents,
      reference,
    }));
  } catch (err) {
    // No exponer el error crudo de axios (puede incluir detalles de la
    // llamada) — lo dejamos en el log del servidor y devolvemos algo genérico.
    console.error('[Wompi] error creando payment link:', err.response?.data || err.message);
    const e = new Error('No se pudo crear el link de pago con Wompi'); e.statusCode = 502; throw e;
  }

  const linkId = data?.data?.id;
  if (!linkId) { const e = new Error('Wompi no devolvió un link de pago válido'); e.statusCode = 502; throw e; }
  return `https://checkout.wompi.co/l/${linkId}`;
};

/**
 * Crea el cobro inicial (20% de project.budget) al cliente. El proyecto debe
 * seguir en 'pendiente' — pasar a 'en_progreso' ya no es una transición manual
 * (ver projectService.updateProjectStatus): solo ocurre cuando el webhook de
 * Wompi confirma este pago.
 */
const createInitialPayment = async (projectId, user) => {
  const project = await Project.findByPk(projectId);
  assertClientOwnsProject(project, user);

  if (!PRE_PROGRESS_STATUSES.includes(project.status)) {
    const e = new Error('El pago inicial ya no aplica: el proyecto ya arrancó, terminó o fue cancelado'); e.statusCode = 400; throw e;
  }
  if (!project.budget) {
    const e = new Error('Este proyecto todavía no tiene un precio acordado'); e.statusCode = 400; throw e;
  }

  const existingApproved = await Payment.findOne({ where: { project_id: projectId, type: 'inicial', status: 'aprobado' } });
  if (existingApproved) {
    const e = new Error('El pago inicial de este proyecto ya fue confirmado'); e.statusCode = 409; throw e;
  }

  const amount = Number(project.budget) * INITIAL_COMMISSION_RATE;
  const reference = `home-inicial-${projectId}-${randomUUID()}`;

  const url = await createPaymentLink({
    reference,
    amountInCents: toCents(amount),
    name: `HOME · Pago inicial (20%)`,
    description: `Pago inicial para iniciar el proyecto "${project.title}"`,
  });

  const payment = await Payment.create({
    type: 'inicial',
    amount,
    wompi_reference: reference,
    status: 'pendiente',
    project_id: projectId,
    client_id: user.id,
  });

  return { paymentId: payment.id, url };
};

const getPaymentStatus = async (projectId, user) => {
  const project = await Project.findByPk(projectId);
  if (!project) { const e = new Error('Proyecto no encontrado'); e.statusCode = 404; throw e; }
  const isOwner = project.client_id === user.id || project.worker_id === user.id;
  if (!isOwner && user.role !== 'admin' && user.role !== 'admin_finanzas') {
    const e = new Error('Sin acceso a este proyecto'); e.statusCode = 403; throw e;
  }
  const payments = await Payment.findAll({ where: { project_id: projectId }, order: [['created_at', 'ASC']] });
  return payments;
};

const STATUS_MAP = { APPROVED: 'aprobado', DECLINED: 'declinado', ERROR: 'error', VOIDED: 'declinado' };

/**
 * Procesa un webhook de Wompi. Solo actúa sobre eventos de transacción cuyo
 * `reference` coincida con un Payment nuestro — cualquier otra cosa se ignora
 * silenciosamente (Wompi reintenta si no respondemos 200, así que no hay que
 * fallar por eventos que no nos interesan).
 */
const handleWompiWebhook = async (payload, io) => {
  if (!verifyWompiSignature(payload)) {
    const e = new Error('Firma de webhook inválida'); e.statusCode = 401; throw e;
  }

  const tx = payload?.data?.transaction;
  if (!tx?.reference) return;

  // Idempotencia: Wompi reintenta la entrega del mismo evento — si Redis está
  // caído, seguimos procesando igual (mejor un duplicado ocasional que perder
  // la confirmación de un pago real).
  const idempotencyKey = `wompi:event:${tx.id}:${tx.status}`;
  try {
    const alreadyProcessed = await redisClient.get(idempotencyKey);
    if (alreadyProcessed) return;
  } catch { /* Redis caído, seguimos */ }

  const payment = await Payment.findOne({ where: { wompi_reference: tx.reference } });
  if (!payment) return;

  const newStatus = STATUS_MAP[tx.status] || 'error';
  await payment.update({
    status: newStatus,
    wompi_transaction_id: tx.id,
    payment_method: tx.payment_method_type || null,
    paid_at: newStatus === 'aprobado' ? new Date() : null,
  });

  if (newStatus === 'aprobado' && payment.type === 'inicial') {
    const project = await Project.findByPk(payment.project_id);
    if (project && PRE_PROGRESS_STATUSES.includes(project.status)) {
      await project.update({ status: 'en_progreso' });
      await Task.update({ status: 'en_progreso' }, { where: { project_id: project.id } });

      if (io) {
        io.to(`user:${project.client_id}`).emit('payment_confirmed', { projectId: project.id, type: 'inicial' });
        if (project.worker_id) {
          io.to(`user:${project.worker_id}`).emit('project_started', { projectId: project.id });
        }
      }
    }
  }

  try {
    await redisClient.setEx(idempotencyKey, 60 * 60 * 24, '1');
  } catch { /* Redis caído, no pasa nada — solo perdemos la dedupe */ }
};

module.exports = { createInitialPayment, getPaymentStatus, handleWompiWebhook, INITIAL_COMMISSION_RATE };
