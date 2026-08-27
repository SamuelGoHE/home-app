const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payout = sequelize.define('Payout', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  amount:           { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  status:           { type: DataTypes.ENUM('pendiente', 'aprobado', 'enviado', 'completado', 'fallido'), defaultValue: 'pendiente' },
  eligible_at:      { type: DataTypes.DATE, allowNull: false },
  approved_by:      { type: DataTypes.UUID, allowNull: true },
  approved_at:      { type: DataTypes.DATE, allowNull: true },
  wompi_payout_id:  { type: DataTypes.STRING, allowNull: true },
  failure_reason:   { type: DataTypes.TEXT, allowNull: true },
  project_id:       { type: DataTypes.UUID, allowNull: false, unique: true },
  worker_id:        { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'payouts' });

module.exports = Payout;
