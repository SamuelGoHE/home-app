'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('worker_payout_accounts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      bank_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      account_type: {
        type: Sequelize.ENUM('ahorros', 'corriente'),
        allowNull: false,
      },
      // Solo se guardan los últimos 4 dígitos para mostrar en UI — el número
      // completo se envía a Wompi al registrar el destinatario del payout y
      // Wompi queda como fuente de verdad (wompi_recipient_id).
      account_number_last4: {
        type: Sequelize.STRING(4),
        allowNull: false,
      },
      account_holder_id_number: {
        type: Sequelize.STRING(30),
        allowNull: false,
      },
      wompi_recipient_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      verified_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
      },
      verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      worker_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true, // un trabajador tiene una sola cuenta de payout activa a la vez
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('worker_payout_accounts');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_worker_payout_accounts_account_type"');
  },
};
