// middlewares/auth.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ message: 'Token requerido' });

  try {
    req.user = jwt.verify(m[1], process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};


