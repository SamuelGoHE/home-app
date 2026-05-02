const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WorkerProfile = sequelize.define('WorkerProfile', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id:        { type: DataTypes.UUID, allowNull: false, unique: true },
  bio:            { type: DataTypes.TEXT, allowNull: true },
  specialties:    { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  years_experience: { type: DataTypes.INTEGER, defaultValue: 0 },
  certifications: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  portfolio_urls: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  is_verified:    { type: DataTypes.BOOLEAN, defaultValue: false },
  is_available:   { type: DataTypes.BOOLEAN, defaultValue: true },
  hourly_rate:    { type: DataTypes.DECIMAL(10,2), allowNull: true },
  cities_covered: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  completed_jobs: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'worker_profiles' });

module.exports = WorkerProfile;
