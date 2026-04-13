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
// Ruta para Editar Perfil (Actualizar datos)
app.get('/perfil', async (req, res) => {
    // Aquí deberías obtener el ID del cliente de la sesión
    // Por ahora, usemos un ID de prueba o el que obtengas de tu lógica de login
    const clienteId = 1; 

    try {
        const result = await pool.query('SELECT * FROM clientes WHERE id = $1', [clienteId]);
        
        if (result.rows.length > 0) {
            // Enviamos el primer resultado como la variable 'cliente'
            res.render('perfil', { cliente: result.rows[0] });
        } else {
            res.send("Cliente no encontrado");
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Error de servidor");
    }
});
app.post('/perfil/editar', async (req, res) => {
    const { id, nombre, telefono, email } = req.body; // Ajusta según tus columnas de la DB
    try {
        await pool.query(
            'UPDATE usuarios SET nombre = $1, telefono = $2, email = $3 WHERE id = $4',
            [nombre, telefono, email, id]
        );
        res.redirect('/perfil?success=updated');
    } catch (err) {
        console.error(err);
        res.send("Error al actualizar el perfil");
    }
});

// Ruta para Eliminar Cuenta
app.post('/perfil/eliminar', async (req, res) => {
    const { id } = req.body;
    try {
        await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
        // Aquí podrías destruir la sesión si estás usando una
        res.redirect('/inicio?msg=account_deleted');
    } catch (err) {
        console.error(err);
        res.send("Error al eliminar la cuenta");
    }
});

app.listen(3000, () => console.log('Servidor en http://localhost:3000'));