'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('quotes', 'pricing_type', {
      type: Sequelize.ENUM('por_dia', 'por_contrato'),
      allowNull: false,
      defaultValue: 'por_contrato',
    });
    await queryInterface.addColumn('quotes', 'estimated_days', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('quotes', 'agreed_price', {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('quotes', 'agreed_price');
    await queryInterface.removeColumn('quotes', 'estimated_days');
    await queryInterface.removeColumn('quotes', 'pricing_type');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_quotes_pricing_type"');
  },
};
