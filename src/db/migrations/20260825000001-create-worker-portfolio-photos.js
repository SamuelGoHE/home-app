'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('worker_portfolio_photos', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      url: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      storage_path: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      specialty: {
        type: Sequelize.ENUM('pintura','enchapes','electricidad','plomeria','obra_gris','carpinteria','impermeabilizacion','otro'),
        allowNull: false,
      },
      caption: {
        type: Sequelize.STRING(300),
        allowNull: true,
      },
      worker_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('worker_portfolio_photos', ['worker_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('worker_portfolio_photos');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_worker_portfolio_photos_specialty"');
  },
};
