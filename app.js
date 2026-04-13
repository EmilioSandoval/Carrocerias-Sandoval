const express = require('express');
const app = express();
const path = require('path');
const { Pool } = require('pg');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const pool = new Pool({
    user: 'admin',
    host: 'localhost',
    database: 'carrocerias_db',
    password: 'Ultimatexbox16',
    port: 5432,
});

pool.query('SELECT NOW()', (err, res) => {
    if (err) console.log("Error de conexión a DB", err);
    else console.log("Base de datos conectada correctamente");
});

// Configuración de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'HTML'));

// Archivos estáticos
app.use('/CSS', express.static(path.join(__dirname, 'CSS')));
app.use('/JS', express.static(path.join(__dirname, 'JS')));
app.use('/IMAGENES', express.static(path.join(__dirname, 'IMAGENES')));

// Rutas GET
app.get('/', (req, res) => res.render('inicio'));
app.get('/cliente-registro', (req, res) => res.render('cliente-registro', { successRegister: false }));
app.get('/cliente-inicio', (req, res) => res.render('cliente-inicio'));
app.get('/empleado-registro', (req, res) => res.render('empleado-registro', { successRegister: false }));
app.get('/empleado-inicio', (req, res) => res.render('empleado-inicio'));
app.get('/menu', (req, res) => res.render('menu'));
app.get('/Cliente/servicios', (req, res) => res.render('Cliente/servicios'));
app.get('/Cliente/trabajos', (req, res) => res.render('Cliente/trabajos'));
app.get('/Cliente/contactos', (req, res) => res.render('Cliente/contactos'));
app.get('/Cliente/perfil', (req, res) => res.render('Cliente/perfil'));
app.get('/Cliente/pagina-cliente', (req, res) => res.render('Cliente/pagina-cliente', { userRole: 'cliente' }));
app.get('/Empleado/pagina-empleado', (req, res) => res.render('Empleado/pagina-empleado', { userRole: 'empleado' }));
app.get('/Empleado/inventario-taller', (req, res) => res.render('Empleado/Inventario-taller'));
app.get('/Empleado/ordenes-trabajo', (req, res) => res.render('Empleado/ordenes-trabajo'));
app.get('/Empleado/historial-clientes', (req, res) => res.render('Empleado/historial-clientes'));
app.get('/Empleado/configuracion', (req, res) => res.render('Empleado/configuracion'));

// Rutas POST
app.post('/cliente-inicio', (req, res) => res.redirect('/Cliente/pagina-cliente'));
app.post('/empleado-inicio', (req, res) => res.redirect('/Empleado/pagina-empleado'));

app.post('/cliente-registro', async (req, res) => {
    console.log("Datos recibidos en /cliente-registro:", req.body);
    const { nombre, correo, password } = req.body;

    try {
        const queryText = 'INSERT INTO usuarios (nombre, correo, password, rol) VALUES ($1, $2, $3, $4)';
        const values = [nombre, correo, password, 'cliente'];

        await pool.query(queryText, values);

        console.log(`Usuario ${nombre} registrado con éxito`);
        res.redirect('/cliente-inicio');
    } catch (err) {
        console.error('Error al insertar usuario:', err.message);
        res.status(500).send("Error al registrar usuario. Posiblemente el correo ya existe.");
    }
});

app.post('/empleado-registro', async (req, res) => {
    const { nombre, correo, password } = req.body;

    try {
        const queryText = 'INSERT INTO usuarios (nombre, correo, password, rol) VALUES ($1, $2, $3, $4)';
        const values = [nombre, correo, password, 'empleado'];

        await pool.query(queryText, values);

        console.log(`Usuario ${nombre} registrado con éxito`);
        res.redirect('/empleado-inicio');
    } catch (err) {
        console.error('Error al insertar usuario:', err.message);
        res.status(500).send("Error al registrar usuario. Posiblemente el correo ya existe.");
    }
});

app.listen(3000, () => console.log('Servidor en http://localhost:3000'));