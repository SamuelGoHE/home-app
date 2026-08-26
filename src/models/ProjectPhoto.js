const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProjectPhoto = sequelize.define('ProjectPhoto', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  url:         { type: DataTypes.STRING, allowNull: false },
  storage_path: { type: DataTypes.STRING, allowNull: false },
  stage:       { type: DataTypes.ENUM('antes', 'durante', 'despues'), allowNull: false },
  caption:     { type: DataTypes.STRING(300), allowNull: true },
  project_id:  { type: DataTypes.UUID, allowNull: false },
  uploaded_by: { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'project_photos' });

module.exports = ProjectPhoto;
