# LifeLink QR — README

> **LifeLink QR** es una plataforma de información médica de emergencia. Permite a cada persona llevar un **QR único** (en manilla, sticker o wallet del teléfono) que, al escanearse, muestra **alergias, medicamentos, enfermedades base y contactos de emergencia**. El acceso completo se protege con **autenticación de usuario** y un **ingreso para personal médico**.

---

## 📌 Objetivos del proyecto

- **Acceso rápido** a datos críticos en urgencias.
- **Seguridad y privacidad**: solo el paciente (login) o personal médico verificado ven los datos completos.
- **Experiencia simple**: flujo de registro → formulario clínico → generación de **QR**.
- **Desplegable** en web (frontend Vite) y API (Express).

---

## 🧱 Arquitectura

- **Frontend**: [Vite](https://vitejs.dev/) + JavaScript Vanilla (sin framework).  
  - Enrutado simple por páginas (login, registro, formulario, visor del QR).
  - Consumo de API vía `fetch`.
  - Variables de entorno con prefijo `VITE_` (p. ej. `VITE_API_BASE_URL`).

- **Backend**: Node.js + Express.  
  - Rutas principales: **/auth**, **/patients**, **/emergency-contacts**.
  - **JWT** para autenticación.
  - **CORS** configurado para dominios del frontend.
  - **Base de datos**: MySQL/MariaDB (desarrollo actual). *(Futuro: compatibilidad PostgreSQL).*

- **QR**: Código único por paciente, apunta a una URL segura que resuelve los datos mínimos (y completos si hay autorización).

---

## 🗂️ Estructura de carpetas (monorepo sugerida)

```txt
LifeLink/
├─ FRONTEND/
│  ├─ index.html
│  ├─ src/
│  │  ├─ main.js
│  │  ├─ api/             # helpers de fetch (auth, patients, contacts, qr)
│  │  ├─ auth/            # login/registro
│  │  ├─ views/           # form.html, info.html, etc. (si manejas multipáginas)
│  │  └─ styles/
│  ├─ public/             # SOLO estáticos (iconos, imágenes). NO JS de negocio.
│  ├─ vite.config.js
│  ├─ package.json
│  └─ .env.example
├─ BACKEND/
│  ├─ src/
│  │  ├─ routes/
│  │  │  ├─ auth.js
│  │  │  ├─ patients.js
│  │  │  └─ emergency_contacts.js
│  │  ├─ controllers/
│  │  ├─ middleware/
│  │  │  ├─ auth.js       # verifica JWT
│  │  │  └─ cors.js
│  │  ├─ models/          # consultas a BD
│  │  └─ config/
│  │     └─ db.js         # mysql2 pool
│  ├─ package.json
│  └─ .env.example
└─ docs/
   ├─ prd/
   ├─ diagrams/           # UML, navegación, ER, relacional
   └─ api.postman_collection.json
```

> **Importante (Vite):** coloca tus scripts en `FRONTEND/src` y **no** intentes cargarlos desde `public/src/...`. Los archivos en `public/` se sirven tal cual, sin transformación de Vite.

---

## 🔧 Requisitos

- Node.js **18+**
- npm **9+**
- MySQL **8+** / MariaDB **10.5+**
- (Opcional) Postman/Insomnia para probar la API

---

## 🔐 Variables de entorno

### Backend (`BACKEND/.env`)
```ini
# Servidor
PORT=3000

# Base de datos (MySQL/MariaDB)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=changeme
DB_NAME=lifelink

# Seguridad
JWT_SECRET=pon_un_secreto_fuerte

# CORS (separa por coma si hay varios)
CORS_ORIGIN=http://localhost:5173,https://tu-frontend-produccion

# (Opcional) LOG_LEVEL=info
```

### Frontend (`FRONTEND/.env`)
```ini
# URL base de la API
VITE_API_BASE_URL=http://localhost:3000
```

En código de frontend, usa:
```js
export const API_BASE = import.meta.env.VITE_API_BASE_URL || `http://${location.hostname}:3000`;
```

---

## ⚙️ Puesta en marcha (local)

### 1) Backend
```bash
cd BACKEND
npm install
npm run dev   # o npm start si no usas nodemon
```

**Conexión rápida a BD (mysql2):**
```js
// src/config/db.js (ejemplo)
const mysql = require('mysql2/promise');
module.exports = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});
```

**Esquema mínimo (SQL de ejemplo):**
```sql
CREATE TABLE patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,             -- si separas usuario/credenciales
  full_name VARCHAR(120) NOT NULL,
  blood_type VARCHAR(5),
  allergies TEXT,
  conditions TEXT,
  medications TEXT,
  qr_code VARCHAR(64) UNIQUE,   -- identificador/slug del QR
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE emergency_contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  relationship VARCHAR(60),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE medical_staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  professional_card VARCHAR(40) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL, -- si les das cuenta propia
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Para usuarios (pacientes) si separas auth:
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(160) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2) Frontend
```bash
cd FRONTEND
npm install
npm run dev
# Vite abre en http://localhost:5173
```

---

## 🛣️ Endpoints principales (actual & plan)

> Los nombres pueden variar según tu repo; aquí va la **convención recomendada** (coincide con lo ya usado en el proyecto).

### Auth
- `POST /auth/patient/register` → Crea usuario paciente.
- `POST /auth/patient/login` → Devuelve **JWT**.
- `POST /auth/doctor/login` → Login de personal médico (con **tarjeta profesional**).

### Paciente
- `GET /patients/me` → Datos del paciente autenticado (**Bearer token**).
- `PUT /patients/me` → Actualiza datos clínicos.
- `GET /patients/:id/qr` → Obtiene/rehace QR (o `GET /qr/me`).

### Contactos de emergencia
- `GET /emergency-contacts` → Lista del paciente autenticado.
- `POST /emergency-contacts` → Crea contacto.
- `PUT /emergency-contacts/:id`
- `DELETE /emergency-contacts/:id`

### Acceso personal médico
- `POST /medical/verify` → Verifica `professional_card` (si usas verificación).
- `GET /medical/patients/:qr_code` → Muestra ficha del paciente por QR (sólo staff).

**Ejemplo de uso (cURL):**
```bash
# Login paciente
curl -X POST $API/auth/patient/login   -H "Content-Type: application/json"   -d '{"email":"user@example.com","password":"secret"}'

# Leer perfil
curl -X GET $API/patients/me   -H "Authorization: Bearer <JWT>"

# Crear contacto
curl -X POST $API/emergency-contacts   -H "Authorization: Bearer <JWT>"   -H "Content-Type: application/json"   -d '{"name":"Mamá","phone":"+57 3xx xxx xxxx","relationship":"Madre"}'
```

---

## 🔒 Seguridad y privacidad

- **JWT** con expiración razonable (p. ej. 1h) y **refresh** si lo implementas.
- **CORS**: permitir solo orígenes del frontend.
- **HTTPS** en producción.
- Minimiza lo que se muestra en la **vista pública del QR** (p. ej. alergias críticas y teléfono ICE), y requiere login/staff para el resto.
- Considera **Rate limiting** y **Helmet** en Express.
- No expongas secretos en el frontend. Usa `VITE_*` solo para URLs/flags públicos.

---

## 🚀 Despliegue

### Frontend (Vercel o Netlify)
- **Build command:** `npm run build`
- **Publish/Output:** `dist`
- Variables de entorno:  
  - `VITE_API_BASE_URL=https://tu-backend.tld`

**Netlify**
- Build: `npm run build`
- Publish directory: `dist`

**Vercel**
- Framework preset: **Vite**
- Añade `VITE_API_BASE_URL` en **Project Settings → Environment Variables**.

### Backend (Render, Railway o VPS)
- Instalar dependencias y definir **Start command** (`npm start`).
- Configurar variables `.env` (DB, JWT, CORS).
- Asegúrate de:
  - `app.use(cors({...}))` **antes** de las rutas.
  - Responder `application/json`.
  - Exponer solo rutas necesarias.

> **Nota sobre Vercel (protección de despliegue):** si usas Vercel para el backend y ves páginas de “Authentication Required” en **previews**, desactiva la protección de preview o autoriza el frontend. De preferencia hospeda el **backend** en un servicio tipo **Render/Railway** para evitar fricción con serverless + previews.

---

## 🧪 Pruebas rápidas (Postman/Insomnia)

Incluye la colección `docs/api.postman_collection.json` con ejemplos de:
- Registro/Login paciente
- CRUD de `patients/me`
- CRUD de `emergency-contacts`
- Login staff y lectura por `qr_code`

---

## 🧭 Flujo funcional

1. **Registro / Login** del paciente.  
2. Completa **formulario clínico** y contactos de emergencia.  
3. Genera y descarga **QR** (se sugiere un endpoint o generación en frontend con una URL segura).  
4. **Escaneo del QR**:  
   - Vista **pública mínima** (datos imprescindibles).  
   - Vista **completa** tras login del paciente o **validación de personal médico**.

---

## 🩺 Modelado de datos (resumen)

- **patients**: `full_name`, `blood_type`, `allergies`, `conditions`, `medications`, `qr_code`  
- **emergency_contacts**: relación 1:N con `patients`  
- **users**: credenciales del paciente (si lo separas de `patients`)  
- **medical_staff**: `professional_card`, `full_name`, `password_hash` (si tienen cuenta)

*(En `docs/diagrams` mantén UML de casos de uso, diagrama de navegación y ER/Relacional actualizado.)*

---

## 🧹 Scripts útiles

**FRONTEND/package.json**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --open",
    "lint": "echo "add your linter""
  }
}
```

**BACKEND/package.json**
```json
{
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js",
    "lint": "eslint ."
  }
}
```

---

## 🛠️ Troubleshooting (errores comunes)

- **404 al hacer login desde el frontend**  
  - Verifica `VITE_API_BASE_URL`.  
  - Confirma que la ruta exista (p. ej., `/auth/patient/login`).  
  - Revisa tu **deploy URL** (producción vs preview).  
  - Chequea Network tab: si responde HTML (`<!DOCTYPE html>`), es probable que golpees la **URL equivocada** o una página estática.

- **CORS: “Access-Control-Allow-Origin missing”**  
  - Asegura `app.use(cors({ origin: [listaDeDominios], credentials: true }))` **antes** de registrar rutas.  
  - En producción, pon el dominio exacto del frontend.

- **MIME type ‘text/plain’ en `config.js`**  
  - No sirvas configs como `.js` plano desde un host estático con `text/plain`.  
  - Usa **variables de entorno de Vite** (`VITE_API_BASE_URL`) y evita `config.js`.  

- **Vite: “Failed to load url /FRONTEND/public/src/script.js”**  
  - No cargues `src/` desde `public/`. Mueve tu JS a `FRONTEND/src` y referéncialo con módulos de Vite.

---

## 🗺️ Roadmap (sugerido)

- 2FA para personal médico.
- Cifrado de campos sensibles en BD.
- Registros de auditoría (quién accede/lee).
- Modo **offline** del QR (payload firmado con campos mínimos).
- Panel admin (gestión de staff, métricas).
- Internacionalización (i18n).
- Compatibilidad PostgreSQL.

---

## 🤝 Contribución

1. Crea un branch desde `develop`.
2. Commit con convención (feat/fix/docs).
3. PR con descripción y checklist.
4. Mantén `docs/` (PRD y diagramas) al día.

---

## 📄 Licencia

Licencia de Software Propietario — LifeLink v1.0. Todos los derechos reservados.

---
## 👩‍⚕️ Autora

**Sharon Ortiz** — Full‑Stack Developer & Psychologist.  
Enfoque: empatía, innovación y experiencias seguras para salud digital.

