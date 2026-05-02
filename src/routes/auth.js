const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');

const router = Router();

router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Nombre muy corto'),
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 8 }).withMessage('Mínimo 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Debe tener mayúscula, minúscula y número'),
  body('role').optional().isIn(['cliente','trabajador']).withMessage('Rol inválido'),
], ctrl.register);

router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Contraseña requerida'),
], ctrl.login);

router.post('/oauth', ctrl.oauthSignIn);

router.post('/refresh', ctrl.refreshToken);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);
router.get('/me', authenticate, ctrl.getMe);
router.post('/logout', authenticate, ctrl.logout);

module.exports = router;
