const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/projectController');
const photoCtrl = require('../controllers/projectPhotoController');
const { authenticate, authorize } = require('../middlewares/auth');
const { singlePhoto } = require('../middlewares/upload');

const router = Router();
router.use(authenticate);

// ── Servicios ──────────────────────────────────────────────
router.get('/services', ctrl.getServices);
router.get('/services/:id', ctrl.getService);
router.post('/services', authorize('admin'), [
  body('name').notEmpty().withMessage('Nombre requerido'),
  body('category').isIn(['pintura','enchapes','electricidad','plomeria','obra_gris','carpinteria','impermeabilizacion','otro']).withMessage('Categoría inválida'),
], ctrl.createService);

// ── Workers ────────────────────────────────────────────────
router.get('/workers', ctrl.getWorkers);

// ── Proyectos ──────────────────────────────────────────────
router.get('/projects', ctrl.getProjects);
router.get('/projects/:id', ctrl.getProject);
router.post('/projects', authorize('admin'), [
  body('title').notEmpty().withMessage('Título requerido'),
  body('city').notEmpty().withMessage('Ciudad requerida'),
  body('address').notEmpty().withMessage('Dirección requerida'),
  body('client_id').isUUID().withMessage('ID cliente inválido'),
  body('service_id').isUUID().withMessage('ID servicio inválido'),
], ctrl.createProject);
router.patch('/projects/:id/status', authorize('admin', 'trabajador', 'cliente'), [
  body('status').isIn(['pendiente','en_revision','aprobado','en_progreso','pausado','completado','cancelado']).withMessage('Estado inválido'),
], ctrl.updateStatus);
router.delete('/projects/:id', authorize('admin', 'cliente'), ctrl.deleteProject);

// ── Fotos del proyecto (antes/durante/después) ──────────────
router.get('/projects/:id/photos', photoCtrl.listPhotos);
router.post('/projects/:id/photos', authorize('trabajador', 'admin'), singlePhoto('photo'), [
  body('stage').isIn(['antes', 'durante', 'despues']).withMessage('Etapa inválida'),
], photoCtrl.addPhoto);
router.delete('/photos/:photoId', authorize('trabajador', 'admin'), photoCtrl.deletePhoto);

// ── Tareas ─────────────────────────────────────────────────
router.post('/tasks', authorize('admin', 'trabajador', 'cliente'), [
  body('title').notEmpty().withMessage('Título requerido'),
  body('project_id').isUUID().withMessage('ID proyecto inválido'),
], ctrl.createTask);
router.patch('/tasks/:id', ctrl.updateTask);
router.patch('/tasks/:id/assign', authorize('admin', 'cliente'), [
  body('worker_id').isUUID().withMessage('ID trabajador inválido'),
], ctrl.assignTask);

// ── Cotizaciones / Solicitudes de Servicio ─────────────────

// CLIENTE: Crear solicitud dirigida a un trabajador específico
router.post('/quotes', authorize('cliente'), [
  body('service_id').isUUID().withMessage('Servicio inválido'),
  body('worker_id').isUUID().withMessage('Debes seleccionar un trabajador'),
  body('city').notEmpty().withMessage('Ciudad requerida'),
  body('address').notEmpty().withMessage('Dirección requerida'),
], ctrl.createQuote);

// CLIENTE: Ver mis solicitudes enviadas
router.get('/quotes/me', authorize('cliente'), ctrl.getMyQuotes);

// TRABAJADOR: Ver solicitudes recibidas
router.get('/quotes/worker', authorize('trabajador'), ctrl.getWorkerQuotes);

// ADMIN: Ver todas las solicitudes (rol supervisor)
router.get('/quotes', authorize('admin'), ctrl.getAllQuotes);

// TRABAJADOR + ADMIN: Cambiar estado de una solicitud
// Trabajador → solo 'aceptada' | 'rechazada' sobre sus propias solicitudes
// Admin → puede cambiar cualquier estado para supervisión
router.patch('/quotes/:id/status', authorize('trabajador', 'admin'), [
  body('status').isIn(['solicitud_pendiente','revisada','aceptada','rechazada','expirada']).withMessage('Estado inválido'),
], ctrl.updateQuoteStatus);

module.exports = router;
