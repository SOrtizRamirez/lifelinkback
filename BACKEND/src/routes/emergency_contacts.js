// routes/emergency_contact.js
const express = require('express');
const pool = require('../config/db');
const requireAuth = require('../middleware/auth'); // <— usa tu factory(role)
const router = express.Router();

// protege TODO el router
router.use(requireAuth('patient'));

// LISTAR: SIEMPRE del paciente autenticado
router.get('/', async (req, res) => {
  const patientId = req.user.sub;
  const { relation, phone, email, fullname, limit = 10, offset = 0 } = req.query;

  const conditions = ['id = ?'];
  const values = [patientId];

  if (relation) { conditions.push('LOWER(relation) LIKE LOWER(?)'); values.push(`%${relation}%`); }
  if (phone)    { conditions.push('phone LIKE ?');                   values.push(`%${phone}%`); }
  if (email)    { conditions.push('LOWER(email) LIKE LOWER(?)');     values.push(`%${email}%`); }
  if (fullname) { conditions.push('LOWER(fullname) LIKE LOWER(?)');  values.push(`%${fullname}%`); }

  values.push(parseInt(limit,10), parseInt(offset,10));
  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  try {
    const [rows] = await pool.query(
      `SELECT contact_id, id, fullname, relation, phone, email
       FROM emergency_contact
       ${whereClause}
       ORDER BY contact_id
       LIMIT ? OFFSET ?`, values);

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS count FROM emergency_contact ${whereClause}`,
      values.slice(0, values.length - 2)
    );

    res.json({ status:'success', data: rows, pagination:{
      total: Number(countRows[0].count), limit: Number(limit), offset: Number(offset)
    }});
  } catch (err) {
    console.error('Error fetching emergency contacts:', err);
    res.status(500).json({ status:'error', message:'Failed to fetch emergency contacts' });
  }
});

// OBTENER UNO (verifica pertenencia)
router.get('/:contact_id', async (req, res) => {
  const patientId = req.user.sub;
  const { contact_id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT contact_id, id, fullname, relation, phone, email
       FROM emergency_contact
       WHERE contact_id = ? AND id = ?`,
      [contact_id, patientId]
    );
    if (!rows.length) return res.status(404).json({ status:'error', message:'Emergency contact not found' });
    res.json({ status:'success', data: rows[0] });
  } catch (err) {
    console.error('Error fetching emergency contact:', err);
    res.status(500).json({ status:'error', message:'Failed to fetch emergency contact' });
  }
});

// CREAR (NO pidas id en el body: usa el del token)
router.post('/', async (req, res) => {
  const patientId = req.user.sub;
  const { fullname, relation, phone, email } = req.body;

  if (!fullname || !relation) {
    return res.status(400).json({ status:'error', message:'Full name and relation are required' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO emergency_contact (id, fullname, relation, phone, email) VALUES (?, ?, ?, ?, ?)',
      [patientId, fullname, relation, phone || null, email || null]
    );

    const [newContact] = await pool.query(
      'SELECT contact_id, id, fullname, relation, phone, email FROM emergency_contact WHERE contact_id = ? AND id = ?',
      [result.insertId, patientId]
    );

    res.status(201).json({ status:'success', data: newContact[0] });
  } catch (err) {
    console.error('Error creating emergency contact:', err);
    res.status(500).json({ status:'error', message:'Failed to create emergency contact' });
  }
});

// ACTUALIZAR (no permitas cambiar de dueño)
router.put('/:contact_id', async (req, res) => {
  const patientId = req.user.sub;
  const { contact_id } = req.params;
  const { fullname, relation, phone, email } = req.body;

  if (!fullname && !relation && !phone && !email) {
    return res.status(400).json({ status:'error', message:'At least one field is required for update' });
  }

  try {
    const sets = [], vals = [];
    if (fullname) { sets.push('fullname = ?'); vals.push(fullname); }
    if (relation) { sets.push('relation = ?'); vals.push(relation); }
    if (phone)    { sets.push('phone = ?');    vals.push(phone); }
    if (email)    { sets.push('email = ?');    vals.push(email); }
    vals.push(contact_id, patientId);

    const [r] = await pool.query(
      `UPDATE emergency_contact SET ${sets.join(', ')} WHERE contact_id = ? AND id = ?`,
      vals
    );
    if (!r.affectedRows) return res.status(404).json({ status:'error', message:'Emergency contact not found' });

    const [updated] = await pool.query(
      'SELECT contact_id, id, fullname, relation, phone, email FROM emergency_contact WHERE contact_id = ? AND id = ?',
      [contact_id, patientId]
    );
    res.json({ status:'success', data: updated[0] });
  } catch (err) {
    console.error('Error updating emergency contact:', err);
    res.status(500).json({ status:'error', message:'Failed to update emergency contact' });
  }
});

// ELIMINAR (solo mis contactos)
router.delete('/:contact_id', async (req, res) => {
  const patientId = req.user.sub;
  const { contact_id } = req.params;

  try {
    const [r] = await pool.query(
      'DELETE FROM emergency_contact WHERE contact_id = ? AND id = ?',
      [contact_id, patientId]
    );
    if (!r.affectedRows) return res.status(404).json({ status:'error', message:'Emergency contact not found' });
    res.json({ status:'success', message:'Emergency contact deleted successfully' });
  } catch (err) {
    console.error('Error deleting emergency contact:', err);
    res.status(500).json({ status:'error', message:'Failed to delete emergency contact' });
  }
});

module.exports = router;
