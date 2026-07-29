require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

// Si hay DATABASE_URL (Supabase / Heroku / Railway) se usa la cadena completa con SSL.
const urlConfig = {
  use_env_variable: 'DATABASE_URL',
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false },
  },
  define: { timestamps: true, underscored: true },
};

const localConfig = (database) => ({
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database,
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  dialect:  'postgres',
  logging:  false,
  define:   { timestamps: true, underscored: true },
});

module.exports = {
  development: process.env.DATABASE_URL
    ? urlConfig
    : localConfig(process.env.DB_NAME || 'home_db'),
  test: localConfig(process.env.DB_NAME_TEST || `${process.env.DB_NAME || 'home_db'}_test`),
  production: {
    ...urlConfig,
    pool: { max: 20, min: 2, acquire: 30000, idle: 10000 },
  },
};
