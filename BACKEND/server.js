const express = require('express');
const cors = require('cors');
const patientRoutes = require('./src/routes/patients.js');
const authRoutes = require('./src/routes/auth.js');
const publicRoutes = require('./src/routes/public.js');
const doctorRoutes = require('./src/routes/doctor.js');
const emergencyContactsRoutes = require('./src/routes/emergency_contacts.js');
const bcrypt = require('bcrypt');
const pool = require('./src/config/db.js');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/auth', require('./src/routes/auth'));

app.get('/test-db', async (req, res) => {
    try {
        const pool = require('./src/config/db');
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


app.use('/patients', require('./src/routes/patients'));
app.use('/public', require('./src/routes/public'));
app.use('/doctor', require('./src/routes/doctor'));
app.use('/emergency-contacts', require('./src/routes/emergency_contacts'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
