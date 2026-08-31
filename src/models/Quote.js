const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Quote = sequelize.define('Quote', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  status:          { type: DataTypes.ENUM('solicitud_pendiente','pendiente','revisada','aceptada','rechazada','expirada'), defaultValue: 'solicitud_pendiente' },
  city:            { type: DataTypes.STRING(100), allowNull: false },
  address:         { type: DataTypes.STRING(200), allowNull: false },
  sq_meters:       { type: DataTypes.DECIMAL(8,2), allowNull: true },
  occupied:        { type: DataTypes.BOOLEAN, defaultValue: false },
  start_date:      { type: DataTypes.DATEONLY, allowNull: true },
  end_date:        { type: DataTypes.DATEONLY, allowNull: true },
  estimated_price: { type: DataTypes.DECIMAL(14,2), allowNull: true }, // foto del precio publicado al enviar la solicitud
  pricing_type:    { type: DataTypes.STRING(20), defaultValue: 'a_convenir' },
  estimated_days:  { type: DataTypes.INTEGER, allowNull: true }, // solo aplica si pricing_type = 'por_dia'
  agreed_price:    { type: DataTypes.DECIMAL(14,2), allowNull: true }, // se llena al aceptar — precio final del proyecto
  notes:           { type: DataTypes.TEXT, allowNull: true },
  expires_at:      { type: DataTypes.DATE, allowNull: true },
  client_id:       { type: DataTypes.UUID, allowNull: false },
  service_id:      { type: DataTypes.UUID, allowNull: false },
  worker_id:       { type: DataTypes.UUID, allowNull: true },
  service_rate_id: { type: DataTypes.UUID, allowNull: true },
  project_id:      { type: DataTypes.UUID, allowNull: true },
}, { tableName: 'quotes' });

module.exports = Quote;
