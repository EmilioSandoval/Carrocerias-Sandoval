require('dotenv').config();

const express    = require('express');
const path       = require('path');
const fs         = require('fs');
const { Pool }   = require('pg');

fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
const crypto     = require('crypto');
const nodemailer = require('nodemailer');
const session    = require('express-session');
const pgSession  = require('connect-pg-simple')(session);
const bcrypt     = require('bcrypt');
const multer     = require('multer');
const rateLimit  = require('express-rate-limit');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
app.set('trust proxy', 1);

const enProduccion = process.env.NODE_ENV === 'production';
const tieneCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

if (tieneCloudinary) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key:    process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    console.log('Cloudinary configurado correctamente');
} else if (enProduccion) {
    console.warn('ADVERTENCIA: Variables de Cloudinary no encontradas. Las fotos no funcionarán.');
}

let upload;
if (tieneCloudinary) {
    const cloudStorage = new CloudinaryStorage({
        cloudinary,
        params: { folder: 'carrocerias-sandoval', allowed_formats: ['jpg','jpeg','png','webp'] }
    });
    upload = multer({ storage: cloudStorage, limits: { fileSize: 5 * 1024 * 1024 } });
} else {
    const localStorage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, 'uploads/'),
        filename:    (req, file, cb) => {
            const ext      = path.extname(file.originalname).toLowerCase();
            const safeName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
            cb(null, safeName);
        }
    });
    upload = multer({
        storage: localStorage,
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            const allowed = /jpeg|jpg|png|webp/;
            const ok = allowed.test(path.extname(file.originalname).toLowerCase())
                    && allowed.test(file.mimetype);
            ok ? cb(null, true) : cb(new Error('Solo se permiten imágenes (jpg, png, webp)'));
        }
    });
}
app.use('/uploads', express.static('uploads'));

const pool = new Pool({
    user:     process.env.DB_USER,
    host:     process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port:     Number(process.env.DB_PORT) || 5432,
});

const transporter = nodemailer.createTransport({
    host:   'smtp.gmail.com',
    port:   587,
    secure: false,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

app.use(session({
    store: new pgSession({
        pool,
        tableName:            'session',
        createTableIfMissing: true
    }),
    secret:            process.env.SESSION_SECRET,
    resave:            false,
    saveUninitialized: false,
    cookie: {
        secure:   process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge:   1000 * 60 * 60 * 2
    }
}));

pool.query('SELECT NOW()', (err) =>
    err ? console.error('Error de conexión a DB:', err.message)
        : console.log('Base de datos conectada correctamente')
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Demasiados intentos de inicio de sesión. Espera 15 minutos.',
    standardHeaders: true,
    legacyHeaders: false
});

const registroLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Demasiados registros desde esta IP. Espera una hora.',
    standardHeaders: true,
    legacyHeaders: false
});

function noCache(req, res, next) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
}

function esEmpleado(req, res, next) {
    if (req.session?.usuario?.rol === 'empleado') return next();
    res.redirect('/empleado-inicio');
}

function esCliente(req, res, next) {
    if (req.session?.usuario?.rol === 'cliente') return next();
    res.redirect('/cliente-inicio');
}

const EMAIL_REGEX    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN   = 8;

function validarEmail(correo) { return EMAIL_REGEX.test(correo); }
function validarPassword(pwd) {
    return pwd &&
        pwd.length >= PASSWORD_MIN &&
        /[A-Z]/.test(pwd) &&
        /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'HTML'));

app.use('/CSS',      express.static(path.join(__dirname, 'CSS')));
app.use('/JS',       express.static(path.join(__dirname, 'JS')));
app.use('/IMAGENES', express.static(path.join(__dirname, 'IMAGENES')));

app.get('/',                (req, res) => res.render('inicio'));
app.get('/menu',            (req, res) => res.render('menu'));
app.get('/cliente-inicio',  (req, res) => res.render('cliente-inicio'));
app.get('/empleado-inicio', (req, res) => res.render('empleado-inicio', { mensaje: null }));
app.get('/cliente-registro',(req, res) => res.render('cliente-registro', { successRegister: false, error: null }));

app.get('/empleado-registro', (req, res) =>
    res.render('empleado-registro', { successRegister: false, error: null })
);

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).send('No se pudo cerrar sesión');
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

app.use('/Cliente',  noCache);
app.use('/Empleado', noCache);

app.get('/Cliente/pagina-cliente', esCliente, (req, res) =>
    res.render('Cliente/pagina-cliente', { userRole: 'cliente', usuario: req.session.usuario })
);
app.get('/Cliente/servicios',  esCliente, (req, res) => res.render('Cliente/servicios'));
app.get('/Cliente/trabajos',   esCliente, (req, res) => res.render('Cliente/trabajos'));
app.get('/Cliente/contactos', esCliente, async (req, res) => {
    try {
        const { rows: admins } = await pool.query(
            `SELECT nombre, correo, telefono, foto_url, puesto
               FROM usuarios WHERE rol = 'admin' ORDER BY id`
        );
        res.render('Cliente/contactos', { admins });
    } catch (err) {
        console.error(err);
        res.render('Cliente/contactos', { admins: [] });
    }
});
app.get('/Cliente/Cotizacion', esCliente, async (req, res) => {
    try {
        const { rows: servicios } = await pool.query('SELECT id, nombre, precio_estimado FROM servicios ORDER BY nombre');
        res.render('Cliente/Cotizacion', { servicios });
    } catch (err) {
        console.error(err);
        res.render('Cliente/Cotizacion', { servicios: [] });
    }
});

app.get('/Cliente/mis-cotizaciones', esCliente, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, unidad, total, fecha
               FROM cotizaciones
              WHERE cliente_id = $1
              ORDER BY fecha DESC`,
            [req.session.usuario.id]
        );
        res.render('Cliente/mis-cotizaciones', { cotizaciones: rows });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al cargar cotizaciones');
    }
});

app.get('/Cliente/mis-cotizaciones/:id', esCliente, async (req, res) => {
    try {
        const usuarioId = req.session.usuario.id;
        const cotRes = await pool.query(
            `SELECT id, unidad, total, fecha FROM cotizaciones WHERE id=$1 AND cliente_id=$2`,
            [req.params.id, usuarioId]
        );
        if (!cotRes.rows.length) return res.status(404).send('Cotización no encontrada');

        const detRes = await pool.query(
            `SELECT servicio, cantidad, subtotal FROM cotizacion_detalle WHERE cotizacion_id=$1`,
            [req.params.id]
        );
        res.render('Cliente/detalle-cotizacion', {
            cotizacion: cotRes.rows[0],
            detalle:    detRes.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al cargar el detalle');
    }
});

app.get('/Cliente/perfil', esCliente, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, nombre, correo, telefono, foto_url, fecha_registro FROM usuarios WHERE id=$1',
            [req.session.usuario.id]
        );
        if (!rows.length) return res.status(404).send('Usuario no encontrado');
        res.render('Cliente/perfil', { cliente: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al cargar el perfil');
    }
});

app.get('/Cliente/trabajos/:slug', esCliente, (req, res) => {
    const trabajos = {
        'aldo-trujillo':   { titulo: 'Trabajo Aldo Trujillo',   descripcion: 'Proyecto de carrocería y acabado final.',       imagenes: ['/IMAGENES/Aldo Trujillo 4.jpeg','/IMAGENES/Aldo Trujillo 2.jpeg','/IMAGENES/Aldo Trujillo 3.jpeg','/IMAGENES/Aldo Trujillo 1.jpeg','/IMAGENES/Aldo Trujillo 5.jpeg','/IMAGENES/Aldo Trujillo 6.jpeg','/IMAGENES/Aldo Trujillo 7.jpeg'] },
        'saul':            { titulo: 'Trabajo Saúl',             descripcion: 'Proceso de reparación y pintura.',              imagenes: ['/IMAGENES/Saul 1.jpeg','/IMAGENES/Saul 2.jpeg','/IMAGENES/Saul 3.jpeg','/IMAGENES/Saul 4.jpeg','/IMAGENES/Saul 5.jpeg','/IMAGENES/Saul 6.jpeg','/IMAGENES/Saul 7.jpeg','/IMAGENES/Saul 8.jpeg','/IMAGENES/Saul 9.jpeg','/IMAGENES/Saul 10.jpeg','/IMAGENES/Saul 11.jpeg','/IMAGENES/Saul 12.jpeg','/IMAGENES/Saul 13.jpeg','/IMAGENES/Saul 14.jpeg'] },
        'montoya':         { titulo: 'Trabajo Montoya',          descripcion: 'Restauración y detalles de estructura.',         imagenes: ['/IMAGENES/Montoya.jpeg'] },
        'moy':             { titulo: 'Trabajo Moy',              descripcion: 'Trabajo de interiores y exterior.',              imagenes: ['/IMAGENES/Moy 1.jpeg','/IMAGENES/Moy 2.jpeg'] },
        'palomo':          { titulo: 'Trabajo Palomo',           descripcion: 'Reparación general y pintura.',                  imagenes: ['/IMAGENES/Palomo 1.jpeg','/IMAGENES/Palomo 2.jpeg'] },
        'outdoor':         { titulo: 'Trabajo Outdoor',          descripcion: 'Proyecto exterior terminado.',                   imagenes: ['/IMAGENES/Outdoor.jpeg'] },
        'sh-transportation':{ titulo: 'Trabajo SH',             descripcion: 'Pintura general, pulida y encerado.',            imagenes: ['/IMAGENES/SH 4.jpeg','/IMAGENES/SH 2.jpeg','/IMAGENES/SH 3.jpeg','/IMAGENES/SH 1.jpeg'] }
    };
    const trabajo = trabajos[req.params.slug];
    if (!trabajo) return res.status(404).send('Trabajo no encontrado');
    res.render('Cliente/detalle-trabajo', { trabajo });
});

app.get('/Empleado/pagina-empleado', esEmpleado, (req, res) =>
    res.render('Empleado/pagina-empleado', { userRole: 'empleado', usuario: req.session.usuario })
);

app.get('/Empleado/inventario-taller', esEmpleado, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM inventario ORDER BY producto ASC');
        res.render('Empleado/Inventario-taller', { productos: rows, error: null });
    } catch (err) {
        console.error(err);
        res.render('Empleado/Inventario-taller', { productos: [], error: 'Error al cargar inventario' });
    }
});

app.get('/Empleado/ordenes-trabajo', esEmpleado, async (req, res) => {
    try {
        const { estado } = req.query;
        let query  = 'SELECT * FROM ordenes_trabajo';
        let params = [];

        if (estado) {
            query  += ' WHERE estado = $1';
            params  = [estado];
        }
        query += ' ORDER BY fecha_entrada DESC';

        const { rows } = await pool.query(query, params);
        res.render('Empleado/ordenes-trabajo', {
            ordenes:       rows,
            filtroEstado:  estado || '',
            error:         null
        });
    } catch (err) {
        console.error(err);
        res.render('Empleado/ordenes-trabajo', { ordenes: [], filtroEstado: '', error: 'Error al cargar órdenes' });
    }
});

app.get('/Empleado/ordenes-trabajo/nueva', esEmpleado, (req, res) =>
    res.render('Empleado/nueva-orden', { error: null })
);

app.get('/Empleado/ordenes-trabajo/editar/:id', esEmpleado, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM ordenes_trabajo WHERE id=$1', [req.params.id]);
        if (!rows.length) return res.status(404).send('Orden no encontrada');
        res.render('Empleado/editar-orden', { orden: rows[0], error: null });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al cargar la orden');
    }
});

app.get('/Empleado/historial-clientes', esEmpleado, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT 
                cliente_nombre           AS nombre,
                MAX(vehiculo_modelo)     AS vehiculo_modelo,
                MAX(placas)              AS placas,
                MAX(descripcion_falla)   AS ultimo_servicio,
                COUNT(id)                AS total_ordenes,
                MAX(fecha_entrada)       AS ultima_visita
            FROM ordenes_trabajo
            GROUP BY cliente_nombre
            ORDER BY ultima_visita DESC
        `);
        res.render('Empleado/historial-clientes', { historial: rows });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener historial');
    }
});

app.get('/Empleado/historial-clientes/:nombre', esEmpleado, async (req, res) => {
    try {
        const nombre = decodeURIComponent(req.params.nombre);
        const { rows } = await pool.query(
            `SELECT * FROM ordenes_trabajo WHERE cliente_nombre=$1 ORDER BY fecha_entrada DESC`,
            [nombre]
        );
        res.render('Empleado/detalle-historial', { ordenes: rows, clienteNombre: nombre });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al cargar el historial del cliente');
    }
});

app.get('/Empleado/cotizaciones', esEmpleado, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT c.id, c.unidad, c.total, c.fecha,
                   u.nombre AS cliente_nombre, u.correo AS cliente_correo
              FROM cotizaciones c
              JOIN usuarios u ON u.id = c.cliente_id
             ORDER BY c.fecha DESC
        `);
        res.render('Empleado/cotizaciones', { cotizaciones: rows });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al cargar cotizaciones');
    }
});

app.get('/Empleado/configuracion', esEmpleado, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, nombre, correo, telefono, foto_url, id_rol FROM usuarios WHERE id=$1',
            [req.session.usuario.id]
        );
        if (!rows.length) return res.status(404).send('Empleado no encontrado');
        res.render('Empleado/configuracion', { usuario: rows[0], mensaje: null, error: null });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al cargar configuración');
    }
});

app.get('/Empleado/dashboard', esEmpleado, async (req, res) => {
    try {
        const [ordenesRes, inventarioRes, cotizacionesRes] = await Promise.all([
            pool.query(`SELECT estado, COUNT(*) AS total FROM ordenes_trabajo GROUP BY estado`),
            pool.query(`SELECT COUNT(*) AS total FROM inventario WHERE cantidad <= stock_minimo`),
            pool.query(`SELECT COUNT(*) AS total FROM cotizaciones WHERE fecha >= NOW() - INTERVAL '30 days'`)
        ]);

        const ordenesPorEstado  = ordenesRes.rows;
        const alertasInventario = Number(inventarioRes.rows[0]?.total) || 0;
        const cotizacionesMes   = Number(cotizacionesRes.rows[0]?.total) || 0;

        res.render('Empleado/dashboard', {
            ordenesPorEstado,
            alertasInventario,
            cotizacionesMes
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al cargar el dashboard');
    }
});

app.get('/api/marca-autobus', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, nombre FROM marca_autobus ORDER BY nombre ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener marcas' });
    }
});

app.get('/api/modelos-autobus/:marcaId', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, nombre, tipo_unidad FROM modelos_autobus WHERE marca_id=$1 ORDER BY nombre ASC',
            [req.params.marcaId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener modelos' });
    }
});

app.post('/cliente-inicio', loginLimiter, async (req, res) => {
    const { correo, password } = req.body;

    if (!validarEmail(correo) || !password) {
        return res.render('cliente-inicio', { error: 'Correo o contraseña inválidos.' });
    }

    try {
        const { rows } = await pool.query(
            'SELECT * FROM usuarios WHERE correo=$1 AND rol=$2',
            [correo.trim().toLowerCase(), 'cliente']
        );

        const cliente        = rows[0];
        const passwordValida = cliente && await bcrypt.compare(password, cliente.password);

        if (!passwordValida) {
            return res.render('cliente-inicio', { error: 'Correo o contraseña incorrectos.' });
        }

        req.session.regenerate((err) => {    
            if (err) return res.status(500).send('Error al crear sesión');
            req.session.usuario = {
                id:     cliente.id,
                nombre: cliente.nombre,
                correo: cliente.correo,
                rol:    cliente.rol
            };
            res.redirect('/Cliente/pagina-cliente');
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error interno al iniciar sesión.');
    }
});

app.post('/empleado-inicio', loginLimiter, async (req, res) => {
    const { correo, password, id } = req.body;

    if (!validarEmail(correo) || !password || !id) {
        return res.render('empleado-inicio', { mensaje: 'Todos los campos son obligatorios.', error: true });
    }

    try {
        const { rows } = await pool.query(
            'SELECT * FROM usuarios WHERE correo=$1 AND id_rol=$2 AND rol=$3',
            [correo.trim().toLowerCase(), id.trim(), 'empleado']
        );

        const empleado       = rows[0];
        const passwordValida = empleado && await bcrypt.compare(password, empleado.password);

        if (!passwordValida) {
            return res.render('empleado-inicio', { mensaje: 'Credenciales incorrectas.', error: true });
        }

        req.session.regenerate((err) => {
            if (err) return res.status(500).send('Error al crear sesión');
            req.session.usuario = {
                id:     empleado.id,
                nombre: empleado.nombre,
                correo: empleado.correo,
                rol:    empleado.rol,
                id_rol: empleado.id_rol
            };
            res.redirect('/Empleado/pagina-empleado');
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error interno al iniciar sesión.');
    }
});

app.post('/cliente-registro', registroLimiter, async (req, res) => {
    const { nombre, correo, password, telefono } = req.body;

    if (!nombre?.trim() || !validarEmail(correo) || !validarPassword(password)) {
        return res.render('cliente-registro', {
            successRegister: false,
            error: 'Contraseña inválida: mínimo 8 caracteres, una mayúscula y un carácter especial (!@#$...).'
        });
    }

    try {
        const existe = await pool.query('SELECT id FROM usuarios WHERE correo=$1', [correo.trim().toLowerCase()]);
        if (existe.rows.length) {
            return res.render('cliente-registro', { successRegister: false, error: 'Ese correo ya está registrado.' });
        }

        const hashed = await bcrypt.hash(password, 12);
        await pool.query(
            'INSERT INTO usuarios (nombre, correo, password, rol, telefono) VALUES ($1,$2,$3,$4,$5)',
            [nombre.trim(), correo.trim().toLowerCase(), hashed, 'cliente', telefono?.trim() || null]
        );

        res.render('cliente-registro', {
            alert: true,
            alerttitle: 'Registro exitoso',
            alerttext:  'Ahora puedes iniciar sesión.',
            alerticon:  'success',
            showConfirmButton: false,
            timer: 3000,
            ruta:  '/cliente-inicio'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error en registro.');
    }
});

app.post('/empleado-registro', registroLimiter, async (req, res) => {
    const { nombre, correo, password, telefono, codigo_acceso } = req.body;

    if (codigo_acceso !== process.env.EMPLOYEE_REGISTER_CODE) {
        return res.render('empleado-registro', {
            successRegister: false,
            error: 'Código de acceso incorrecto. Contacta al administrador.'
        });
    }

    if (!nombre?.trim() || !validarEmail(correo) || !validarPassword(password)) {
        return res.render('empleado-registro', {
            successRegister: false,
            error: 'Datos inválidos. La contraseña debe tener al menos 8 caracteres.'
        });
    }

    const uniqueId = `EMP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    try {
        const existe = await pool.query('SELECT id FROM usuarios WHERE correo=$1', [correo.trim().toLowerCase()]);
        if (existe.rows.length) {
            return res.render('empleado-registro', { successRegister: false, error: 'Ese correo ya está registrado.' });
        }

        const hashed = await bcrypt.hash(password, 12);
        await pool.query(
            'INSERT INTO usuarios (nombre, correo, password, rol, id_rol, telefono) VALUES ($1,$2,$3,$4,$5,$6)',
            [nombre.trim(), correo.trim().toLowerCase(), hashed, 'empleado', uniqueId, telefono?.trim() || null]
        );

        // El correo no debe bloquear el registro si falla
        try {
            await transporter.sendMail({
                from:    `"Carrocerías Sandoval" <${process.env.MAIL_USER}>`,
                to:      correo,
                subject: 'Tu ID de Empleado — Acceso Exclusivo',
                html: `
                    <h1>Bienvenido al equipo, ${nombre}</h1>
                    <p>Tu cuenta de empleado fue creada exitosamente.</p>
                    <p>Tu ID único de acceso es: <strong>${uniqueId}</strong></p>
                    <p>Guarda este ID en un lugar seguro. Lo necesitarás para iniciar sesión.</p>
                    <p><em>Si no solicitaste esta cuenta, ignora este correo.</em></p>
                `
            });
        } catch (mailErr) {
            console.error('Aviso: no se pudo enviar correo de empleado:', mailErr.message);
        }

        res.render('empleado-inicio', {
            mensaje: `Empleado registrado. Tu ID es: ${uniqueId} — también se envió a tu correo.`,
            error: false
        });
    } catch (err) {
        console.error('Error en registro empleado:', err.message);
        res.status(500).send('Error al registrar empleado.');
    }
});


app.post('/api/cotizaciones', esCliente, async (req, res) => {
    const { unidad, total, servicios } = req.body;

    if (!unidad || !total || !Array.isArray(servicios) || servicios.length === 0) {
        return res.status(400).json({ error: 'Datos de cotización incompletos' });
    }

    try {
        const usuario = req.session.usuario;

        const cotRes = await pool.query(
            'INSERT INTO cotizaciones (cliente_id, unidad, total) VALUES ($1,$2,$3) RETURNING id',
            [usuario.id, unidad, total]
        );
        const cotizacionId = cotRes.rows[0].id;

        for (const s of servicios) {
            await pool.query(
                'INSERT INTO cotizacion_detalle (cotizacion_id, servicio, cantidad, subtotal) VALUES ($1,$2,$3,$4)',
                [cotizacionId, s.nombre, s.cantidad, s.subtotal]
            );
        }

        await transporter.sendMail({
            from:    `"Carrocerías Sandoval" <${process.env.MAIL_USER}>`,
            to:      usuario.correo,
            subject: 'Tu cotización — Carrocerías Sandoval',
            html: `
                <h2>Cotización Carrocerías Sandoval</h2>
                <p><strong>Unidad:</strong> ${unidad}</p>
                <h3>Servicios:</h3>
                <ul>${servicios.map(s => `<li>${s.nombre} x${s.cantidad} — $${s.subtotal}</li>`).join('')}</ul>
                <h3>Total estimado: $${total}</h3>
                <p><em>Esta es una cotización estimada sujeta a revisión.</em></p>
            `
        });

        res.json({ mensaje: 'Cotización guardada y enviada por correo' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al guardar cotización' });
    }
});

app.put('/api/editar-perfil', esCliente, async (req, res) => {
    const { nombre, correo, telefono } = req.body;

    if (!nombre?.trim() || !validarEmail(correo)) {
        return res.status(400).json({ error: 'Nombre o correo inválidos' });
    }

    try {
        await pool.query(
            'UPDATE usuarios SET nombre=$1, correo=$2, telefono=$3 WHERE id=$4',
            [nombre.trim(), correo.trim().toLowerCase(), telefono?.trim() || null, req.session.usuario.id]
        );
        req.session.usuario.nombre = nombre.trim();
        req.session.usuario.correo = correo.trim().toLowerCase();
        res.json({ mensaje: 'Perfil actualizado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
});

app.delete('/api/eliminar-perfil', esCliente, async (req, res) => {
    try {
        await pool.query('DELETE FROM usuarios WHERE id=$1', [req.session.usuario.id]);
        req.session.destroy();
        res.json({ mensaje: 'Cuenta eliminada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar perfil' });
    }
});

app.post('/api/subir-foto', esCliente, upload.single('foto'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' });
        const fotoPath = tieneCloudinary ? req.file.path : `/uploads/${req.file.filename}`;
        await pool.query('UPDATE usuarios SET foto_url=$1 WHERE id=$2', [fotoPath, req.session.usuario.id]);
        res.json({ mensaje: 'Foto actualizada', foto: fotoPath });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al subir foto' });
    }
});

const ESTADOS_VALIDOS = ['pendiente', 'en_proceso', 'terminado', 'entregado', 'cancelado'];

app.post('/empleado/ordenes/actualizar-estado', esEmpleado, async (req, res) => {
    const { id_orden, nuevo_estado } = req.body;

    if (!ESTADOS_VALIDOS.includes(nuevo_estado)) {
        return res.status(400).send('Estado no válido');
    }

    try {
        await pool.query('UPDATE ordenes_trabajo SET estado=$1 WHERE id=$2', [nuevo_estado, id_orden]);
        res.redirect('/Empleado/ordenes-trabajo');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al actualizar estado');
    }
});

app.post('/empleado/ordenes/nueva', esEmpleado, async (req, res) => {
    const {
        cliente_nombre, vehiculo_modelo, placas,
        descripcion_falla, estado, costo_estimado, fecha_limite
    } = req.body;

    if (!cliente_nombre?.trim() || !vehiculo_modelo?.trim() || !placas?.trim() || !descripcion_falla?.trim()) {
        return res.render('Empleado/nueva-orden', {
            error: 'Todos los campos obligatorios deben estar completos.'
        });
    }

    try {
        await pool.query(
            `INSERT INTO ordenes_trabajo
                (cliente_nombre, vehiculo_modelo, placas, descripcion_falla, estado, costo_estimado, fecha_entrada, fecha_limite)
             VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7)`,
            [
                cliente_nombre.trim(),
                vehiculo_modelo.trim(),
                placas.trim().toUpperCase(),
                descripcion_falla.trim(),
                ESTADOS_VALIDOS.includes(estado) ? estado : 'pendiente',
                parseFloat(costo_estimado) || 0,
                fecha_limite || null
            ]
        );
        res.redirect('/Empleado/ordenes-trabajo');
    } catch (err) {
        console.error(err);
        res.render('Empleado/nueva-orden', { error: 'Error al crear la orden. Intenta de nuevo.' });
    }
});

app.post('/empleado/ordenes/editar/:id', esEmpleado, async (req, res) => {
    const {
        cliente_nombre, vehiculo_modelo, placas,
        descripcion_falla, estado, costo_estimado, fecha_limite
    } = req.body;

    try {
        await pool.query(
            `UPDATE ordenes_trabajo
                SET cliente_nombre=$1, vehiculo_modelo=$2, placas=$3,
                    descripcion_falla=$4, estado=$5, costo_estimado=$6,
                    fecha_limite=$7
              WHERE id=$8`,
            [
                cliente_nombre?.trim(),
                vehiculo_modelo?.trim(),
                placas?.trim().toUpperCase(),
                descripcion_falla?.trim(),
                ESTADOS_VALIDOS.includes(estado) ? estado : 'pendiente',
                parseFloat(costo_estimado) || 0,
                fecha_limite || null,
                req.params.id
            ]
        );
        res.redirect('/Empleado/ordenes-trabajo');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al editar la orden');
    }
});

app.delete('/empleado/ordenes/:id', esEmpleado, async (req, res) => {
    try {
        await pool.query('DELETE FROM ordenes_trabajo WHERE id=$1', [req.params.id]);
        res.json({ mensaje: 'Orden eliminada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar la orden' });
    }
});


app.post('/empleado/inventario/agregar', esEmpleado, async (req, res) => {
    const { producto, cantidad, unidad, precio_unitario, stock_minimo } = req.body;

    if (!producto?.trim() || cantidad === undefined) {
        return res.redirect('/Empleado/inventario-taller?error=Datos+incompletos');
    }

    try {
        await pool.query(
            `INSERT INTO inventario (producto, cantidad, unidad, precio_unitario, stock_minimo)
             VALUES ($1,$2,$3,$4,$5)`,
            [
                producto.trim(),
                parseInt(cantidad) || 0,
                unidad?.trim() || 'pieza',
                parseFloat(precio_unitario) || 0,
                parseInt(stock_minimo) || 0
            ]
        );
        res.redirect('/Empleado/inventario-taller');
    } catch (err) {
        console.error(err);
        res.redirect('/Empleado/inventario-taller?error=Error+al+agregar+producto');
    }
});

app.post('/empleado/inventario/editar/:id', esEmpleado, async (req, res) => {
    const { producto, cantidad, unidad, precio_unitario, stock_minimo } = req.body;

    try {
        await pool.query(
            `UPDATE inventario
                SET producto=$1, cantidad=$2, unidad=$3, precio_unitario=$4, stock_minimo=$5
              WHERE id=$6`,
            [
                producto?.trim(),
                parseInt(cantidad) || 0,
                unidad?.trim() || 'pieza',
                parseFloat(precio_unitario) || 0,
                parseInt(stock_minimo) || 0,
                req.params.id
            ]
        );
        res.redirect('/Empleado/inventario-taller');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al editar producto');
    }
});

app.delete('/empleado/inventario/:id', esEmpleado, async (req, res) => {
    try {
        await pool.query('DELETE FROM inventario WHERE id=$1', [req.params.id]);
        res.json({ mensaje: 'Producto eliminado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

app.post('/Empleado/configuracion/actualizar', esEmpleado, async (req, res) => {
    const { nombre, correo, telefono } = req.body;

    if (!nombre?.trim() || !validarEmail(correo)) {
        const { rows } = await pool.query('SELECT id, nombre, correo, telefono, foto_url, id_rol FROM usuarios WHERE id=$1', [req.session.usuario.id]);
        return res.render('Empleado/configuracion', {
            usuario:  rows[0],
            error:    'Nombre o correo inválidos.',
            mensaje:  null
        });
    }

    try {
        await pool.query(
            'UPDATE usuarios SET nombre=$1, correo=$2, telefono=$3 WHERE id=$4',
            [nombre.trim(), correo.trim().toLowerCase(), telefono?.trim() || null, req.session.usuario.id]
        );
        req.session.usuario.nombre = nombre.trim();
        req.session.usuario.correo = correo.trim().toLowerCase();

        const { rows } = await pool.query('SELECT id, nombre, correo, telefono, foto_url, id_rol FROM usuarios WHERE id=$1', [req.session.usuario.id]);
        res.render('Empleado/configuracion', {
            usuario:  rows[0],
            mensaje:  'Perfil actualizado correctamente.',
            error:    null
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al actualizar perfil');
    }
});
app.post('/Empleado/configuracion/cambiar-password', esEmpleado, async (req, res) => {
    const { password_actual, password_nueva, password_confirmar } = req.body;

    const renderError = async (error) => {
        const { rows } = await pool.query('SELECT id, nombre, correo, telefono, foto_url, id_rol FROM usuarios WHERE id=$1', [req.session.usuario.id]);
        return res.render('Empleado/configuracion', { usuario: rows[0], error, mensaje: null });
    };

    if (!validarPassword(password_nueva)) {
        return renderError('La nueva contraseña debe tener al menos 8 caracteres.');
    }
    if (password_nueva !== password_confirmar) {
        return renderError('Las contraseñas nuevas no coinciden.');
    }

    try {
        const { rows } = await pool.query('SELECT password FROM usuarios WHERE id=$1', [req.session.usuario.id]);
        const valida = await bcrypt.compare(password_actual, rows[0].password);

        if (!valida) return renderError('La contraseña actual es incorrecta.');

        const hashed = await bcrypt.hash(password_nueva, 12);
        await pool.query('UPDATE usuarios SET password=$1 WHERE id=$2', [hashed, req.session.usuario.id]);

        const resConf = await pool.query('SELECT id, nombre, correo, telefono, foto_url, id_rol FROM usuarios WHERE id=$1', [req.session.usuario.id]);
        res.render('Empleado/configuracion', {
            usuario: resConf.rows[0],
            mensaje: 'Contraseña actualizada correctamente.',
            error:   null
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al cambiar contraseña');
    }
});

app.post('/api/empleado/subir-foto', esEmpleado, upload.single('foto'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' });
        const fotoPath = tieneCloudinary ? req.file.path : `/uploads/${req.file.filename}`;
        await pool.query('UPDATE usuarios SET foto_url=$1 WHERE id=$2', [fotoPath, req.session.usuario.id]);
        res.json({ mensaje: 'Foto actualizada', foto: fotoPath });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al subir foto' });
    }
});

app.use((err, req, res, next) => {
    if (err.message === 'Solo se permiten imágenes (jpg, png, webp)') {
        return res.status(400).json({ error: err.message });
    }
    console.error('Error no manejado:', err);
    res.status(500).send('Error interno del servidor');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));