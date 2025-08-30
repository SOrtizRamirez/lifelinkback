// controllers/auth.controller.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // o el que uses
const Patients = require('../models/patients'); // adapta a tu acceso a datos

exports.login = async (req, res) => {
  try {
    const { identity_document, password } = req.body;

    const patient = await Patients.findByIdentity(identity_document);
    if (!patient) return res.status(401).json({ message: 'Credenciales inválidas' });

    const ok = await bcrypt.compare(password, patient.password_hash);
    if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });

    const token = jwt.sign(
      { sub: patient.id, role: 'patient' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.json({
      status: 'success',
      token,                                // <-- CLAVE
      data: {
        patient: {
          id: patient.id,
          name: patient.name,
          last_name: patient.last_name,
          identity_document: patient.identity_document,
          // NO devuelvas password_hash
        }
      }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Error interno' });
  }
};
