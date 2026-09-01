const { validationResult } = require('express-validator');
const svc = require('../services/projectService');
const { parsePagination, buildMeta } = require('../utils/pagination');

// ── Servicios ──────────────────────────────────────────────
// GET de servicios los sirve serviceController (routes/services.js). Aquí solo
// queda POST /services, propio de este router.
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
const assignTask = async (req, res) => { try { res.json({ success: true, message: 'Tarea asignada', data: await svc.assignTask(req.params.id, req.body.worker_id) }); } catch (e) { res.status(e.statusCode||500).json({ success: false, message: e.message }); } };

// Nota: las cotizaciones (`/quotes*`) las sirve quoteController (routes/quotes.js),
// y `PATCH /tasks/:id` lo sirve taskController (routes/tasks.js). Sus handlers
// duplicados vivían aquí pero nunca se ejecutaban (routers dedicados montados
// antes que el catch-all /api) — se removieron. La lógica de negocio de quotes
// sigue en projectService, que quoteController consume.

// ── Workers ────────────────────────────────────────────────
const getWorkers = async (req, res) => { try { res.json({ success: true, data: await svc.getWorkers(req.query.city) }); } catch (e) { res.status(500).json({ success: false, message: e.message }); } };

module.exports = {
  createService,
  getProjects, getProject, createProject, updateStatus, deleteProject,
  createTask, assignTask,
  getWorkers,
};
