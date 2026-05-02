const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');

// GET /api/services
router.get('/', serviceController.getServices);

// GET /api/services/:id
router.get('/:id', serviceController.getService);

module.exports = router;
