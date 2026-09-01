'use strict';

/**
 * Utilidad administrativa PUNTUAL — no forma parte del flujo normal de la app.
 *
 * Activa (is_active = true) a TODOS los usuarios de la base de datos, sin
 * ninguna condición. Úsalo solo de forma manual y consciente (p. ej. tras una
 * migración que dejó cuentas desactivadas). Requiere acceso al repo/servidor y
 * credenciales de la DB configuradas en el entorno.
 *
 * Uso:  node scripts/activate-users.js
 *
 * ⚠️  Afecta a todos los usuarios de golpe (incluye cuentas bloqueadas por un
 *     admin). Revisa que sea realmente lo que quieres antes de ejecutarlo.
 */

const { User } = require('../src/models');

async function activateAll() {
  try {
    const [count] = await User.update({ is_active: true }, { where: {} });
    console.log(`✅ Éxito: Se han activado ${count} usuarios.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error actualizando usuarios:', err);
    process.exit(1);
  }
}

activateAll();
