'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('worker_service_rates', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      worker_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      specialty: { type: Sequelize.STRING(50), allowNull: false },
      price_unit: {
        type: Sequelize.ENUM('por_hora', 'por_dia', 'por_m2', 'por_proyecto', 'a_convenir'),
        allowNull: false,
      },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      includes_materials: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      note: { type: Sequelize.STRING(280), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('worker_service_rates', ['worker_id', 'specialty'], {
      unique: true,
      name: 'worker_service_rates_worker_specialty_unique',
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('worker_service_rates');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_worker_service_rates_price_unit"');
  },
};
