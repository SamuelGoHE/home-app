require('dotenv').config();
const { connectDB } = require('./database');
const { User, Service } = require('../models');

const SERVICES = [
  { name: 'Pintura Interior',        category: 'pintura',            base_price: 18000,  price_unit: 'por_m2',       estimated_days: 3,  image_url: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=600&h=400&fit=crop', description: 'Pintura de paredes y techos interiores con pinturas de primera calidad.' },
  { name: 'Pintura Exterior',         category: 'pintura',            base_price: 22000,  price_unit: 'por_m2',       estimated_days: 5,  image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop', description: 'Pintura de fachadas y exteriores resistente a la intemperie.' },
  { name: 'Enchapes de Baño',         category: 'enchapes',           base_price: 45000,  price_unit: 'por_m2',       estimated_days: 4,  image_url: 'https://images.unsplash.com/photo-1521783593447-5702b9bfd267?w=600&h=400&fit=crop', description: 'Instalación de cerámica y porcelanato en baños y cocinas.' },
  { name: 'Instalaciones Eléctricas', category: 'electricidad',       base_price: null,   price_unit: 'a_convenir',   estimated_days: 2,  image_url: 'https://images.unsplash.com/photo-1558227691-41ea78d1f631?w=600&h=400&fit=crop', description: 'Instalación y reparación de sistemas eléctricos residenciales.' },
  { name: 'Plomería General',         category: 'plomeria',           base_price: null,   price_unit: 'por_hora',     estimated_days: 1,  image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&h=400&fit=crop', description: 'Instalación y reparación de tuberías, sanitarios y griferías.' },
  { name: 'Obra Gris',                category: 'obra_gris',          base_price: 280000, price_unit: 'por_m2',       estimated_days: 15, image_url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&h=400&fit=crop', description: 'Construcción de muros, columnas, vigas y structures en concreto.' },
  { name: 'Carpintería en Madera',    category: 'carpinteria',        base_price: null,   price_unit: 'por_proyecto', estimated_days: 7,  image_url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&h=400&fit=crop', description: 'Fabricación e instalación de muebles, puertas y closets a medida.' },
  { name: 'Impermeabilización',       category: 'impermeabilizacion', base_price: 35000,  price_unit: 'por_m2',       estimated_days: 2,  image_url: 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=600&h=400&fit=crop', description: 'Tratamiento impermeabilizante para terrazas, cubiertas y sótanos.' },
];

const seed = async () => {
  try {
    await connectDB();
    console.log('\n🌱 Iniciando seed...\n');

    // Admin
    const [, adminCreated] = await User.findOrCreate({
      where: { email: 'admin@home.com' },
      defaults: { name: 'Admin HOME', email: 'admin@home.com', password: 'Admin1234', role: 'admin', is_verified: true, is_active: true },
    });
    console.log(adminCreated ? '✅ Admin creado: admin@home.com / Admin1234' : 'ℹ️  Admin ya existe');

    // Worker de prueba
    const [, workerCreated] = await User.findOrCreate({
      where: { email: 'trabajador@home.com' },
      defaults: { name: 'Carlos Pintor', email: 'trabajador@home.com', password: 'Worker1234', role: 'trabajador', is_verified: true, is_active: true, phone: '3001234567', city: 'Medellín' },
    });
    console.log(workerCreated ? '✅ Trabajador creado: trabajador@home.com / Worker1234' : 'ℹ️  Trabajador ya existe');

    // Cliente de prueba
    const [, clientCreated] = await User.findOrCreate({
      where: { email: 'cliente@home.com' },
      defaults: { name: 'Ana García', email: 'cliente@home.com', password: 'Cliente1234', role: 'cliente', is_verified: true, is_active: true, phone: '3109876543', city: 'Medellín' },
    });
    console.log(clientCreated ? '✅ Cliente creado: cliente@home.com / Cliente1234' : 'ℹ️  Cliente ya existe');

    // Servicios
    let created = 0;
    for (const s of SERVICES) {
      const [service, wasCreated] = await Service.findOrCreate({ where: { name: s.name }, defaults: s });
      if (wasCreated) {
        created++;
      } else {
        await service.update({ image_url: s.image_url });
      }
    }
    console.log(`✅ Servicios: ${created} nuevos / ${SERVICES.length} total (imágenes actualizadas)`);

    console.log('\n🎉 Seed completado exitosamente\n');
    console.log('📋 Usuarios de prueba:');
    console.log('   Admin:      admin@home.com     / Admin1234');
    console.log('   Trabajador: trabajador@home.com / Worker1234');
    console.log('   Cliente:    cliente@home.com   / Cliente1234\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error en seed:', err.message);
    process.exit(1);
  }
};

seed();
