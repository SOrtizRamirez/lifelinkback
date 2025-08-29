// BACKEND/src/routes/public.js
const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// Público: sin login → solo básicos del paciente por QR
router.get('/qr/:qr', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT blood_type, allergies, medical_conditions, current_medications
       FROM patients WHERE qr_identifier=? LIMIT 1`,
            [req.params.qr]
        );
        if (!rows.length) return res.status(404).json({ status: 'error', message: 'QR no encontrado' });
        return res.json({ status: 'ok', data: rows[0] });
    } catch (e) {
        console.error('PUBLIC QR ERROR:', e);
        return res.status(500).json({ status: 'error', message: 'Error leyendo QR' });
    }
});

module.exports = router;
