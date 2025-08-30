const express = require('express');
const pool = require('../config/db');
const requireAuth = require('../middleware/auth');

const router = express.Router();


router.get('/qr/:qr', requireAuth('doctor'), async (req, res) => {
    try {
        const { qr } = req.params;
        const [pRows] = await pool.query(
            `SELECT id, identity_document, name, last_name,
                    blood_type, allergies, medical_conditions, current_medications
             FROM patients WHERE qr_identifier=? LIMIT 1`,
            [qr]
        );
        if (!pRows.length) return res.status(404).json({ status: 'error', message: 'QR no encontrado' });

        const pid = pRows[0].id;
        const [cRows] = await pool.query(
            `SELECT contact_id, fullname, relation, phone, email
         FROM emergency_contact
        WHERE id=?
        ORDER BY contact_id DESC`,
            [pid]
        );

        const { id, ...patient } = pRows[0];
        return res.json({ status: 'ok', data: { ...patient, emergency_contacts: cRows } });
    } catch (e) {
        console.error('DOCTOR QR ERROR:', e);
        return res.status(500).json({ status: 'error', message: 'Error leyendo QR (doctor)' });
    }
});

module.exports = router;
