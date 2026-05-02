const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Rating = sequelize.define('Rating', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    score: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
    comment: { type: DataTypes.TEXT, allowNull: true },
    // Quién califica a quién y en qué contexto
    reviewer_id: { type: DataTypes.UUID, allowNull: false }, // cliente que califica
    worker_id: { type: DataTypes.UUID, allowNull: false }, // trabajador calificado
    project_id: { type: DataTypes.UUID, allowNull: false }, // proyecto del que viene
}, {
    tableName: 'ratings',
    // Un cliente solo puede calificar una vez por proyecto
    indexes: [{ unique: true, fields: ['reviewer_id', 'project_id'] }],
});

module.exports = Rating;