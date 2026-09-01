const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/projectController');
const photoCtrl = require('../controllers/projectPhotoController');
const { authenticate, authorize } = require('../middlewares/auth');
const { singlePhoto } = require('../middlewares/upload');
const { createProjectLimiter } = require('../middlewares/rateLimiter');

const router = Router();
router.use(authenticate);

// ── Servicios ──────────────────────────────────────────────
// GET /services y /services/:id los sirve routes/services.js (montado antes que
// este catch-all), así que se removieron de aquí. Solo POST /services es propio.
router.post('/services', authorize('admin'), [
  body('name').notEmpty().withMessage('Nombre requerido'),
  body('category').isIn(['pintura','enchapes','electricidad','plomeria','obra_gris','carpinteria','impermeabilizacion','otro']).withMessage('Categoría inválida'),
], ctrl.createService);

// ── Workers ────────────────────────────────────────────────
router.get('/workers', ctrl.getWorkers);

// ── Proyectos ──────────────────────────────────────────────
router.get('/projects', ctrl.getProjects);
router.get('/projects/:id', ctrl.getProject);
router.post('/projects', authorize('admin'), createProjectLimiter, [
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
// PATCH /tasks/:id lo sirve routes/tasks.js (montado antes); removido de aquí.
router.patch('/tasks/:id/assign', authorize('admin', 'cliente'), [
  body('worker_id').isUUID().withMessage('ID trabajador inválido'),
], ctrl.assignTask);

// ── Cotizaciones / Solicitudes de Servicio ─────────────────
// Todo /quotes* lo sirve routes/quotes.js (montado antes que este catch-all),
// así que las rutas de cotizaciones que había aquí nunca se ejecutaban y se
// removieron. La lógica de negocio sigue en projectService (que quoteController
// consume). Ver docs/backend.md#duplicación-de-rutas.

module.exports = router;
