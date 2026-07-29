'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('services', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      category: {
        type: Sequelize.ENUM(
          'pintura',
          'enchapes',
          'electricidad',
          'plomeria',
          'obra_gris',
          'carpinteria',
          'impermeabilizacion',
          'otro'
        ),
        allowNull: false,
      },
      base_price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      price_unit: {
        type: Sequelize.ENUM('por_hora', 'por_m2', 'por_proyecto', 'a_convenir'),
        defaultValue: 'a_convenir',
      },
      image_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      estimated_days: {
        type: Sequelize.INTEGER,
        allowNull: true,
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('services');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_services_category"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_services_price_unit"');
  },
};
