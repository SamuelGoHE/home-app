const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

// PATCH /api/tasks/:id
router.patch('/:id', taskController.updateTask);

module.exports = router;
