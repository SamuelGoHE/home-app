const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Project = sequelize.define('Project', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title:           { type: DataTypes.STRING(150), allowNull: false },
  description:     { type: DataTypes.TEXT, allowNull: true },
  status:          { type: DataTypes.ENUM('pendiente','en_revision','aprobado','en_progreso','pausado','completado','cancelado'), defaultValue: 'pendiente' },
  city:            { type: DataTypes.STRING(100), allowNull: false },
  address:         { type: DataTypes.STRING(200), allowNull: false },
  sq_meters:       { type: DataTypes.DECIMAL(8,2), allowNull: true },
  occupied:        { type: DataTypes.BOOLEAN, defaultValue: false },
  budget:          { type: DataTypes.DECIMAL(14,2), allowNull: true },
  start_date:      { type: DataTypes.DATEONLY, allowNull: true },
  end_date:        { type: DataTypes.DATEONLY, allowNull: true },
  actual_end_date: { type: DataTypes.DATEONLY, allowNull: true },
  notes:           { type: DataTypes.TEXT, allowNull: true },
  client_id:       { type: DataTypes.UUID, allowNull: false },
  worker_id:       { type: DataTypes.UUID, allowNull: true },
  admin_id:        { type: DataTypes.UUID, allowNull: true },
  service_id:      { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'projects' });

module.exports = Project;
