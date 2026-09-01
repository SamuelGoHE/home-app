const { validationResult } = require('express-validator');
const svc = require('../services/projectService');
const { parsePagination, buildMeta } = require('../utils/pagination');

// ── Servicios ──────────────────────────────────────────────
const getServices   = async (req, res) => { try { res.json({ success: true, data: await svc.getServices(req.query.category) }); } catch (e) { res.status(500).json({ success: false, message: e.message }); } };
const getService    = async (req, res) => { try { res.json({ success: true, data: await svc.getServiceById(req.params.id) }); } catch (e) { res.status(e.statusCode||500).json({ success: false, message: e.message }); } };
const createService = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    res.status(201).json({ success: true, data: await svc.createService(req.body) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── Proyectos ──────────────────────────────────────────────
const getProjects   = async (req, res) => {
  try {
    const { page, pageSize, limit, offset } = parsePagination(req.query);
    const { rows, count } = await svc.getProjects(req.user, { limit, offset });
    res.json({ success: true, data: rows, pagination: buildMeta({ total: count, page, pageSize }) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
const getProject    = async (req, res) => { try { res.json({ success: true, data: await svc.getProjectById(req.params.id, req.user) }); } catch (e) { res.status(e.statusCode||500).json({ success: false, message: e.message }); } };
const createProject = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    res.status(201).json({ success: true, message: 'Proyecto creado', data: await svc.createProject(req.body, req.user.id) });
  } catch (e) { res.status(e.statusCode||500).json({ success: false, message: e.message }); }
};
const updateStatus  = async (req, res) => { try { res.json({ success: true, data: await svc.updateProjectStatus(req.params.id, req.body.status, req.user, req.body.refundBankDetails) }); } catch (e) { res.status(e.statusCode||500).json({ success: false, message: e.message }); } };
const deleteProject = async (req, res) => { try { await svc.deleteProject(req.params.id); res.json({ success: true, message: 'Proyecto eliminado' }); } catch (e) { res.status(e.statusCode||500).json({ success: false, message: e.message }); } };

// ── Tareas ─────────────────────────────────────────────────
const createTask = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    res.status(201).json({ success: true, message: 'Tarea creada', data: await svc.createTask(req.body, req.user.id) });
  } catch (e) { res.status(e.statusCode||500).json({ success: false, message: e.message }); }
};
const updateTask = async (req, res) => { try { res.json({ success: true, data: await svc.updateTask(req.params.id, req.body, req.user) }); } catch (e) { res.status(e.statusCode||500).json({ success: false, message: e.message }); } };
const assignTask = async (req, res) => { try { res.json({ success: true, message: 'Tarea asignada', data: await svc.assignTask(req.params.id, req.body.worker_id) }); } catch (e) { res.status(e.statusCode||500).json({ success: false, message: e.message }); } };

// ── Cotizaciones / Solicitudes ──────────────────────────────
const createQuote  = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const quote = await svc.createQuote(req.body, req.user.id);

    // Notificar al trabajador en tiempo real via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.body.worker_id}`).emit('new_service_request', {
        quoteId: quote.id,
        clientId: req.user.id,
        clientName: req.user.name,
        city: quote.city,
        address: quote.address,
        message: `Nueva solicitud de servicio de ${req.user.name}`,
      });
    }

    res.status(201).json({ success: true, message: 'Solicitud enviada al trabajador', data: quote });
  } catch (e) { res.status(e.statusCode||500).json({ success: false, message: e.message }); }
};

const getMyQuotes      = async (req, res) => {
  try {
    const { page, pageSize, limit, offset } = parsePagination(req.query);
    const { rows, count } = await svc.getMyQuotes(req.user.id, { limit, offset });
    res.json({ success: true, data: rows, pagination: buildMeta({ total: count, page, pageSize }) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
const getWorkerQuotes  = async (req, res) => {
  try {
    const { page, pageSize, limit, offset } = parsePagination(req.query);
    const { rows, count } = await svc.getWorkerQuotes(req.user.id, { limit, offset });
    res.json({ success: true, data: rows, pagination: buildMeta({ total: count, page, pageSize }) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
const getAllQuotes      = async (req, res) => {
  try {
    const { page, pageSize, limit, offset } = parsePagination(req.query);
    const { rows, count } = await svc.getAllQuotes({ limit, offset });
    res.json({ success: true, data: rows, pagination: buildMeta({ total: count, page, pageSize }) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const updateQuoteStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const io = req.app.get('io');
    res.json({
      success: true,
      message: 'Estado de solicitud actualizado',
      data: await svc.updateQuoteStatus(req.params.id, req.body.status, req.body.estimated_price, req.user, io),
    });
  } catch (e) { res.status(e.statusCode || 500).json({ success: false, message: e.message }); }
};

// ── Workers ────────────────────────────────────────────────
const getWorkers = async (req, res) => { try { res.json({ success: true, data: await svc.getWorkers(req.query.city) }); } catch (e) { res.status(500).json({ success: false, message: e.message }); } };

module.exports = {
  getServices, getService, createService,
  getProjects, getProject, createProject, updateStatus, deleteProject,
  createTask, updateTask, assignTask,
  createQuote, getMyQuotes, getWorkerQuotes, getAllQuotes, updateQuoteStatus,
  getWorkers,
};
