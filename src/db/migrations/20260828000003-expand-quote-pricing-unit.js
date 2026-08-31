'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // La modalidad original solo contemplaba día/contrato. Ahora conserva la unidad
    // publicada por el trabajador (hora, día, m², proyecto o a convenir).
    await queryInterface.sequelize.query('ALTER TABLE "quotes" ALTER COLUMN "pricing_type" DROP DEFAULT');
    await queryInterface.sequelize.query('ALTER TABLE "quotes" ALTER COLUMN "pricing_type" TYPE VARCHAR(20) USING "pricing_type"::text');
    await queryInterface.sequelize.query("ALTER TABLE \"quotes\" ALTER COLUMN \"pricing_type\" SET DEFAULT 'a_convenir'");
    await queryInterface.addColumn('quotes', 'service_rate_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'worker_service_rates', key: 'id' },
      onDelete: 'SET NULL',
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('quotes', 'service_rate_id');
    await queryInterface.sequelize.query('ALTER TABLE "quotes" ALTER COLUMN "pricing_type" DROP DEFAULT');
    await queryInterface.sequelize.query(`
      ALTER TABLE "quotes" ALTER COLUMN "pricing_type"
      TYPE "enum_quotes_pricing_type"
      USING CASE WHEN "pricing_type" = 'por_dia' THEN 'por_dia'::"enum_quotes_pricing_type" ELSE 'por_contrato'::"enum_quotes_pricing_type" END
    `);
    await queryInterface.sequelize.query("ALTER TABLE \"quotes\" ALTER COLUMN \"pricing_type\" SET DEFAULT 'por_contrato'");
  },
};
