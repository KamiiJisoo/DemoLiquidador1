-- Script para configurar las tablas en Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- Crear tabla ACCESOS
CREATE TABLE IF NOT EXISTS accesos (
  id BIGSERIAL PRIMARY KEY,
  ip VARCHAR(255) NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Crear tabla CARGOS
CREATE TABLE IF NOT EXISTS cargos (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL UNIQUE,
  salario BIGINT NOT NULL
);

-- Crear tabla FESTIVOS
CREATE TABLE IF NOT EXISTS festivos (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE NOT NULL UNIQUE,
  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('FIJO', 'MOVIL'))
);

-- Insertar datos iniciales en CARGOS (si no existen)
INSERT INTO cargos (nombre, salario) VALUES 
  ('BOMBERO', 2054865),
  ('CABO DE BOMBERO', 2197821),
  ('SARGENTO DE BOMBERO', 2269299),
  ('TENIENTE DE BOMBERO', 2510541)
ON CONFLICT (nombre) DO NOTHING;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_accesos_fecha ON accesos(fecha);
CREATE INDEX IF NOT EXISTS idx_festivos_fecha ON festivos(fecha);
CREATE INDEX IF NOT EXISTS idx_cargos_nombre ON cargos(nombre);

-- Habilitar RLS (Row Level Security) si es necesario
-- ALTER TABLE accesos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cargos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE festivos ENABLE ROW LEVEL SECURITY;

-- Crear políticas de seguridad (opcional, ajustar según necesidades)
-- CREATE POLICY "Enable read access for all users" ON accesos FOR SELECT USING (true);
-- CREATE POLICY "Enable insert access for all users" ON accesos FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Enable update access for all users" ON accesos FOR UPDATE USING (true);
-- CREATE POLICY "Enable delete access for all users" ON accesos FOR DELETE USING (true);

-- Repetir para otras tablas si es necesario
-- CREATE POLICY "Enable read access for all users" ON cargos FOR SELECT USING (true);
-- CREATE POLICY "Enable insert access for all users" ON cargos FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Enable update access for all users" ON cargos FOR UPDATE USING (true);
-- CREATE POLICY "Enable delete access for all users" ON cargos FOR DELETE USING (true);

-- CREATE POLICY "Enable read access for all users" ON festivos FOR SELECT USING (true);
-- CREATE POLICY "Enable insert access for all users" ON festivos FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Enable update access for all users" ON festivos FOR UPDATE USING (true);
-- CREATE POLICY "Enable delete access for all users" ON festivos FOR DELETE USING (true); 