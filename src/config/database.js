const { Sequelize } = require('sequelize');
require('dotenv').config();



const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'home_db',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  logging: process.env.NODE_ENV === 'development' ? false : false,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  define: { timestamps: true, underscored: true },
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL conectado');
    await sequelize.sync({ alter: true });
    console.log('✅ Modelos sincronizados');
  } catch (error) {
    console.error('❌ Error PostgreSQL:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
