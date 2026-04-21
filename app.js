const express = require('express');
const app = express();
const path = require('path');
const { Pool } = require('pg');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require ('multer');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});
app.use('/uploads', express.static('uploads'));
const upload = multer({ storage });
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
function esCliente(req, res, next) {
    if (req.session && req.session.usuario && req.session.usuario.rol === 'cliente') {
        return next();
    }
    res.status(403).send('Acceso denegado: Esta área es exclusiva para clientes.');
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
app.get('/Cliente/servicios', esCliente, (req, res) => res.render('Cliente/servicios'));
app.get('/Cliente/trabajos', esCliente, (req, res) => res.render('Cliente/trabajos'));
app.get('/Cliente/contactos', esCliente, (req, res) => res.render('Cliente/contactos'));
app.get('/Cliente/mis-cotizaciones', esCliente, async (req, res) =>{ try {
        const usuarioId = req.session.usuario.id;

        const cotizacionesResult = await pool.query(
            `SELECT id, unidad, total, fecha
             FROM cotizaciones
             WHERE cliente_id = $1
             ORDER BY fecha DESC`,
            [usuarioId]
        );

        res.render('Cliente/mis-cotizaciones', {
            cotizaciones: cotizacionesResult.rows
        });
    } catch (error) {
        console.error('Error al cargar mis cotizaciones:', error.message);
        res.status(500).send('Error al cargar cotizaciones');
    }
});
app.get('/Cliente/perfil', esCliente, async (req, res) => {
    try {
        const usuarioId = req.session.usuario.id;

        const result = await pool.query(
            'SELECT id, nombre, correo, telefono, foto_url, fecha_registro FROM usuarios WHERE id = $1',
            [usuarioId]
        );

        if (result.rows.length === 0) {
            return res.status(404).send('Usuario no encontrado');
        }

        res.render('Cliente/perfil', { cliente: result.rows[0] });
    } catch (error) {
        console.error('Error al cargar perfil:', error.message);
        res.status(500).send('Error al cargar el perfil');
    }
});
app.get('/Cliente/Cotizacion', esCliente, (req, res) => res.render('Cliente/Cotizacion'));
app.get('/Cliente/pagina-cliente', esCliente,(req, res) => res.render('Cliente/pagina-cliente', { userRole: 'cliente' }));
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
        const result = await pool.query(`
            SELECT 
                cliente_nombre AS nombre,
                MAX(vehiculo_modelo) AS vehiculo_modelo,
                MAX(placas) AS placas,
                MAX(descripcion_falla) AS ultimo_servicio,
                COUNT(id) AS total_ordenes
            FROM ordenes_trabajo
            GROUP BY cliente_nombre
            ORDER BY cliente_nombre ASC
        `);

        res.render('Empleado/historial-clientes', { historial: result.rows });
    } catch (error) {
        console.error('Error al obtener historial:', error.message);
        res.status(500).send('Error al obtener historial');
    }
});
app.get('/Empleado/configuracion', esEmpleado, async (req, res) => {
    try {
        const usuarioId = req.session.usuario.id;

        const result = await pool.query(
            'SELECT id, nombre, correo FROM usuarios WHERE id = $1',
            [usuarioId]
        );

        if (result.rows.length === 0) {
            return res.status(404).send('Empleado no encontrado');
        }

        res.render('Empleado/configuracion', { usuario: result.rows[0] });
    } catch (error) {
        console.error('Error al cargar configuración:', error.message);
        res.status(500).send('Error al cargar configuración');
    }
});
app.get('/api/marca-autobus', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, nombre FROM marca_autobus ORDER BY nombre ASC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener marcas:', error.message);
        res.status(500).json({ error: 'Error al obtener marcas' });
    }
});

app.get('/api/modelos-autobus/:marcaId', async (req, res) => {
    const { marcaId } = req.params;

    try {
        const result = await pool.query(
            'SELECT id, nombre, tipo_unidad FROM modelos_autobus WHERE marca_id = $1 ORDER BY nombre ASC',
            [marcaId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener modelos:', error.message);
        res.status(500).json({ error: 'Error al obtener modelos' });
    }
});
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al cerrar sesión:', err.message);
            return res.status(500).send('No se pudo cerrar sesión');
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});
app.get('/Cliente/mis-cotizaciones/:id', esCliente, async (req, res) => {
    try {
        const usuarioId = req.session.usuario.id;
        const { id } = req.params;

        const cotizacionResult = await pool.query(
            `SELECT id, unidad, total, fecha
             FROM cotizaciones
             WHERE id = $1 AND cliente_id = $2`,
            [id, usuarioId]
        );

        if (cotizacionResult.rows.length === 0) {
            return res.status(404).send('Cotización no encontrada');
        }

        const detalleResult = await pool.query(
            `SELECT servicio, cantidad, subtotal
             FROM cotizacion_detalle
             WHERE cotizacion_id = $1`,
            [id]
        );

        res.render('Cliente/detalle-cotizacion', {
            cotizacion: cotizacionResult.rows[0],
            detalle: detalleResult.rows
        });
    } catch (error) {
        console.error('Error al cargar detalle de cotización:', error.message);
        res.status(500).send('Error al cargar el detalle');
    }
});
app.get('/Cliente/trabajos/:slug', (req, res) => {
    const { slug } = req.params;

    const trabajos = {
        'aldo-trujillo': {
            titulo: 'Trabajo Aldo Trujillo',
            descripcion: 'Proyecto de carrocería y acabado final.',
            imagenes: [
                '/IMAGENES/Aldo Trujillo 4.jpeg',
                '/IMAGENES/Aldo Trujillo 2.jpeg',
                '/IMAGENES/Aldo Trujillo 3.jpeg',
                '/IMAGENES/Aldo Trujillo 1.jpeg',
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
        'montoya': {
            titulo: 'Trabajo Montoya',
            descripcion: 'Restauración y detalles de estructura.',
            imagenes: [
                '/IMAGENES/Montoya.jpeg'
            ]
        },
        'moy': {
            titulo: 'Trabajo Moy',
            descripcion: 'Trabajo de interiores y exterior.',
            imagenes: [
                '/IMAGENES/Moy 1.jpeg',
                '/IMAGENES/Moy 2.jpeg'
            ]
        },
        'palomo': {
            titulo: 'Trabajo Palomo',
            descripcion: 'Reparación general y pintura.',
            imagenes: [
                '/IMAGENES/Palomo 1.jpeg',
                '/IMAGENES/Palomo 2.jpeg'
            ]
        },
        'outdoor': {
            titulo: 'Trabajo Outdoor',
            descripcion: 'Proyecto exterior terminado.',
            imagenes: [
                '/IMAGENES/Outdoor.jpeg'
            ]
        },
        'sh-transportation': {
            titulo: 'Trabajo SH',
            descripcion: 'Pintura general, pulida y encerado',
            imagenes: [
                '/IMAGENES/SH 4.jpeg',
                '/IMAGENES/SH 2.jpeg',
                '/IMAGENES/SH 3.jpeg',
                '/IMAGENES/SH 1.jpeg'
            ]
        }
    };

    const trabajo = trabajos[slug];

    if (!trabajo) {
        return res.status(404).send('Trabajo no encontrado');
    }

    res.render('Cliente/detalle-trabajo', { trabajo });
});
// --- RUTAS POST ---
app.post('/cliente-inicio', async (req, res) => {
    const { correo, password } = req.body;

    try {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE correo = $1 AND rol = $2',
            [correo, 'cliente']
        );

        if (result.rows.length === 0) {
            return res.status(401).send('Correo o contraseña incorrectos.');
        }

        const cliente = result.rows[0];
        const passwordValida = await bcrypt.compare(password, cliente.password);

        if (!passwordValida) {
            return res.status(401).send('Correo o contraseña incorrectos.');
        }

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
    const { correo, password, id } = req.body;

    try {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE correo = $1 AND id_rol = $2 AND rol = $3',
            [correo, id, 'empleado']
        );

        if (result.rows.length === 0) {
            return res.status(401).send('Credenciales incorrectas o no tienes permisos de empleado.');
        }

        const empleado = result.rows[0];
        const passwordValida = await bcrypt.compare(password, empleado.password);

        if (!passwordValida) {
            return res.status(401).send('Credenciales incorrectas o no tienes permisos de empleado.');
        }

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
        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            'INSERT INTO usuarios (nombre, correo, password, rol) VALUES ($1, $2, $3, $4)',
            [nombre, correo, hashedPassword, 'cliente']
        );
        res.redirect('/cliente-inicio');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error en registro.");
    }
});

app.post('/empleado-registro', async (req, res) => {
    const { nombre, correo, password } = req.body;
    const uniqueId = `EMP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            'INSERT INTO usuarios (nombre, correo, password, rol, id_rol) VALUES ($1, $2, $3, $4, $5)',
            [nombre, correo, hashedPassword, 'empleado', uniqueId]
        );

        const mailOptions = {
            from: '"Carrocerías Sandoval" <carroceriassandoval1968@gmail.com>',
            to: correo,
            subject: 'Tu ID de Empleado - Acceso Exclusivo',
            html: `
                <h1>Bienvenido al equipo, ${nombre}</h1>
                <p>Se ha creado tu cuenta de empleado exitosamente.</p>
                <p>Tu ID único de acceso es: <strong>${uniqueId}</strong></p>
                <p>Guarda este ID para funciones administrativas.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        res.render('empleado-inicio', { mensaje: 'Empleado registrado. Revisa tu correo para obtener tu ID.' });

    } catch (error) {
        console.error("Error en registro empleado:", error.message);
        res.status(500).send('Error al registrar empleado.');
    }
});
app.post('/api/cotizaciones', async (req, res) => {
    const { unidad, total, servicios } = req.body;

    try {
        const usuario = req.session.usuario;

        if (!usuario) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const cotizacionResult = await pool.query(
            'INSERT INTO cotizaciones (cliente_id, unidad, total) VALUES ($1, $2, $3) RETURNING id',
            [usuario.id, unidad, total]
        );

        const cotizacionId = cotizacionResult.rows[0].id;

        for (const servicio of servicios) {
            await pool.query(
                'INSERT INTO cotizacion_detalle (cotizacion_id, servicio, cantidad, subtotal) VALUES ($1, $2, $3, $4)',
                [cotizacionId, servicio.nombre, servicio.cantidad, servicio.subtotal]
            );
        }

        const mensajeHTML = `
            <h2>Cotización Carrocerías Sandoval</h2>
            <p><strong>Unidad:</strong> ${unidad}</p>

            <h3>Servicios:</h3>
            <ul>
                ${servicios.map(s => `<li>${s.nombre} x${s.cantidad} - $${s.subtotal}</li>`).join('')}
            </ul>

            <h3>Total estimado: $${total}</h3>

            <p>Nota: Esta es una cotización estimada.</p>
        `;

        await transporter.sendMail({
            from: '"Carrocerías Sandoval" <carroceriassandoval@gmail.com>',
            to: usuario.correo,
            subject: 'Tu cotización - Carrocerías Sandoval',
            html: mensajeHTML
        });

        res.json({ mensaje: 'Cotización guardada y enviada por correo' });

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: 'Error al guardar cotización' });
    }
});
app.put('/api/editar-perfil', async (req, res) => {
    try {
        const usuario = req.session.usuario;

        if (!usuario) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const { nombre, correo, telefono } = req.body;

        await pool.query(
            'UPDATE usuarios SET nombre = $1, correo = $2, telefono = $3 WHERE id = $4',
            [nombre, correo, telefono, usuario.id]
        );

        res.json({ mensaje: 'Perfil actualizado' });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
});
app.delete('/api/eliminar-perfil', async (req, res) => {
    try {
        const usuario = req.session.usuario;

        if (!usuario) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        await pool.query(
            'DELETE FROM usuarios WHERE id = $1',
            [usuario.id]
        );

        req.session.destroy();

        res.json({ mensaje: 'Cuenta eliminada' });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Error al eliminar perfil' });
    }
});
app.post('/api/subir-foto', esCliente, upload.single('foto'), async (req, res) => {
    try {
        const usuarioId = req.session.usuario.id;
        const fotoPath = `/uploads/${req.file.filename}`;

        await pool.query(
            'UPDATE usuarios SET foto_url = $1 WHERE id = $2',
            [fotoPath, usuarioId]
        );

        res.json({ mensaje: 'Foto actualizada', foto: fotoPath });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al subir foto' });
    }
});
app.post('/empleado/ordenes/actualizar-estado', esEmpleado, async (req, res) => {
    try {
        const { id_orden, nuevo_estado } = req.body;

        await pool.query(
            'UPDATE ordenes_trabajo SET estado = $1 WHERE id = $2',
            [nuevo_estado, id_orden]
        );

        res.redirect('/Empleado/ordenes-trabajo');
    } catch (error) {
        console.error('Error al actualizar estado de la orden:', error.message);
        res.status(500).send('Error al actualizar estado');
    }
});

app.listen(3000, () => console.log('Servidor en http://localhost:3000'));