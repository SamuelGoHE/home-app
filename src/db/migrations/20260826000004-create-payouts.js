'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payouts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      amount: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pendiente', 'aprobado', 'enviado', 'completado', 'fallido'),
        defaultValue: 'pendiente',
      },
      // project.actual_end_date + PAYOUT_WAIT_HOURS, calculado una sola vez al
      // crear el registro. admin_finanzas solo puede aprobar payouts con
      // now() >= eligible_at — así se evita un cron: se filtra por esta
      // columna al listar en vez de recalcular la ventana de espera.
      eligible_at: {
        type: Sequelize.DATE,
        allowNull: false,
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
      failure_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      project_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true, // un solo payout por proyecto (el pago 2 completo)
        references: { model: 'projects', key: 'id' },
        onDelete: 'CASCADE',
      },
      worker_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('payouts', ['worker_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payouts');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payouts_status"');
  },
};
