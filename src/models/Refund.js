const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Refund = sequelize.define('Refund', {
  id:                        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  bank_name:                 { type: DataTypes.STRING(100), allowNull: false },
  account_type:              { type: DataTypes.ENUM('ahorros', 'corriente'), allowNull: false },
  account_number:            { type: DataTypes.STRING(30), allowNull: false },
  account_holder_id_number:  { type: DataTypes.STRING(30), allowNull: false },
  penalty_amount:            { type: DataTypes.DECIMAL(14, 2), allowNull: true },
  refund_amount:             { type: DataTypes.DECIMAL(14, 2), allowNull: true },
  status:                    { type: DataTypes.ENUM('pendiente', 'aprobado', 'enviado', 'completado', 'fallido'), defaultValue: 'pendiente' },
  approved_by:               { type: DataTypes.UUID, allowNull: true },
  approved_at:               { type: DataTypes.DATE, allowNull: true },
  wompi_payout_id:           { type: DataTypes.STRING, allowNull: true },
  project_id:                { type: DataTypes.UUID, allowNull: false },
  client_id:                 { type: DataTypes.UUID, allowNull: false },
  payment_id:                { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'refunds' });

module.exports = Refund;
