'use strict';

const { verifyAccessToken, isTokenBlacklisted } = require('../utils/jwt');
const { User } = require('../models');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer '))
      return res.status(401).json({ success: false, message: 'Token requerido' });

    const token = authHeader.split(' ')[1];

    // verifyAccessToken lanza si el token está expirado o tiene firma inválida
    const decoded = verifyAccessToken(token);

    // Comparamos por JTI (36 chars), no por el token completo (~400 chars)
    if (await isTokenBlacklisted(decoded.jti))
      return res.status(401).json({ success: false, message: 'Token inválido' });

    const user = await User.findByPk(decoded.userId);
    if (!user || !user.is_active)
      return res.status(401).json({ success: false, message: 'Usuario no encontrado o inactivo' });

    req.user     = user;
    req.token    = token;
    req.tokenJti = decoded.jti; // disponible para logout sin re-decodificar
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError')
      return res.status(401).json({ success: false, message: 'Token expirado', code: 'TOKEN_EXPIRED' });
    return res.status(401).json({ success: false, message: 'Token inválido' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({
      success: false,
      message: `Acceso denegado. Rol requerido: ${roles.join(' o ')}`,
    });
  next();
};

module.exports = { authenticate, authorize };
