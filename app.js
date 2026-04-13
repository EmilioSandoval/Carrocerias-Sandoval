const express = require('express');
const app = express();
const path = require('path');
app.use(express.urlencoded({ extended: true })); 
app.use(express.json());
const { Pool } = require('pg');

const pool = new Pool({
    user: 'admin',
    host: 'localhost', // Si corres el app.js fuera de Docker
    database: 'carrocerias_db',
    password: 'Ultimatexbox16',
    port: 5432,
});

pool.query('SELECT NOW()', (err, res) => {
    if (err) console.log("Error de conexión a DB", err);
    else console.log("Base de datos conectada correctamente");
});
// --- CONFIGURACIÓN CRÍTICA ---
app.use(express.urlencoded({ extended: true })); 
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'HTML'));
app.use(express.static(path.join(__dirname)));

// --- RUTAS DE NAVEGACIÓN (GET) ---
app.get('/', (req, res) => res.render('inicio'));
app.get('/cliente-registro', (req, res) => res.render('cliente-registro', { successRegister: false }));
app.get('/cliente-inicio', (req, res) => res.render('cliente-inicio'));
app.get('/empleado-registro', (req, res) => res.render('empleado-registro', { successRegister: false }));
app.get('/empleado-inicio', (req, res) => res.render('empleado-inicio'));
app.get('/menu', (req, res) => res.render('menu'));
app.get('/servicios', (req, res) => res.render('servicios'));
app.get('/trabajos', (req, res) => res.render('trabajos'));
app.get('/contactos', (req, res) => res.render('contactos'));
app.get('/perfil', (req, res) => res.render('perfil'));
app.get('/pagina-cliente', (req, res) => res.render('pagina-cliente', { userRole: 'cliente' }));
app.get('/pagina-empleado', (req, res) => res.render('pagina-empleado', { userRole: 'empleado' }));


app.post('/cliente-inicio', (req, res) => res.redirect('/pagina-cliente'));
app.post('/empleado-inicio', (req, res) => res.redirect('/pagina-empleado'));

app.post('/cliente-registro', async (req, res) => {
    console.log("Datos recibidos en /cliente-registro:", req.body);
    const { nombre, correo, password } = req.body;

    try {
        const queryText = 'INSERT INTO usuarios (nombre, correo, password, rol) VALUES ($1, $2, $3, $4)';
        const values = [nombre, correo, password, 'cliente'];
        
        await pool.query(queryText, values);
        
        console.log(`Usuario ${nombre} registrado con éxito`);
        res.redirect('cliente-inicio');
    } catch (err) {
        console.error('Error al insertar usuario:', err.message);
        res.status(500).send("Error al registrar usuario. Posiblemente el correo ya existe.");
    }
});
app.post('/empleado-registro', async (req, res) => {
    const { nombre, correo, password } = req.body;

    try {
        const queryText = 'INSERT INTO usuarios (nombre, correo, password, rol)';
        const values = [nombre, correo, password, 'empleado'];

        await pool.query(queryText, values);

        console.log(`Usuario ${nombre} registrado con éxito`);
        res.redirect('empleado-inicio');
    } catch (err) {
        console.error('Error al insertar usuario:', err.message);
        res.status(500).send("Error al registrar usuario. Posiblemente el correo ya existe.");
    }
});

app.listen(3000, () => console.log('Servidor en http://localhost:3000'));