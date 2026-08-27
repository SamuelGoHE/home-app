const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WorkerPayoutAccount = sequelize.define('WorkerPayoutAccount', {
  id:                        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  bank_name:                 { type: DataTypes.STRING(100), allowNull: false },
  account_type:              { type: DataTypes.ENUM('ahorros', 'corriente'), allowNull: false },
  account_number_last4:      { type: DataTypes.STRING(4), allowNull: false },
  account_holder_id_number:  { type: DataTypes.STRING(30), allowNull: false },
  wompi_recipient_id:        { type: DataTypes.STRING, allowNull: true },
  verified:                  { type: DataTypes.BOOLEAN, defaultValue: false },
  verified_by:               { type: DataTypes.UUID, allowNull: true },
  verified_at:               { type: DataTypes.DATE, allowNull: true },
  worker_id:                 { type: DataTypes.UUID, allowNull: false, unique: true },
}, { tableName: 'worker_payout_accounts' });

module.exports = WorkerPayoutAccount;
