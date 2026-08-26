'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Sequelize's queryInterface.addColumn no soporta bien ARRAY(ENUM) directamente
    // (bug conocido: https://github.com/sequelize/sequelize/issues/12045) — se crea con SQL crudo.
    await queryInterface.sequelize.query(
      `CREATE TYPE "enum_worker_profiles_pricing_modes" AS ENUM('por_dia', 'por_contrato');`
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE "worker_profiles" ADD COLUMN "pricing_modes" "enum_worker_profiles_pricing_modes"[] DEFAULT ARRAY[]::"enum_worker_profiles_pricing_modes"[];`
    );
    await queryInterface.addColumn('worker_profiles', 'daily_rate', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });
    // Por contrato no hay un precio fijo posible (depende de m², materiales, alcance) — el trabajador
    // describe cómo cotiza y el monto real lo define al aceptar cada solicitud puntual.
    await queryInterface.addColumn('worker_profiles', 'contract_pricing_note', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    // hourly_rate nunca se expuso vía API (PUT /users/worker-profile no lo acepta) — se reemplaza por daily_rate.
    await queryInterface.removeColumn('worker_profiles', 'hourly_rate');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('worker_profiles', 'hourly_rate', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });
    await queryInterface.removeColumn('worker_profiles', 'contract_pricing_note');
    await queryInterface.removeColumn('worker_profiles', 'daily_rate');
    await queryInterface.removeColumn('worker_profiles', 'pricing_modes');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_worker_profiles_pricing_modes"');
  },
};
