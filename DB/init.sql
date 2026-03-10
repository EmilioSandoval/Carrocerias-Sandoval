CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    rol VARCHAR(20) NOT NULL, -- 'cliente' o 'empleado'
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

-- Tabla para el Equipo de Trabajo (Encargados)
CREATE TABLE IF NOT EXISTS equipo (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100),
    puesto VARCHAR(50),
    telefono VARCHAR(20),
    foto_url TEXT
);