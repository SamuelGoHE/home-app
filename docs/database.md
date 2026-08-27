# Base de datos

PostgreSQL, accedido vía Sequelize 6. En desarrollo normalmente apunta a un proyecto de **Supabase** (`DATABASE_URL`, con SSL forzado y `rejectUnauthorized: false` — ver nota de seguridad en [`quality-report.md`](quality-report.md)); también funciona contra Postgres local usando `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`.

Todas las tablas usan `id UUID` como primary key (`DataTypes.UUIDV4`), `timestamps: true` y `underscored: true` (Sequelize traduce `createdAt`/`updatedAt` a `created_at`/`updated_at` en la columna real, pero los expone en camelCase en el JSON de la API).

## Diagrama de relaciones

```
users ──1:1──► worker_profiles (user_id, unique)
users ──1:N──► projects   (client_id / worker_id / admin_id — 3 FKs distintas)
users ──1:N──► quotes     (client_id / worker_id)
users ──1:N──► tasks      (assigned_to / created_by)
users ──1:N──► ratings    (reviewer_id / worker_id)
users ──1:N──► messages   (sender_id)

services ──1:N──► projects
services ──1:N──► quotes

projects ──1:N──► tasks      (ON DELETE CASCADE)
projects ──1:1──► quotes     (project_id, opcional — se llena al aceptar la solicitud)
projects ──1:N──► ratings
projects ──1:N──► messages   (ON DELETE CASCADE)
```

## Tablas

### `users`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `name` | STRING(100) NOT NULL | |
| `email` | STRING(150) UNIQUE NOT NULL | validado como email |
| `password` | STRING, nullable | `null` para usuarios OAuth-only; hasheado con **bcrypt (cost 12)** en un hook `beforeCreate`/`beforeUpdate` |
| `phone`, `city`, `address` | STRING, nullable | |
| `role` | ENUM(`cliente`,`trabajador`,`admin`) | default `cliente` |
| `avatar` | STRING, nullable | URL (Supabase Storage) |
| `is_active` | BOOLEAN | default `true`; lo usa el admin para bloquear cuentas |
| `is_verified` | BOOLEAN | default `false` |
| `verification_token`, `reset_password_token`, `reset_password_expires` | | flujo de verificación/reset (reset implementado, verificación de email **no** — ver roadmap) |
| `oauth_provider` | ENUM(`local`,`google`,`facebook`,`apple`) | default `local` |
| `oauth_id` | STRING, nullable | `sub` del proveedor OAuth |
| `last_login` | DATE, nullable | |
| `rating_avg` | DECIMAL(3,2) | desnormalizado, recalculado en cada `Rating` nuevo |
| `rating_count` | INTEGER | desnormalizado |

Métodos de instancia: `comparePassword(plain)` (bcrypt.compare), `toSafeJSON()` (quita `password`, `verification_token`, `reset_password_token` antes de responder por la API — úsalo siempre en vez de `.toJSON()` al serializar un usuario).

### `worker_profiles`
Perfil profesional extendido de un usuario con `role = 'trabajador'`. `user_id` es UNIQUE (relación 1:1 real).
| Columna | Tipo |
|---|---|
| `bio` | TEXT |
| `specialties`, `certifications`, `portfolio_urls`, `cities_covered` | ARRAY(STRING) |
| `years_experience`, `completed_jobs` | INTEGER |
| `is_verified`, `is_available` | BOOLEAN |
| `hourly_rate` | DECIMAL(10,2) |

### `services`
Catálogo de servicios ofrecidos (pintura, plomería, etc.).
| Columna | Tipo |
|---|---|
| `name` | STRING(100) |
| `category` | ENUM(`pintura`,`enchapes`,`electricidad`,`plomeria`,`obra_gris`,`carpinteria`,`impermeabilizacion`,`otro`) |
| `base_price` | DECIMAL(12,2), nullable (`null` = "a convenir") |
| `price_unit` | ENUM(`por_hora`,`por_m2`,`por_proyecto`,`a_convenir`) |
| `image_url` | STRING |
| `estimated_days` | INTEGER |
| `is_active` | BOOLEAN |

### `quotes` (solicitudes / cotizaciones)
| Columna | Tipo |
|---|---|
| `status` | ENUM(`solicitud_pendiente`,`pendiente`,`revisada`,`aceptada`,`rechazada`,`expirada`) |
| `client_id`, `service_id`, `worker_id` (nullable) | FK |
| `project_id` | FK nullable — se completa cuando el trabajador acepta |
| `city`, `address`, `sq_meters`, `occupied` | datos del sitio a intervenir |
| `estimated_price` | DECIMAL(14,2), calculado como `base_price × sq_meters` cuando aplica |
| `expires_at` | DATE — 7 días desde la creación |

### `projects`
| Columna | Tipo |
|---|---|
| `status` | ENUM(`pendiente`,`en_revision`,`aprobado`,`en_progreso`,`pausado`,`completado`,`cancelado`) |
| `client_id`, `worker_id` (nullable), `admin_id` (nullable), `service_id` | FK |
| `city`, `address`, `sq_meters`, `occupied`, `budget` | |
| `start_date`, `end_date`, `actual_end_date` | DATEONLY |

### `tasks`
| Columna | Tipo |
|---|---|
| `status` | ENUM(`pendiente`,`en_progreso`,`en_revision`,`completada`,`bloqueada`) |
| `priority` | ENUM(`baja`,`media`,`alta`,`urgente`) |
| `project_id` | FK, **ON DELETE CASCADE** |
| `assigned_to`, `created_by` | FK a `users` |
| `evidence_urls` | ARRAY(STRING) |
| `estimated_hours`, `actual_hours` | DECIMAL(6,2) |

### `ratings`
| Columna | Tipo |
|---|---|
| `score` | INTEGER, validado 1-5 |
| `comment` | TEXT nullable |
| `reviewer_id` (cliente), `worker_id`, `project_id` | FK |

Índice único compuesto `(reviewer_id, project_id)` — **un cliente solo puede calificar una vez por proyecto**, garantizado a nivel de base de datos además de en `ratingService`.

### `messages` (chat)
| Columna | Tipo |
|---|---|
| `text` | TEXT NOT NULL |
| `read` | BOOLEAN default `false` (campo existente en el modelo; **no hay ningún endpoint que lo actualice** — ver roadmap) |
| `project_id` | FK, **ON DELETE CASCADE** |
| `sender_id` | FK a `users` |

## Notas operativas

- **No hay `db:seed:all` de `sequelize-cli`** configurado en `package.json`; el seed de datos de prueba (`npm run seed`) es un script propio (`src/config/seed.js`), no las migraciones/seeders estándar de Sequelize (que sí existen en `src/db/seeders/` pero no están enlazadas a ningún script de `package.json`).
- El seed propio (`npm run seed`) es **idempotente** (`findOrCreate`): se puede correr varias veces sin duplicar usuarios de prueba ni servicios.
- No hay `DB_NAME_TEST` configurado por defecto para tests — `src/config/config.js` lo arma como `${DB_NAME}_test` si no se define explícitamente. Los tests actuales no lo usan (mockean Sequelize en vez de golpear una base real, ver [`quality-report.md`](quality-report.md)).
