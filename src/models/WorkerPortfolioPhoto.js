const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WorkerPortfolioPhoto = sequelize.define('WorkerPortfolioPhoto', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  url:          { type: DataTypes.STRING, allowNull: false },
  storage_path: { type: DataTypes.STRING, allowNull: false },
  specialty:    { type: DataTypes.ENUM('pintura','enchapes','electricidad','plomeria','obra_gris','carpinteria','impermeabilizacion','otro'), allowNull: false },
  caption:      { type: DataTypes.STRING(300), allowNull: true },
  worker_id:    { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'worker_portfolio_photos' });

module.exports = WorkerPortfolioPhoto;
