const { verifyAccessToken, isTokenBlacklisted } = require('../utils/jwt');
const { User } = require('../models');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer '))
      return res.status(401).json({ success: false, message: 'Token requerido' });

    const token = authHeader.split(' ')[1];
    if (await isTokenBlacklisted(token))
      return res.status(401).json({ success: false, message: 'Token inválido' });

    const decoded = verifyAccessToken(token);
    const user = await User.findByPk(decoded.userId);
    if (!user || !user.is_active)
      return res.status(401).json({ success: false, message: 'Usuario no encontrado' });

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    const msg = error.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido';
    const code = error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : undefined;
    return res.status(401).json({ success: false, message: msg, ...(code && { code }) });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ success: false, message: `Acceso denegado. Rol requerido: ${roles.join(' o ')}` });
  next();
};

module.exports = { authenticate, authorize };
