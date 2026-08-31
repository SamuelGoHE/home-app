const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Una tarifa publicada por un trabajador para una especialidad concreta.
// No se relaciona con el catálogo por id porque una especialidad puede cubrir varios
// servicios del mismo oficio (por ejemplo, pintura interior y exterior).
const WorkerServiceRate = sequelize.define('WorkerServiceRate', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  worker_id: { type: DataTypes.UUID, allowNull: false },
  specialty: { type: DataTypes.STRING(50), allowNull: false },
  price_unit: {
    type: DataTypes.ENUM('por_hora', 'por_dia', 'por_m2', 'por_proyecto', 'a_convenir'),
    allowNull: false,
  },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  includes_materials: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  note: { type: DataTypes.STRING(280), allowNull: true },
}, { tableName: 'worker_service_rates' });

module.exports = WorkerServiceRate;
