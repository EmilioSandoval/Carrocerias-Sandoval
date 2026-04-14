const express = require('express');
const app = express();
const path = require('path');
const { Pool } = require('pg');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const session = require('express-session');

app.use(session({
    secret: 'carrocerias_sandoval_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false,
        maxAge:1000 * 60 * 60 * 2
     } // Cambia a true si usas HTTPS

}));

// 1. Configuración de transporte
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'carroceriassandoval1968@gmail.com',
        pass: 'etcv vhkn olsk yxbz'
    }
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 2. Configuración de DB
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

// Middleware de seguridad
function esEmpleado(req, res, next) {
    if (req.session && req.session.usuario && req.session.usuario.rol === 'empleado') {
        return next();
    }
    res.status(403).send('Acceso denegado: Esta área es exclusiva para empleados.');
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'HTML'));

app.use('/CSS', express.static(path.join(__dirname, 'CSS')));
app.use('/JS', express.static(path.join(__dirname, 'JS')));
app.use('/IMAGENES', express.static(path.join(__dirname, 'IMAGENES')));

// --- RUTAS GET ---
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
app.get('/Empleado/inventario-taller', esEmpleado, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM inventario ORDER BY producto ASC');
        res.render('Empleado/Inventario-taller', { productos: result.rows });
    } catch (err) {
        console.error(err);
        res.render('Empleado/Inventario-taller', { productos: [] });
    }
});
app.get('/Empleado/ordenes-trabajo', esEmpleado, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM ordenes_trabajo ORDER BY fecha_entrada DESC');
        res.render('Empleado/ordenes-trabajo', { ordenes: result.rows });
    } catch (err) {
        console.error(err);
        res.render('Empleado/ordenes-trabajo', { ordenes: [] });
    }
});
app.get('/Empleado/historial-clientes', esEmpleado, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM historial_clientes ORDER BY fecha_reparacion DESC');
        res.render('Empleado/historial-clientes', { historial: result.rows });
    } catch (err) {
        console.error(err);
        res.render('Empleado/historial-clientes', { historial: [] });
    }
});
app.get('/Empleado/configuracion', esEmpleado, (req, res) => res.render('Empleado/configuracion'));

// --- RUTAS POST ---
app.post('/cliente-inicio', async (req, res) => {
    const { correo, password } = req.body;

    try {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE correo = $1 AND password = $2 AND rol = $3',
            [correo, password, 'cliente']
        );

        if (result.rows.length === 0) {
            return res.status(401).send('Correo o contraseña incorrectos.');
        }

        const cliente = result.rows[0];

        req.session.usuario = {
            id: cliente.id,
            nombre: cliente.nombre,
            correo: cliente.correo,
            rol: cliente.rol
        };

        res.redirect('/Cliente/pagina-cliente');
    } catch (error) {
        console.error('Error al iniciar sesión como cliente:', error.message);
        res.status(500).send('Error interno al iniciar sesión.');
    }
});
app.post('/empleado-inicio', async (req, res) => {
    const { correo, password, id } = req.body; // Asegúrate de que el formulario envíe 'id_rol' correctamente

        try {
            const result = await pool.query(
            'SELECT * FROM usuarios WHERE correo = $1 AND password = $2 AND id_rol = $3 AND rol = $4',
            [correo, password, id, 'empleado']
        );

        if (result.rows.length === 0) {
            return res.status(401).send('Credenciales incorrectas o no tienes permisos de empleado.');
        }

        const empleado = result.rows[0];

        req.session.usuario = {
            id: empleado.id,
            nombre: empleado.nombre,
            correo: empleado.correo,
            rol: empleado.rol,
            id_rol: empleado.id_rol
        };

        res.redirect('/Empleado/pagina-empleado');
    } catch (error) {
        console.error('Error al iniciar sesión como empleado:', error.message);
        res.status(500).send('Error interno al iniciar sesión.');
    }
});

app.post('/cliente-registro', async (req, res) => {
    const { nombre, correo, password } = req.body;
    try {
        await pool.query(
            'INSERT INTO usuarios (nombre, correo, password, rol) VALUES ($1, $2, $3, $4)',
            [nombre, correo, password, 'cliente']
        );
        res.redirect('/cliente-inicio');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error en registro.");
    }
});

// REGISTRO DE EMPLEADO - AQUÍ ESTABA EL ERROR
app.post('/empleado-registro', async (req, res) => {
    // Aseguramos que las variables del formulario coincidan con las de JS
    const { nombre, correo, password } = req.body;
    
    // Generación del ID único
    const uniqueId = `EMP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    try {
        // Guardamos en la base de datos
        await pool.query(
            'INSERT INTO usuarios (nombre, correo, password, rol, id_rol) VALUES ($1, $2, $3, $4, $5)',
            [nombre, correo, password, 'empleado', uniqueId]
        );

        // CONFIGURACIÓN DEL MENSAJE (Usa estrictamente la variable 'correo')
        const mailOptions = {
            from: '"Carrocerías Sandoval" <carroceriassandoval1968@gmail.com>',
            to: correo, // No uses 'email', usa 'correo' que es la que viene de req.body
            subject: 'Tu ID de Empleado - Acceso Exclusivo',
            html: `
                <h1>Bienvenido al equipo, ${nombre}</h1>
                <p>Se ha creado tu cuenta de empleado exitosamente.</p>
                <p>Tu ID único de acceso es: <strong>${uniqueId}</strong></p>
                <p>Guarda este ID para funciones administrativas.</p>
            `
        };

        // Enviamos el correo
        await transporter.sendMail(mailOptions);
        res.render('empleado-inicio', { mensaje: 'Empleado registrado. Revisa tu correo para obtener tu ID.' });

    } catch (error) {
        console.error("Error en registro empleado:", error.message);
        res.status(500).send('Error al registrar empleado.');
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