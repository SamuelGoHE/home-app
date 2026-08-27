const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id:                    { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:                  { type: DataTypes.STRING(100), allowNull: false },
  email:                 { type: DataTypes.STRING(150), allowNull: false, unique: true, validate: { isEmail: true } },
  password:              { type: DataTypes.STRING, allowNull: true },
  phone:                 { type: DataTypes.STRING(20), allowNull: true },
  role:                  { type: DataTypes.ENUM('cliente', 'trabajador', 'admin', 'admin_finanzas'), defaultValue: 'cliente' },
  avatar:                { type: DataTypes.STRING, allowNull: true },
  city:                  { type: DataTypes.STRING(100), allowNull: true },
  address:               { type: DataTypes.STRING(200), allowNull: true },
  is_active:             { type: DataTypes.BOOLEAN, defaultValue: true },
  is_verified:           { type: DataTypes.BOOLEAN, defaultValue: false },
  verification_token:    { type: DataTypes.STRING, allowNull: true },
  reset_password_token:  { type: DataTypes.STRING, allowNull: true },
  reset_password_expires:{ type: DataTypes.DATE, allowNull: true },
  oauth_provider:        { type: DataTypes.ENUM('local','google','facebook','apple'), defaultValue: 'local' },
  oauth_id:              { type: DataTypes.STRING, allowNull: true },
  last_login:            { type: DataTypes.DATE, allowNull: true },
  rating_avg:            { type: DataTypes.DECIMAL(3,2), defaultValue: 0.0 },
  rating_count:          { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (u) => { if (u.password) u.password = await bcrypt.hash(u.password, 12); },
    beforeUpdate: async (u) => { if (u.changed('password') && u.password) u.password = await bcrypt.hash(u.password, 12); },
  },
});

User.prototype.comparePassword = async function(p) {
  if (!this.password) return false;
  return bcrypt.compare(p, this.password);
};

User.prototype.toSafeJSON = function() {
  const { password, verification_token, reset_password_token, ...safe } = this.toJSON();
  return safe;
};

module.exports = User;
