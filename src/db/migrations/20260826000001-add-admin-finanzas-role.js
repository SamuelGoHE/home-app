'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // ALTER TYPE ... ADD VALUE no puede revertirse ni correr dentro de una
    // transacción que luego lea el nuevo valor — sequelize-cli no envuelve
    // las migraciones en transacción por defecto (ver resto de migrations/),
    // así que esto corre suelto.
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'admin_finanzas';`
    );
  },

  async down() {
    // Postgres no soporta quitar un valor de un ENUM sin recrear el tipo
    // (y recrearlo requeriría migrar cualquier fila que ya use 'admin_finanzas').
    // No-op deliberado: revertir este rol se hace a mano si hace falta.
  },
};
