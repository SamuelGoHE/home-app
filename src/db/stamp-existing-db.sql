-- ============================================================
-- STAMP SCRIPT — Ejecutar UNA SOLA VEZ en una BD ya existente
-- ============================================================
-- Este script le dice a sequelize-cli que las migraciones
-- iniciales ya fueron aplicadas, sin tocar las tablas reales.
--
-- Cuándo usar esto:
--   - La base de datos YA tiene las tablas creadas por sync()
--   - Quieres empezar a usar migraciones sin recrear nada
--
-- Cuándo NO usar esto:
--   - Base de datos vacía/nueva → usa: npm run db:migrate
-- ============================================================

CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
  name VARCHAR(255) NOT NULL,
  CONSTRAINT "SequelizeMeta_pkey" PRIMARY KEY (name)
);

INSERT INTO "SequelizeMeta" (name) VALUES
  ('20240101000001-create-users.js'),
  ('20240101000002-create-services.js'),
  ('20240101000003-create-worker-profiles.js'),
  ('20240101000004-create-projects.js'),
  ('20240101000005-create-tasks.js'),
  ('20240101000006-create-quotes.js'),
  ('20240101000007-create-ratings.js'),
  ('20240101000008-create-messages.js')
ON CONFLICT (name) DO NOTHING;

-- Verificar que quedó correcto:
SELECT name FROM "SequelizeMeta" ORDER BY name;
