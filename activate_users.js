const { User } = require('./src/models');

async function activateAll() {
  try {
    const [count] = await User.update({ is_active: true }, { where: {} });
    console.log(`✅ Éxito: Se han activado ${count} usuarios.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error actualizando usuarios:', err);
    process.exit(1);
  }
}

activateAll();
