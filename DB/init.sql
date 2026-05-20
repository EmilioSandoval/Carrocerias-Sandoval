CREATE TABLE IF NOT EXISTS usuarios (
    id             SERIAL PRIMARY KEY,
    nombre         VARCHAR(100) NOT NULL,
    correo         VARCHAR(100) UNIQUE NOT NULL,
    password       TEXT NOT NULL,
    rol            VARCHAR(20) NOT NULL,          -- 'cliente' | 'empleado'
    id_rol         VARCHAR(50) UNIQUE,            -- Solo empleados: EMP-XXXXXX
    telefono       VARCHAR(20),
    foto_url       TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
    fecha_entrada    DATE DEFAULT CURRENT_DATE
);

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
    ('Dina'), ('Mercedes-Benz'), ('Volvo'), ('Scania'), ('Man')
ON CONFLICT DO NOTHING;

INSERT INTO modelos_autobus (marca_id, nombre, tipo_unidad)
SELECT m.id, v.nombre, v.tipo_unidad FROM marca_autobus m
JOIN (VALUES
    ('Dina',          '323',         'Urbano'),
    ('Dina',          'Olímpico',    'Foráneo'),
    ('Mercedes-Benz', 'OF-1721',     'Urbano'),
    ('Mercedes-Benz', 'OF-1418',     'Foráneo'),
    ('Volvo',         'B8R',         'Foráneo'),
    ('Scania',        'K360',        'Foráneo'),
    ('Man',           'Lion''s City','Urbano')
) AS v(marca, nombre, tipo_unidad) ON m.nombre = v.marca
ON CONFLICT DO NOTHING;

INSERT INTO servicios (nombre, descripcion, precio_estimado) VALUES
    ('Pintura general',        'Pintura completa del vehículo',                    15000.00),
    ('Reparación de carrocería','Reparación de abolladuras y daños estructurales', 8000.00),
    ('Pulido y encerado',      'Pulido completo y aplicación de cera',             3000.00),
    ('Cambio de parabrisas',   'Sustitución de parabrisas delantero',              4500.00),
    ('Tapizado de interiores', 'Tapizado completo de asientos y paredes',          12000.00),
    ('Soldadura',              'Trabajos de soldadura estructural',                 5000.00)
ON CONFLICT DO NOTHING;