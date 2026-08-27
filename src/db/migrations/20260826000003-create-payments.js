'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      type: {
        type: Sequelize.ENUM('inicial', 'final'),
        allowNull: false,
      },
      amount: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
      },
      // Referencia única que nosotros generamos y le pasamos a Wompi al crear
      // el Payment Link — es lo que usamos para reconciliar el webhook.
      wompi_reference: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      wompi_transaction_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      // CARD / PSE / NEQUI — viene del webhook, no lo elegimos nosotros.
      payment_method: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pendiente', 'aprobado', 'declinado', 'error'),
        defaultValue: 'pendiente',
      },
      paid_at: {
        type: Sequelize.DATE,
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
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('payments', ['project_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payments');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payments_type"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payments_status"');
  },
};
