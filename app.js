const express = require('express');
const app = express();
const path = require('path');
const { Pool } = require('pg');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'carroceriassandoval1968@gmail.com',
        pass: 'tu-contraseña'
    }
});

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
function esEmpleado(req, res, next) {
    // Asumiendo que guardas el usuario en la sesión tras el login
    if (req.session.usuario && req.session.usuario.rol === 'empleado') {
        return next();
    }
    res.status(403).send('Acceso denegado: Esta área es exclusiva para empleados.');
}
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
app.get('/Empleado/pagina-empleado', esEmpleado, (req, res) => res.render('Empleado/pagina-empleado', { userRole: 'empleado' }));
app.get('/Empleado/inventario-taller', esEmpleado, (req, res) => res.render('Empleado/Inventario-taller'));
app.get('/Empleado/ordenes-trabajo', esEmpleado, (req, res) => res.render('Empleado/ordenes-trabajo'));
app.get('/Empleado/historial-clientes', esEmpleado, (req, res) => res.render('Empleado/historial-clientes'));
app.get('/Empleado/configuracion', esEmpleado, (req, res) => res.render('Empleado/configuracion'));

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
    const uniqueId = `EMP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    try {
        await pool.query(
            'INSERT INTO usuarios (nombre, email, password, rol, empleado_id) VALUES ($1, $2, $3, $4, $5)',
            [nombre, email, password, 'empleado', uniqueId]
        );

        // 3. Configurar el correo
        const mailOptions = {
            from: '"Carrocerías Sandoval" <carroceriassandoval1968@gmail.com>',
            to: email,
            subject: 'Tu ID de Empleado - Acceso Exclusivo',
            html: `
                <h1>Bienvenido al equipo, ${nombre}</h1>
                <p>Se ha creado tu cuenta de empleado exitosamente.</p>
                <p>Tu ID único de acceso es: <strong>${uniqueId}</strong></p>
                <p>Guarda este ID, ya que será necesario para funciones administrativas.</p>
            `
        };

        // 4. Enviar el correo
        await transporter.sendMail(mailOptions);
        
        res.render('empleado-registro', { mensaje: 'Empleado registrado. Revisa tu correo para obtener tu ID.' });

    } catch (error) {
        console.error(error);
        res.status(500).send('Error al registrar empleado.');
    }
});
// Ejemplo para Servicios
app.get('/cliente/servicios', async (req, res) => {
    try {
        const query = 'SELECT * FROM servicios';
        const result = await pool.query(query);
        // Pasamos el resultado o un arreglo vacío si no hay nada
        res.render('Cliente/servicios', { servicios: result.rows || [] });
    } catch (err) {
        console.error(err);
        // Importante: define la variable incluso en el error para que la página no rompa
        res.render('Cliente/servicios', { servicios: [] });
    }
});

// Ejemplo para Trabajos
app.get('/cliente/trabajos', async (req, res) => {
    try {
        const clienteId = req.session.usuarioId; 
        const query = 'SELECT * FROM trabajos WHERE cliente_id = $1';
        const result = await pool.query(query, [clienteId]);
        res.render('Cliente/trabajos', { trabajos: result.rows || [] });
    } catch (err) {
        console.error(err);
        res.render('Cliente/trabajos', { trabajos: [] });
    }
});
app.get('/Cliente/trabajos/:slug', (req, res) => {
    const { slug } = req.params;

    const trabajos = {
        'aldo-trujillo': {
            titulo: 'Trabajo Aldo Trujillo',
            descripcion: 'Proyecto de carrocería y acabado final.',
            imagenes: [
                '/IMAGENES/Aldo Trujillo 1.jpeg',
                '/IMAGENES/Aldo Trujillo 2.jpeg',
                '/IMAGENES/Aldo Trujillo 3.jpeg',
                '/IMAGENES/Aldo Trujillo 4.jpeg',
                '/IMAGENES/Aldo Trujillo 5.jpeg',
                '/IMAGENES/Aldo Trujillo 6.jpeg',
                '/IMAGENES/Aldo Trujillo 7.jpeg'
            ]
        },
        'saul': {
            titulo: 'Trabajo Saúl',
            descripcion: 'Proceso de reparación y pintura.',
            imagenes: [
                '/IMAGENES/Saul 1.jpeg',
                '/IMAGENES/Saul 2.jpeg',
                '/IMAGENES/Saul 3.jpeg',
                '/IMAGENES/Saul 4.jpeg',
                '/IMAGENES/Saul 5.jpeg',
                '/IMAGENES/Saul 6.jpeg',
                '/IMAGENES/Saul 7.jpeg',
                '/IMAGENES/Saul 8.jpeg',
                '/IMAGENES/Saul 9.jpeg',
                '/IMAGENES/Saul 10.jpeg',
                '/IMAGENES/Saul 11.jpeg',
                '/IMAGENES/Saul 12.jpeg',
                '/IMAGENES/Saul 13.jpeg',
                '/IMAGENES/Saul 14.jpeg'
            ]
        },
        'montolla': {
            titulo: 'Trabajo Montoya',
            descripcion: 'Restauración y detalles de estructura.',
            imagenes: [
                '/IMAGENES/Montolla.jpeg',
                '/IMAGENES/Montolla 2.jpeg',
                '/IMAGENES/Montolla 3.jpeg'
            ]
        },
        'moy': {
            titulo: 'Trabajo Moy',
            descripcion: 'Trabajo de interiores y exterior.',
            imagenes: [
                '/IMAGENES/Moy 1.jpeg',
                '/IMAGENES/Moy 2.jpeg',
                '/IMAGENES/Moy 3.jpeg'
            ]
        },
        'palomo': {
            titulo: 'Trabajo Palomo',
            descripcion: 'Reparación general y pintura.',
            imagenes: [
                '/IMAGENES/Palomo 1.jpeg',
                '/IMAGENES/Palomo 2.jpeg',
                '/IMAGENES/Palomo 3.jpeg'
            ]
        },
        'outdoor': {
            titulo: 'Trabajo Outdoor',
            descripcion: 'Proyecto exterior terminado.',
            imagenes: [
                '/IMAGENES/Outdoor.jpeg',
                '/IMAGENES/Outdoor 2.jpeg',
                '/IMAGENES/Outdoor 3.jpeg'
            ]
        }
    };

    const trabajo = trabajos[slug];

    if (!trabajo) {
        return res.status(404).send('Trabajo no encontrado');
    }

    res.render('Cliente/detalle-trabajo', { trabajo });
});

app.listen(3000, () => console.log('Servidor en http://localhost:3000'));