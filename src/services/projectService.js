const { Op } = require('sequelize');
const { Project, Task, Service, User, Quote, WorkerProfile, WorkerServiceRate, Rating, Payment } = require('../models');
const refundService = require('./refundService');

// ── SERVICIOS ──────────────────────────────────────────────
const getServices = async (category) => {
  const where = { is_active: true };
  if (category) where.category = category;
  return Service.findAll({ where, order: [['name', 'ASC']] });
};

const getServiceById = async (id) => {
  const s = await Service.findByPk(id);
  if (!s) { const e = new Error('Servicio no encontrado'); e.statusCode = 404; throw e; }
  return s;
};

const createService = async (data) => Service.create(data);

// ── PROYECTOS ──────────────────────────────────────────────
const getProjects = async (user) => {
  const where = {};
  if (user.role === 'cliente') {
    where.client_id = user.id;
  } else if (user.role === 'trabajador') {
    where.worker_id = user.id;
  }
  return Project.findAll({
    where,
    include: [
      { model: User, as: 'client',  attributes: ['id','name','email','phone','avatar'] },
      { model: User, as: 'worker',  attributes: ['id','name','email','avatar'] },
      { model: User, as: 'admin',   attributes: ['id','name','email'] },
      { model: Service, as: 'service', attributes: ['id','name','category','image_url'] },
      { model: Task, as: 'tasks', attributes: ['id','title','status','priority','due_date','assigned_to'],
        include: [{ model: User, as: 'assignee', attributes: ['id','name','avatar'] }] },
    ],
    order: [['created_at', 'DESC']],
  });
};

const getProjectById = async (id, user) => {
  const project = await Project.findByPk(id, {
    include: [
      { model: User, as: 'client',  attributes: ['id','name','email','phone','avatar'] },
      { model: User, as: 'worker',  attributes: ['id','name','email','avatar'] },
      { model: User, as: 'admin',   attributes: ['id','name','email'] },
      { model: Service, as: 'service' },
      { model: Task, as: 'tasks',
        include: [
          { model: User, as: 'assignee', attributes: ['id','name','avatar'] },
          { model: User, as: 'creator',  attributes: ['id','name'] },
        ],
        order: [['created_at', 'ASC']],
      },
      { model: Rating, as: 'ratings', attributes: ['id','score','comment','reviewer_id','worker_id','created_at'] },
    ],
  });
  if (!project) { const e = new Error('Proyecto no encontrado'); e.statusCode = 404; throw e; }
  if (user.role === 'cliente' && project.client_id !== user.id) {
    const e = new Error('Sin acceso a este proyecto'); e.statusCode = 403; throw e;
  }
  if (user.role === 'trabajador' && project.worker_id !== user.id) {
    const e = new Error('Sin acceso a este proyecto'); e.statusCode = 403; throw e;
  }
  return project;
};

const createProject = async (data, adminId) => {
  const service = await Service.findByPk(data.service_id);
  if (!service) { const e = new Error('Servicio no encontrado'); e.statusCode = 404; throw e; }
  const client = await User.findOne({ where: { id: data.client_id, role: 'cliente' } });
  if (!client) { const e = new Error('Cliente no encontrado'); e.statusCode = 404; throw e; }
  return Project.create({ ...data, admin_id: adminId });
};

const updateProjectStatus = async (id, status, user, refundBankDetails) => {
  const project = await Project.findByPk(id);
  if (!project) { const e = new Error('Proyecto no encontrado'); e.statusCode = 404; throw e; }

  // Permisos: Admin puede todo.
  if (user.role === 'trabajador') {
    if (project.worker_id !== user.id) {
      const e = new Error('No tienes permiso para modificar este proyecto'); e.statusCode = 403; throw e;
    }
    // 'en_progreso' ya no es una transición manual: solo ocurre cuando Wompi
    // confirma el pago inicial (ver paymentService.handleWompiWebhook).
    const allowed = ['en_revision', 'completado'];
    if (!allowed.includes(status)) {
      const e = new Error('Como trabajador solo puedes enviar a revisión o completar el proyecto'); e.statusCode = 400; throw e;
    }
  } else if (user.role === 'cliente') {
    if (project.client_id !== user.id) {
      const e = new Error('No tienes permiso para modificar este proyecto'); e.statusCode = 403; throw e;
    }
    // Cliente puede aprobar o completar el proyecto. 'en_progreso' ya no es
    // manual — requiere pagar el 20% inicial (ver paymentService).
    const allowed = ['aprobado', 'completado', 'cancelado'];
    if (!allowed.includes(status)) {
      const e = new Error('Estado no permitido para el cliente'); e.statusCode = 400; throw e;
    }
  } else if (user.role !== 'admin') {
    const e = new Error('Solo personal autorizado puede cambiar el estado'); e.statusCode = 403; throw e;
  }

  // Cancelar con el pago inicial ya cobrado exige los datos bancarios de
  // reembolso en el mismo request — no hay una cuenta de cliente guardada de
  // antes (a diferencia de worker_payout_accounts), se captura ad-hoc acá.
  if (status === 'cancelado') {
    const approvedInitialPayment = await Payment.findOne({
      where: { project_id: id, type: 'inicial', status: 'aprobado' },
    });
    if (approvedInitialPayment) {
      await refundService.createRefundRequest(project, approvedInitialPayment, refundBankDetails);
    }
  }

  const updates = { status };
  if (status === 'completado') updates.actual_end_date = new Date();
  await project.update(updates);

  // Sincronizar estados de tareas con el proyecto
  let taskStatus = status;
  if (status === 'completado') taskStatus = 'completada';
  
  if (['en_progreso', 'en_revision', 'completada'].includes(taskStatus)) {
    await Task.update({ status: taskStatus }, { where: { project_id: id } });
  }

  return project.reload();
};

const deleteProject = async (id) => {
  const project = await Project.findByPk(id);
  if (!project) { const e = new Error('Proyecto no encontrado'); e.statusCode = 404; throw e; }
  await project.destroy();
};

// ── TAREAS ─────────────────────────────────────────────────
const createTask = async (data, createdById) => {
  const project = await Project.findByPk(data.project_id);
  if (!project) { const e = new Error('Proyecto no encontrado'); e.statusCode = 404; throw e; }
  if (data.assigned_to) {
    const worker = await User.findOne({ where: { id: data.assigned_to, role: 'trabajador' } });
    if (!worker) { const e = new Error('Trabajador no encontrado'); e.statusCode = 404; throw e; }
  }
  return Task.create({ ...data, created_by: createdById });
};

const updateTask = async (taskId, data, user) => {
  const task = await Task.findByPk(taskId, { include: [{ model: Project, as: 'project' }] });
  if (!task) { const e = new Error('Tarea no encontrada'); e.statusCode = 404; throw e; }
  if (user.role === 'trabajador') {
    if (task.assigned_to !== user.id) { const e = new Error('Sin acceso a esta tarea'); e.statusCode = 403; throw e; }
    const allowed = ['status','notes','actual_hours','evidence_urls'];
    Object.keys(data).forEach(k => { if (!allowed.includes(k)) delete data[k]; });
  } else if (user.role === 'cliente') {
    if (task.project?.client_id !== user.id) { const e = new Error('Sin acceso a esta tarea'); e.statusCode = 403; throw e; }
    // Cliente puede cambiar estado (ej: aprobar/completar) y notas
    const allowed = ['status','notes'];
    Object.keys(data).forEach(k => { if (!allowed.includes(k)) delete data[k]; });
  } else if (user.role !== 'admin') {
    const e = new Error('Sin acceso a esta tarea'); e.statusCode = 403; throw e;
  }
  if (data.status === 'completada') data.completed_at = new Date();
  await task.update(data);
  // Auto-completar proyecto si todas las tareas están listas
  const pending = await Task.count({ where: { project_id: task.project_id, status: { [Op.ne]: 'completada' } } });
  if (pending === 0) await task.project.update({ status: 'completado', actual_end_date: new Date() });
  return task.reload({ include: [{ model: User, as: 'assignee', attributes: ['id','name','avatar'] }] });
};

const assignTask = async (taskId, workerId) => {
  const task = await Task.findByPk(taskId);
  if (!task) { const e = new Error('Tarea no encontrada'); e.statusCode = 404; throw e; }
  const worker = await User.findOne({ where: { id: workerId, role: 'trabajador' } });
  if (!worker) { const e = new Error('Trabajador no encontrado'); e.statusCode = 404; throw e; }
  await task.update({ assigned_to: workerId, status: 'en_progreso' });
  return task.reload({ include: [{ model: User, as: 'assignee', attributes: ['id','name','avatar'] }] });
};

// ── COTIZACIONES / SOLICITUDES ─────────────────────────────

/**
 * Crea una solicitud de servicio dirigida a un trabajador específico.
 * Status inicial: 'solicitud_pendiente' — el trabajador debe aceptar o rechazar.
 *
 * El cliente no puede escribir el precio: se usa la tarifa vigente que el trabajador
 * publicó para la categoría del servicio. La unidad y el precio se guardan como foto
 * en la solicitud para proteger ambos lados si el profesional cambia su perfil después.
 */
const createQuote = async (data, clientId, io) => {
  const service = await Service.findByPk(data.service_id);
  if (!service) { const e = new Error('Servicio no encontrado'); e.statusCode = 404; throw e; }

  if (!data.worker_id) { const e = new Error('Debes seleccionar un trabajador'); e.statusCode = 400; throw e; }
  const worker = await User.findOne({ where: { id: data.worker_id, role: 'trabajador' } });
  if (!worker) { const e = new Error('Trabajador no encontrado'); e.statusCode = 404; throw e; }

  const client = await User.findByPk(clientId);
  if (!client) { const e = new Error('Cliente no encontrado'); e.statusCode = 404; throw e; }

  const serviceRate = await WorkerServiceRate.findOne({
    where: { worker_id: data.worker_id, specialty: service.category },
  });
  if (!serviceRate) {
    const e = new Error('Este trabajador no tiene un precio publicado para este servicio'); e.statusCode = 400; throw e;
  }

  const pricing_type = serviceRate.price_unit;
  const rateAmount = serviceRate.amount == null ? null : Number(serviceRate.amount);
  let estimated_price = null;
  if (pricing_type === 'por_m2' && data.sq_meters && rateAmount != null) {
    estimated_price = rateAmount * Number(data.sq_meters);
  } else if (['por_dia', 'por_proyecto'].includes(pricing_type)) {
    estimated_price = rateAmount;
  }

  const quote = await Quote.create({
    city: data.city,
    address: data.address,
    sq_meters: data.sq_meters || null,
    occupied: !!data.occupied,
    start_date: data.start_date || null,
    // Solo aplica cuando el trabajador cobra por día — por cualquier otra
    // unidad (hora/m²/proyecto/a convenir) el cliente elige un único día.
    end_date: pricing_type === 'por_dia' ? (data.end_date || null) : null,
    notes: data.notes || null,
    service_id: data.service_id,
    worker_id: data.worker_id,
    client_id: clientId,
    pricing_type,
    estimated_price,
    service_rate_id: serviceRate.id,
    status: 'solicitud_pendiente',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  // Notificar al trabajador via Socket.io
  if (io) {
    io.to(`user:${data.worker_id}`).emit('new_service_request', {
      id: quote.id,
      clientName: client.name,
      serviceName: service.name,
    });
  }

  return quote;
};

/**
 * Obtiene las solicitudes enviadas por un cliente.
 */
const getMyQuotes = async (clientId) => {
  return Quote.findAll({
    where: { client_id: clientId },
    include: [
      { model: Service, as: 'service', attributes: ['id','name','category','image_url'] },
      { model: User, as: 'worker', attributes: ['id','name','avatar','rating_avg'] },
      { model: Project, as: 'project', attributes: ['id','title','status'] },
    ],
    order: [['created_at', 'DESC']],
  });
};

/**
 * Obtiene las solicitudes recibidas por un trabajador.
 */
const getWorkerQuotes = async (workerId) => {
  return Quote.findAll({
    where: {
      worker_id: workerId,
      status: { [Op.in]: ['solicitud_pendiente', 'aceptada', 'rechazada'] },
    },
    include: [
      { model: User, as: 'client', attributes: ['id','name','email','phone','avatar'] },
      { model: Service, as: 'service', attributes: ['id','name','category','image_url'] },
      { model: Project, as: 'project', attributes: ['id','title','status'] },
    ],
    order: [['created_at', 'DESC']],
  });
};

const getAllQuotes = async () => {
  return Quote.findAll({
    include: [
      { model: User, as: 'client',  attributes: ['id','name','email','phone'] },
      { model: Service, as: 'service', attributes: ['id','name','category'] },
      { model: User, as: 'worker',  attributes: ['id','name','avatar'] },
      { model: Project, as: 'project', attributes: ['id','title','status'] },
    ],
    order: [['created_at', 'DESC']],
  });
};

/**
 * Actualiza el estado de una solicitud.
 *
 * TRABAJADOR: solo puede cambiar sus propias solicitudes ('solicitud_pendiente' → 'aceptada' | 'rechazada').
 *   - Si acepta → crea el proyecto automáticamente con la tarifa fija de la solicitud como `budget`.
 *   - Si rechaza → notifica al cliente.
 *
 * ADMIN: puede cambiar cualquier estado para supervisión.
 */
const updateQuoteStatus = async (quoteId, status, estimatedPrice, user, io) => {
  const quote = await Quote.findByPk(quoteId, {
    include: [
      { model: Service, as: 'service', attributes: ['id','name'] },
      { model: User, as: 'client', attributes: ['id','name','email','phone'] },
      { model: User, as: 'worker', attributes: ['id','name','avatar'] },
    ],
  });
  if (!quote) { const e = new Error('Solicitud no encontrada'); e.statusCode = 404; throw e; }

  // ── Validación por rol ──
  if (user.role === 'trabajador') {
    if (quote.worker_id !== user.id) {
      const e = new Error('No tienes permiso para modificar esta solicitud'); e.statusCode = 403; throw e;
    }
    if (!['aceptada', 'rechazada'].includes(status)) {
      const e = new Error('Solo puedes aceptar o rechazar una solicitud'); e.statusCode = 400; throw e;
    }
    if (quote.status !== 'solicitud_pendiente') {
      const e = new Error('Esta solicitud ya fue respondida'); e.statusCode = 409; throw e;
    }
    // Por contrato no hay precio fijo desde la solicitud — el trabajador debe indicar el monto al aceptar.
    if (status === 'aceptada' && quote.estimated_price == null && !estimatedPrice) {
      const e = new Error('Indica el precio final antes de aceptar esta solicitud'); e.statusCode = 400; throw e;
    }
  } else if (user.role === 'admin') {
    const allowed = ['revisada', 'aceptada', 'rechazada', 'expirada', 'solicitud_pendiente'];
    if (!allowed.includes(status)) { const e = new Error('Estado inválido'); e.statusCode = 400; throw e; }
  } else {
    const e = new Error('Sin permiso'); e.statusCode = 403; throw e;
  }

  let projectId = quote.project_id;

  // ── Si se acepta → crear proyecto directamente sin admin ──
  if (status === 'aceptada' && !projectId) {
    try {
      const finalPrice = estimatedPrice || quote.estimated_price;

      const project = await Project.create({
        title: `${quote.service?.name || 'Servicio'} · ${quote.city}`,
        description: quote.notes || 'Proyecto creado al aceptar la solicitud',
        status: 'pendiente',
        city: quote.city,
        address: quote.address,
        sq_meters: quote.sq_meters || null,
        occupied: !!quote.occupied,
        budget: finalPrice || null,
        start_date: quote.start_date || null,
        end_date: quote.end_date || null,
        client_id: quote.client_id,
        worker_id: quote.worker_id,
        admin_id: null,
        service_id: quote.service_id,
        notes: 'Creado automáticamente al aceptar la solicitud',
      });

      // Tarea inicial asignada al trabajador
      await Task.create({
        title: 'Revisión inicial del trabajo',
        description: 'Tarea inicial creada automáticamente al aceptar la solicitud',
        status: 'pendiente',
        priority: 'media',
        project_id: project.id,
        assigned_to: quote.worker_id,
        created_by: quote.worker_id || user.id, // Fallback al ID del usuario actual
      });

      projectId = project.id;

      // Notificar al cliente via Socket.io que fue aceptado
      if (io) {
        io.to(`user:${quote.client_id}`).emit('request_response', {
          type: 'aceptada',
          quoteId: quote.id,
          projectId: project.id,
          workerName: quote.worker?.name || 'El profesional',
          message: '¡Tu solicitud fue aceptada! Ya puedes ver el proyecto.',
        });
      }
    } catch (error) {
      console.error('ERROR CREATING PROJECT FROM QUOTE:', error);
      throw error; // Re-throw to be caught by the controller
    }
  }

  // ── Si se rechaza → notificar al cliente ──
  if (status === 'rechazada' && io) {
    io.to(`user:${quote.client_id}`).emit('request_response', {
      type: 'rechazada',
      quoteId: quote.id,
      workerName: quote.worker?.name || 'El profesional',
      message: 'Tu solicitud fue rechazada. Puedes elegir otro profesional.',
    });
  }

  const updates = { status, project_id: projectId };
  if (estimatedPrice) updates.estimated_price = estimatedPrice;
  if (status === 'aceptada') updates.agreed_price = estimatedPrice || quote.estimated_price;

  await quote.update(updates);
  return quote.reload({
    include: [
      { model: User, as: 'client',  attributes: ['id','name','email','phone'] },
      { model: Service, as: 'service', attributes: ['id','name','category'] },
      { model: User, as: 'worker',  attributes: ['id','name','avatar'] },
      { model: Project, as: 'project', attributes: ['id','title','status'] },
    ],
  });
};

// ── WORKERS ────────────────────────────────────────────────
const getWorkers = async (city) => {
  const where = { role: 'trabajador', is_active: true };
  if (city) where.city = { [Op.iLike]: `%${city}%` };
  return User.findAll({
    where,
    attributes: ['id','name','email','phone','avatar','city','rating_avg','rating_count'],
    include: [{ model: WorkerProfile, as: 'workerProfile' }],
    order: [['rating_avg', 'DESC']],
  });
};

module.exports = {
  getServices, getServiceById, createService,
  getProjects, getProjectById, createProject, updateProjectStatus, deleteProject,
  createTask, updateTask, assignTask,
  createQuote, getMyQuotes, getWorkerQuotes, getAllQuotes, updateQuoteStatus,
  getWorkers,
};
