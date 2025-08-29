const express = require('express');
const pool = require('../config/db');
const router = express.Router();

router.get('/', async (req, res) => {
    const { id, relation, phone, email, fullname, limit = 10, offset = 0 } = req.query;

    const conditions = [];
    const values = [];

    if (id) {
        conditions.push(`id = ?`);
        values.push(id); 
    }
    if (relation) {
        conditions.push(`LOWER(relation) LIKE LOWER(?)`);
        values.push(`%${relation}%`);
    }
    if (phone) {
        conditions.push(`phone LIKE ?`);
        values.push(`%${phone}%`);
    }
    if (email) {
        conditions.push(`LOWER(email) LIKE LOWER(?)`);
        values.push(`%${email}%`);
    }
    if (fullname) {
        conditions.push(`LOWER(fullname) LIKE LOWER(?)`);
        values.push(`%${fullname}%`);
    }
    values.push(parseInt(limit), parseInt(offset));
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
        const query = `
            SELECT contact_id, id, fullname, relation, phone, email
            FROM emergency_contact
            ${whereClause}
            ORDER BY contact_id
            LIMIT ? OFFSET ?
        `;
        const [rows] = await pool.query(query, values);

        const countQuery = `SELECT COUNT(*) as count FROM emergency_contact ${whereClause}`;
        const [countRows] = await pool.query(countQuery, values.slice(0, values.length - 2));

        res.json({
            status: 'success',
            data: rows,
            pagination: {
                total: parseInt(countRows[0].count, 10),
                limit: parseInt(limit, 10),
                offset: parseInt(offset, 10)
            }
        });
    } catch (err) {
        console.error('Error fetching emergency contacts:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch emergency contacts'
        });
    }
});

router.get('/:contact_id', async (req, res) => {
    const { contact_id } = req.params;
    try {
        const [rows] = await pool.query('SELECT contact_id, id, fullname, relation, phone, email FROM emergency_contact WHERE contact_id = ?', [contact_id]);
        if (rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Emergency contact not found'
            });
        }
        res.json({
            status: 'success',
            data: rows[0]
        });
    } catch (err) {
        console.error('Error fetching emergency contact:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch emergency contact'
        });
    }
});

router.post('/', async (req, res) => {
    const { id, fullname, relation, phone, email } = req.body;

    if (!id || !fullname || !relation) {
        return res.status(400).json({
            status: 'error',
            message: 'Patient ID, full name, and relation are required'
        });
    }

    try {
        const [patient] = await pool.query('SELECT id FROM patients WHERE id = ?', [id]);
        if (patient.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Patient not found'
            });
        }

        const query = `
            INSERT INTO emergency_contact (id, fullname, relation, phone, email)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await pool.query(query, [id, fullname, relation, phone, email]);

        const [newContact] = await pool.query('SELECT contact_id, id, fullname, relation, phone, email FROM emergency_contact WHERE contact_id = ?', [result.insertId]);

        res.status(201).json({
            status: 'success',
            data: newContact[0]
        });
    } catch (err) {
        console.error('Error creating emergency contact:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create emergency contact'
        });
    }
});

router.put('/:contact_id', async (req, res) => {
    const { contact_id } = req.params;
    const { id, fullname, relation, phone, email } = req.body;

    if (!id && !fullname && !relation && !phone && !email) {
        return res.status(400).json({
            status: 'error',
            message: 'At least one field is required for update'
        });
    }

    try {
        if (id) {
            const [patient] = await pool.query('SELECT id FROM patients WHERE id = ?', [id]);
            if (patient.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Patient not found'
                });
            }
        }

        const updates = [];
        const values = [];

        if (id) {
            updates.push(`id = ?`);
            values.push(id);
        }
        if (fullname) {
            updates.push(`fullname = ?`);
            values.push(fullname);
        }
        if (relation) {
            updates.push(`relation = ?`);
            values.push(relation);
        }
        if (phone) {
            updates.push(`phone = ?`);
            values.push(phone);
        }
        if (email) {
            updates.push(`email = ?`);
            values.push(email);
        }

        values.push(contact_id);

        const query = `UPDATE emergency_contact SET ${updates.join(', ')} WHERE contact_id = ?`;
        const [result] = await pool.query(query, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Emergency contact not found'
            });
        }
        const [updatedContact] = await pool.query('SELECT contact_id, id, fullname, relation, phone, email FROM emergency_contact WHERE contact_id = ?', [contact_id]);
        res.json({
            status: 'success',
            data: updatedContact[0]
        });
    } catch (err) {
        console.error('Error updating emergency contact:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update emergency contact'
        });
    }
});

router.delete('/:contact_id', async (req, res) => {
    const { contact_id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM emergency_contact WHERE contact_id = ?', [contact_id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Emergency contact not found'
            });
        }
        res.json({
            status: 'success',
            message: 'Emergency contact deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting emergency contact:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete emergency contact'
        });
    }
});

module.exports = router;