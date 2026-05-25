CREATE TABLE IF NOT EXISTS usuarios (
    id             SERIAL PRIMARY KEY,
    nombre         VARCHAR(100) NOT NULL,
    correo         VARCHAR(100) UNIQUE NOT NULL,
    password       TEXT NOT NULL,
    rol            VARCHAR(20) NOT NULL,          -- 'cliente' | 'empleado' | 'admin'
    id_rol         VARCHAR(50) UNIQUE,            -- Solo empleados: EMP-XXXXXX
    telefono       VARCHAR(20),
    foto_url       TEXT,
    puesto         VARCHAR(100),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS puesto VARCHAR(100);

CREATE TABLE IF NOT EXISTS marca_autobus (
    id     SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS modelos_autobus (
    id          SERIAL PRIMARY KEY,
    marca_id    INTEGER REFERENCES marca_autobus(id) ON DELETE CASCADE,
    nombre      VARCHAR(100) NOT NULL,
    tipo_unidad VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS servicios (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    descripcion     TEXT,
    precio_estimado DECIMAL(10,2)
);

CREATE TABLE IF NOT EXISTS inventario (
    id                  SERIAL PRIMARY KEY,
    producto            VARCHAR(100) NOT NULL,
    categoria           VARCHAR(50),              -- 'Pintura', 'Refacción', 'Herramienta'
    cantidad            INTEGER DEFAULT 0,
    unidad              VARCHAR(20) DEFAULT 'pieza', -- 'litro', 'kg', 'pieza'…
    precio_unitario     DECIMAL(10,2) DEFAULT 0,
    stock_minimo        INTEGER DEFAULT 0,
    ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS ordenes_trabajo (
    id               SERIAL PRIMARY KEY,
    cliente_nombre   VARCHAR(100),
    vehiculo_modelo  VARCHAR(100) NOT NULL,
    placas           VARCHAR(20),
    descripcion_falla TEXT,
    estado           VARCHAR(50) DEFAULT 'pendiente',
    costo_estimado   DECIMAL(10,2) DEFAULT 0,
    fecha_entrada    DATE DEFAULT CURRENT_DATE,
    fecha_limite     DATE
);
ALTER TABLE ordenes_trabajo ADD COLUMN IF NOT EXISTS fecha_limite DATE;

CREATE TABLE IF NOT EXISTS cotizaciones (
    id         SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    unidad     VARCHAR(200),
    total      DECIMAL(10,2) DEFAULT 0,
    fecha      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cotizacion_detalle (
    id            SERIAL PRIMARY KEY,
    cotizacion_id INTEGER NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
    servicio      VARCHAR(150),
    cantidad      INTEGER DEFAULT 1,
    subtotal      DECIMAL(10,2) DEFAULT 0
);
CREATE TABLE IF NOT EXISTS trabajos (
    id          SERIAL PRIMARY KEY,
    titulo      VARCHAR(100),
    descripcion TEXT,
    imagen_url  TEXT,
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS equipo (
    id       SERIAL PRIMARY KEY,
    nombre   VARCHAR(100),
    puesto   VARCHAR(50),
    telefono VARCHAR(20),
    foto_url TEXT
);
INSERT INTO marca_autobus (nombre) VALUES
    ('Dina'), ('Mercedes-Benz'), ('Volvo'), ('Scania'), ('Man'),
    ('Irizar'), ('Marcopolo')
ON CONFLICT DO NOTHING;

INSERT INTO modelos_autobus (marca_id, nombre, tipo_unidad)
SELECT m.id, v.nombre, v.tipo_unidad FROM marca_autobus m
JOIN (VALUES
    ('Dina',          '323',         'Urbano'),
    ('Dina',          'Olímpico',    'Foráneo'),
    ('Mercedes-Benz', 'OF-1721',     'Urbano'),
    ('Mercedes-Benz', 'OF-1418',     'Foráneo'),
    ('Mercedes-Benz', 'OF-1722',     'Foráneo'),
    ('Marcopolo',     'G7',          'Foráneo'),
    ('Marcopolo',     'G8',          'Foráneo'),
    ('Volvo',         '9700',         'Foráneo'),
    ('Volvo',         '9800',         'Foráneo'),
    ('Irizar',        'i6',          'Foráneo'),
    ('Irizar',        'i8',          'Foráneo'),
    ('Irizar',        'PB',          'Foráneo'),
    ('Scania',        'K360',        'Foráneo'),
    ('Man',           'Lion''s City','Urbano')
) AS v(marca, nombre, tipo_unidad) ON m.nombre = v.marca
ON CONFLICT DO NOTHING;

INSERT INTO servicios (nombre, descripcion, precio_estimado) VALUES
    ('Pintura general',        'Pintura completa del vehículo',                    150000.00),
    ('Reparación de carrocería','Reparación de abolladuras y daños estructurales', 8000.00),
    ('Pulido y encerado',      'Pulido completo y aplicación de cera',             25000.00),
    ('Cambio de parabrisas',   'Sustitución de parabrisas delantero',              20000.00),
    ('Tapizado de interiores', 'Tapizado completo de asientos y paredes',          35000.00),
    ('Instalación de accesorios', 'Instalación de accesorios como luces, espejos, etc.', 5000.00),
    ('Instalación de sistema de sonido', 'Instalación de sistema de sonido para el vehículo', 10000.00),
    ('Instalación de sistema de entretenimiento', 'Instalación de pantallas y sistemas de entretenimiento', 15000.00),
    ('Instalacion de casa rodante', 'Conversion de autobus a casa rodante', 200000.00),
    ('Conversion de Frente y parte trasera para unidades fóraneas', 'Modificación de la estructura para unidades foráneas', 600000.00)
ON CONFLICT DO NOTHING;

INSERT INTO usuarios (nombre, correo, password, rol, telefono, foto_url, puesto) VALUES
    ('Ing. Felipe Sandoval',  'carrocerias-sandoval@hotmail.com', 'no-login', 'admin', '+52 33 31 05 8247', '/IMAGENES/Encargado1.jpg', 'Director de Producción'),
    ('Lic. Emilio Sandoval',  'oscarsandoval12346@outlook.com',   'no-login', 'admin', '+52 33 34 62 1112', '/IMAGENES/Encargado2.jpg', 'Atención al Cliente')
ON CONFLICT (correo) DO UPDATE
    SET puesto    = EXCLUDED.puesto,
        telefono  = EXCLUDED.telefono,
        foto_url  = EXCLUDED.foto_url;