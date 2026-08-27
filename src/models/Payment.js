const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
  id:                    { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  type:                  { type: DataTypes.ENUM('inicial', 'final'), allowNull: false },
  amount:                { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  wompi_reference:       { type: DataTypes.STRING, allowNull: false, unique: true },
  wompi_transaction_id:  { type: DataTypes.STRING, allowNull: true },
  payment_method:        { type: DataTypes.STRING(20), allowNull: true },
  status:                { type: DataTypes.ENUM('pendiente', 'aprobado', 'declinado', 'error'), defaultValue: 'pendiente' },
  paid_at:               { type: DataTypes.DATE, allowNull: true },
  project_id:            { type: DataTypes.UUID, allowNull: false },
  client_id:             { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'payments' });

module.exports = Payment;
