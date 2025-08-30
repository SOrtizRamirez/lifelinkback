const jwt = require('jsonwebtoken');

function requireAuth(role) {
  return function (req, res, next) {
    const h = req.headers.authorization || '';
    const m = h.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ message: 'Token requerido' });

    try {
      const payload = jwt.verify(m[1], process.env.JWT_SECRET || 'dev_secret_change_me');
      if (role && payload.role !== role) {
        return res.status(403).json({ message: 'Permisos insuficientes' });
      }
      req.user = payload;
      next();
    } catch {
      return res.status(401).json({ message: 'Token inválido o expirado' });
    }
  };
}

module.exports = requireAuth; // <- exporta la función (no un objeto)
