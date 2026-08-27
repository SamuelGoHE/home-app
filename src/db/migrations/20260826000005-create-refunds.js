'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('refunds', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      // No existe una tabla de cuentas bancarias para clientes (a diferencia
      // de worker_payout_accounts) — un cliente pide reembolso muy rara vez,
      // así que estos datos se capturan aquí mismo, ad-hoc, al cancelar.
      bank_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      account_type: {
        type: Sequelize.ENUM('ahorros', 'corriente'),
        allowNull: false,
      },
      account_number: {
        type: Sequelize.STRING(30),
        allowNull: false,
      },
      account_holder_id_number: {
        type: Sequelize.STRING(30),
        allowNull: false,
      },
      // Definido por admin_finanzas caso por caso — no hay fórmula todavía.
      penalty_amount: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: true,
      },
      refund_amount: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pendiente', 'aprobado', 'enviado', 'completado', 'fallido'),
        defaultValue: 'pendiente',
      },
      approved_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      wompi_payout_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      project_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'projects', key: 'id' },
        onDelete: 'CASCADE',
      },
      client_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      payment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'payments', key: 'id' },
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('refunds');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_refunds_account_type"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_refunds_status"');
  },
};
