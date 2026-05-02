const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Task = sequelize.define('Task', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title:           { type: DataTypes.STRING(150), allowNull: false },
  description:     { type: DataTypes.TEXT, allowNull: true },
  status:          { type: DataTypes.ENUM('pendiente','en_progreso','en_revision','completada','bloqueada'), defaultValue: 'pendiente' },
  priority:        { type: DataTypes.ENUM('baja','media','alta','urgente'), defaultValue: 'media' },
  due_date:        { type: DataTypes.DATEONLY, allowNull: true },
  completed_at:    { type: DataTypes.DATE, allowNull: true },
  estimated_hours: { type: DataTypes.DECIMAL(6,2), allowNull: true },
  actual_hours:    { type: DataTypes.DECIMAL(6,2), allowNull: true },
  notes:           { type: DataTypes.TEXT, allowNull: true },
  evidence_urls:   { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  project_id:      { type: DataTypes.UUID, allowNull: false },
  assigned_to:     { type: DataTypes.UUID, allowNull: true },
  created_by:      { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'tasks' });

module.exports = Task;
