const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../config/db');
const requireAuth  = require('../middleware/auth');

const router = express.Router();

const NV = (v) =>
    v === undefined || v === null || (typeof v === 'string' && v.trim() === '') ? null : v;

function generateQR() {

    return 'QR_' + crypto.randomUUID().replace(/-/g, '').toUpperCase();
}


router.post('/register', async (req, res) => {
    try {
        const {
            identity_document, password,
            name, last_name, gender,
            medical_conditions, health_insurance, phone_number, birth_date,
            blood_type, allergies, current_medications, email
        } = req.body || {};

        const missing = [];
        if (!identity_document) missing.push('identity_document');
        if (!password)          missing.push('password');
        if (!name)              missing.push('name');
        if (!last_name)         missing.push('last_name');
        if (!blood_type)        missing.push('blood_type');
        if (missing.length) {
            return res.status(400).json({ status: 'error', message: 'Campos obligatorios faltan', missing });
        }


        const [dup] = await pool.query(
            'SELECT 1 FROM patients WHERE identity_document=? LIMIT 1',
            [identity_document]
        );
        if (dup.length) return res.status(409).json({ status: 'error', message: 'El documento ya está registrado' });

        const password_hash = await bcrypt.hash(password, 10);

        for (;;) {
            try {
                const qr_identifier = generateQR();

                const [result] = await pool.query(
                    `INSERT INTO patients
           (name, last_name, identity_document, gender,
            medical_conditions, health_insurance, phone_number, birth_date,
            blood_type, allergies, current_medications, email,
            password_hash, qr_identifier)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                    [
                        name, last_name, identity_document, NV(gender),
                        NV(medical_conditions), NV(health_insurance), NV(phone_number), NV(birth_date),
                        blood_type, NV(allergies), NV(current_medications), NV(email),
                        password_hash, qr_identifier
                    ]
                );

                return res.status(201).json({ status: 'ok', data: { id: result.insertId, qr_identifier } });
            } catch (e) {
                if (e && e.code === 'ER_DUP_ENTRY') continue; // reintenta si el UNIQUE del QR colisiona
                throw e;
            }
        }
    } catch (e) {
        console.error('REGISTER ERROR:', e);
        return res.status(500).json({ status: 'error', message: 'Error registrando paciente', detail: e.message });
    }
});


router.get('/me', requireAuth('patient'), async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, name, last_name, identity_document, gender,
                    medical_conditions, health_insurance, phone_number, birth_date,
                    blood_type, allergies, current_medications, email, qr_identifier
             FROM patients WHERE id=? LIMIT 1`,
            [req.user.sub]
        );
        if (!rows.length) return res.status(404).json({ status: 'error', message: 'No encontrado' });
        return res.json({ status: 'ok', data: rows[0] });
    } catch (e) {
        console.error('ME ERROR:', e);
        return res.status(500).json({ status: 'error', message: 'Error obteniendo perfil' });
    }
});


async function rotateQrHandler(req, res) {
    for (;;) {
        try {
            const newQR = generateQR();
            const [r] = await pool.query(
                'UPDATE patients SET qr_identifier=? WHERE id=?',
                [newQR, req.user.sub]
            );
            if (!r.affectedRows) return res.status(404).json({ status: 'error', message: 'No encontrado' });
            return res.json({ status: 'ok', data: { qr_identifier: newQR } });
        } catch (e) {
            if (e && e.code === 'ER_DUP_ENTRY') continue;
            console.error('ROTATE QR ERROR:', e);
            return res.status(500).json({ status: 'error', message: 'No se pudo rotar el QR' });
        }
    }
}
router.post('/me/qr', requireAuth('patient'), rotateQrHandler);

router.post('/me/qr/rotate', requireAuth('patient'), rotateQrHandler);

module.exports = router;

