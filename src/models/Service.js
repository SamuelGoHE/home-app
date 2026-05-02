const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Service = sequelize.define('Service', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:           { type: DataTypes.STRING(100), allowNull: false },
  description:    { type: DataTypes.TEXT, allowNull: true },
  category:       { type: DataTypes.ENUM('pintura','enchapes','electricidad','plomeria','obra_gris','carpinteria','impermeabilizacion','otro'), allowNull: false },
  base_price:     { type: DataTypes.DECIMAL(12,2), allowNull: true },
  price_unit:     { type: DataTypes.ENUM('por_hora','por_m2','por_proyecto','a_convenir'), defaultValue: 'a_convenir' },
  image_url:      { type: DataTypes.STRING, allowNull: true },
  is_active:      { type: DataTypes.BOOLEAN, defaultValue: true },
  estimated_days: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'services' });

module.exports = Service;
