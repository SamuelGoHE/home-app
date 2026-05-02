# HOME Backend — Guía de instalación

## Pasos para instalar

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo .env (editar con tus datos)
cp .env.example .env

# 3. Crear base de datos en PostgreSQL
psql -U postgres -c "CREATE DATABASE home_db;"

# 4. Poblar la BD con servicios y usuarios de prueba
npm run seed

# 5. Iniciar el servidor
npm run dev
```

## Verificar que funciona

Abre en el navegador:
- http://localhost:3000/health
- http://localhost:3000/api/services  ← requiere token

## Usuarios de prueba (después del seed)

| Rol        | Email                    | Password     |
|------------|--------------------------|--------------|
| Admin      | admin@home.com           | Admin1234    |
| Trabajador | trabajador@home.com      | Worker1234   |
| Cliente    | cliente@home.com         | Cliente1234  |

## Endpoints disponibles

### Auth (sin token)
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/forgot-password

### Auth (con token)
- GET  /api/auth/me
- POST /api/auth/logout

### Servicios (todos los roles)
- GET  /api/services
- GET  /api/services/:id
- POST /api/services          ← solo admin

### Proyectos
- GET  /api/projects          ← según rol
- GET  /api/projects/:id
- POST /api/projects          ← solo admin
- PATCH /api/projects/:id/status ← solo admin
- DELETE /api/projects/:id    ← solo admin

### Tareas
- POST  /api/tasks            ← solo admin
- PATCH /api/tasks/:id        ← admin + trabajador
- PATCH /api/tasks/:id/assign ← solo admin

### Cotizaciones
- POST /api/quotes            ← solo cliente
- GET  /api/quotes/me         ← solo cliente
- GET  /api/quotes            ← solo admin

### Workers
- GET /api/workers            ← todos los roles
