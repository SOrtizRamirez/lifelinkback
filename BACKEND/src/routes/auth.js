// BACKEND/src/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db'); 

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

function safeBcryptCompare(plain, hash) {
    if (!plain || !hash || typeof hash !== 'string') return Promise.resolve(false);
    // si no parece bcrypt ($2a/$2b/$2y) devolver false sin romper
    if (!hash.startsWith('$2')) return Promise.resolve(false);
    return bcrypt.compare(plain, hash).catch(() => false);
}
router.get('/test', async (req,res)=>{
    console.log("hola")
    return res.json("hola")
})

router.post('/patient/login', async (req, res) => {
    try {
        const { identity_document, password } = req.body || {};
        if (!identity_document || !password) {
            return res.status(400).json({ status: 'error', message: 'Faltan credenciales' });
        }

        // ⬇️ QUITA "password" del SELECT
        const [rows] = await pool.query(
            'SELECT id, password_hash FROM patients WHERE identity_document=? LIMIT 1',
            [identity_document]
        );

        if (!rows.length) {
            return res.status(401).json({ status: 'error', message: 'Documento no encontrado' });
        }

        const hash = rows[0].password_hash || '';
        if (!hash.startsWith('$2')) {
            return res.status(401).json({ status: 'error', message: 'Usuario sin contraseña configurada' });
        }

        const ok = await bcrypt.compare(password, hash);
        if (!ok) {
            return res.status(401).json({ status: 'error', message: 'Contraseña incorrecta' });
        }

        const token = jwt.sign({ sub: rows[0].id, role: 'patient' }, JWT_SECRET, { expiresIn: '2h' });
        return res.json({ status: 'ok', token });
    } catch (e) {
        console.error('PATIENT LOGIN ERROR:', e);
        return res.status(500).json({ status: 'error', message: 'Error en login', detail: e.message });
    }
});


router.post('/doctor/login', async (req, res) => {
    try {
        const rawEmail = (req.body?.email ?? '').trim();
        const password = req.body?.password ?? '';

        if (!rawEmail || !password) {
            return res.status(400).json({ status: 'error', message: 'Faltan credenciales' });
        }

        const email = rawEmail.toLowerCase();

        const [rows] = await pool.query(
            'SELECT doctor_id, email, password_hash FROM doctor WHERE email = ? LIMIT 1',
            [email]
        );

        if (!rows.length) {
            console.warn('DOCTOR LOGIN: email no encontrado ->', email);
            return res.status(401).json({ status: 'error', message: 'Email o contraseña incorrectos' });
        }

        const row = rows[0];
        const hash = row.password_hash || '';

        if (!hash.startsWith('$2')) {
            console.warn('DOCTOR LOGIN: hash inválido para', row.email);
            return res.status(401).json({ status: 'error', message: 'Email o contraseña incorrectos' });
        }

        const ok = await bcrypt.compare(password, hash);
        if (!ok) {
            console.warn('DOCTOR LOGIN: contraseña incorrecta para', row.email);
            return res.status(401).json({ status: 'error', message: 'Email o contraseña incorrectos' });
        }

        const token = jwt.sign({ sub: row.doctor_id, role: 'doctor' }, JWT_SECRET, { expiresIn: '2h' });
        return res.json({ status: 'ok', token });
    } catch (e) {
        console.error('DOCTOR LOGIN ERROR:', e);
        return res.status(500).json({ status: 'error', message: 'Error en login doctor', detail: e.message });
    }
});

module.exports = router;
