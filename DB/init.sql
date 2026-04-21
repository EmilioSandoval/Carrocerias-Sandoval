CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    rol VARCHAR(20) NOT NULL, -- 'cliente' o 'empleado'
    id_rol VARCHAR(50) UNIQUE, 
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para la Galería de Trabajos
CREATE TABLE IF NOT EXISTS trabajos (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(100),
    descripcion TEXT,
    imagen_url TEXT,
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE servicios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio_estimado DECIMAL(10, 2)
);

-- Tabla para los trabajos (órdenes de reparación) de clientes específicos
CREATE TABLE trabajos_taller (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES usuarios(id), -- Asumiendo que tienes una tabla usuarios
    vehiculo_modelo VARCHAR(100),
    estado VARCHAR(50) DEFAULT 'En proceso', -- 'En proceso', 'Terminado', 'Entregado'
    fecha_inicio DATE DEFAULT CURRENT_DATE,
    descripcion_reparacion TEXT
);

-- Tabla para el Equipo de Trabajo (Encargados)
CREATE TABLE IF NOT EXISTS equipo (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100),
    puesto VARCHAR(50),
    telefono VARCHAR(20),
    foto_url TEXT
);
CREATE TABLE IF NOT EXISTS inventario (
    id SERIAL PRIMARY KEY,
    producto VARCHAR(100) NOT NULL,
    categoria VARCHAR(50), -- 'Pintura', 'Refacción', 'Herramienta'
    cantidad INTEGER DEFAULT 0,
    unidad_medida VARCHAR(20), -- 'Litros', 'Piezas', 'Paquetes'
    ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS ordenes_trabajo (
    id SERIAL PRIMARY KEY,
    vehiculo_modelo VARCHAR(100) NOT NULL,
    placas VARCHAR(20),
    cliente_nombre VARCHAR(100),
    descripcion_falla TEXT,
    estado VARCHAR(50) DEFAULT 'Pendiente', -- 'Pendiente', 'En Pintura', 'Armado', 'Listo'
    fecha_entrada DATE DEFAULT CURRENT_DATE
);
CREATE TABLE IF NOT EXISTS historial_clientes (
    id SERIAL PRIMARY KEY,
    cliente_nombre VARCHAR(100) NOT NULL,
    vehiculo_modelo VARCHAR(100),
    fecha_reparacion DATE,
    descripcion_reparacion TEXT
);
CREATE TABLE IF NOT EXISTS marca_autobus (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS modelos_autobus (
    id SERIAL PRIMARY KEY,
    marca_id INTEGER REFERENCES marca_autobus(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    tipo_unidad VARCHAR(100) NOT NULL
);
