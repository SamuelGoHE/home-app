const projectService = require('../services/projectService');
const { parsePagination, buildMeta } = require('../utils/pagination');

const createQuote = async (req, res, next) => {
  try {
    // Usamos el servicio de proyectos que ya tiene la lógica de flujo directo
    const quote = await projectService.createQuote(req.body, req.user.id, req.app.get('io'));
    res.status(201).json({ success: true, message: 'Solicitud enviada con éxito', data: quote });
  } catch (error) {
    next(error);
  }
};

const getMyQuotes = async (req, res, next) => {
  try {
    const { page, pageSize, limit, offset } = parsePagination(req.query);
    const { rows, count } = await projectService.getMyQuotes(req.user.id, { limit, offset });
    res.json({ success: true, data: rows, pagination: buildMeta({ total: count, page, pageSize }) });
  } catch (error) {
    next(error);
  }
};

const getWorkerQuotes = async (req, res, next) => {
  try {
    const { page, pageSize, limit, offset } = parsePagination(req.query);
    const { rows, count } = await projectService.getWorkerQuotes(req.user.id, { limit, offset });
    res.json({ success: true, data: rows, pagination: buildMeta({ total: count, page, pageSize }) });
  } catch (error) {
    next(error);
  }
};

const updateQuoteStatus = async (req, res, next) => {
  try {
    const { status, estimatedPrice } = req.body;
    // El servicio también maneja la creación automática del proyecto si se acepta
    const quote = await projectService.updateQuoteStatus(req.params.id, status, estimatedPrice, req.user, req.app.get('io'));
    res.json({ success: true, message: `Solicitud ${status} con éxito`, data: quote });
  } catch (error) {
    next(error);
  }
};

const getAllQuotes = async (req, res, next) => {
  try {
    const { page, pageSize, limit, offset } = parsePagination(req.query);
    const { rows, count } = await projectService.getAllQuotes({ limit, offset });
    res.json({ success: true, data: rows, pagination: buildMeta({ total: count, page, pageSize }) });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createQuote,
  getMyQuotes,
  getWorkerQuotes,
  updateQuoteStatus,
  getAllQuotes,
};
