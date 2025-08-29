// BACKEND/src/middleware/auth.js (CommonJS)
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

function requireAuth(role) {
    return (req, res, next) => {
        const header = req.headers.authorization || '';
        const [, token] = header.split(' ');
        if (!token) return res.status(401).json({ status: 'error', message: 'Token requerido' });

        try {
            const payload = jwt.verify(token, JWT_SECRET);
            if (role && payload.role !== role) {
                return res.status(403).json({ status: 'error', message: 'Rol no autorizado' });
            }
            req.user = payload;
            next();
        } catch (e) {
            return res.status(401).json({ status: 'error', message: 'Token inválido/expirado' });
        }
    };
}

const signToken = (sub, role) =>
    jwt.sign({ sub, role }, JWT_SECRET, { expiresIn: '2h' });

module.exports = { requireAuth, signToken };

