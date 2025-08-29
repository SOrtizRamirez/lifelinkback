const express = require('express');
const cors = require('cors');
const patientRoutes = require('./routes/patients.js');
const authRoutes = require('./routes/auth.js');
const publicRoutes = require('./routes/public.js');
const doctorRoutes = require('./routes/doctor.js');
const emergencyContactsRoutes = require('./routes/emergency_contacts.js');
const bcrypt = require('bcrypt');
const pool = require('../src/config/db.js');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/auth', require('./routes/auth'));

app.get('/test-db', async (req, res) => {
    try {
        const pool = require('./config/db');
        const [rows] = await pool.query('SELECT NOW() AS now');
        res.json({
            status: 'success',
            data: rows[0]
        });
    } catch (err) {
        console.error('Error testing database connection:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to connect to database'
        });
    }
});


app.use('/patients', require('./routes/patients'));
app.use('/public', require('./routes/public'));
app.use('/doctor', require('./routes/doctor'));
app.use('/emergency-contacts', require('./routes/emergency_contacts'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
