'use strict';
const { v4: uuidv4 } = require('uuid');

const SERVICES = [
  { name: 'Pintura Interior',        category: 'pintura',            base_price: 18000,  price_unit: 'por_m2',       estimated_days: 3,  image_url: null, description: 'Pintura de paredes y techos interiores con pinturas de primera calidad.' },
  { name: 'Pintura Exterior',         category: 'pintura',            base_price: 22000,  price_unit: 'por_m2',       estimated_days: 5,  image_url: null, description: 'Pintura de fachadas y exteriores resistente a la intemperie.' },
  { name: 'Enchapes de Baño',         category: 'enchapes',           base_price: 45000,  price_unit: 'por_m2',       estimated_days: 4,  image_url: null, description: 'Instalación de cerámica y porcelanato en baños y cocinas.' },
  { name: 'Instalaciones Eléctricas', category: 'electricidad',       base_price: null,   price_unit: 'a_convenir',   estimated_days: 2,  image_url: null, description: 'Instalación y reparación de sistemas eléctricos residenciales.' },
  { name: 'Plomería General',         category: 'plomeria',           base_price: null,   price_unit: 'por_hora',     estimated_days: 1,  image_url: null, description: 'Instalación y reparación de tuberías, sanitarios y griferías.' },
  { name: 'Obra Gris',                category: 'obra_gris',          base_price: 280000, price_unit: 'por_m2',       estimated_days: 15, image_url: null, description: 'Construcción de muros, columnas, vigas y estructuras en concreto.' },
  { name: 'Carpintería en Madera',    category: 'carpinteria',        base_price: null,   price_unit: 'por_proyecto', estimated_days: 7,  image_url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&h=400&fit=crop', description: 'Fabricación e instalación de muebles, puertas y closets a medida.' },
  { name: 'Impermeabilización',       category: 'impermeabilizacion', base_price: 35000,  price_unit: 'por_m2',       estimated_days: 2,  image_url: null, description: 'Tratamiento impermeabilizante para terrazas, cubiertas y sótanos.' },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const existing = await queryInterface.sequelize.query(
      'SELECT name FROM services',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const existingNames = new Set(existing.map(r => r.name));

    const toInsert = SERVICES
      .filter(s => !existingNames.has(s.name))
      .map(s => ({ id: uuidv4(), ...s, is_active: true, created_at: now, updated_at: now }));

    if (toInsert.length > 0) {
      await queryInterface.bulkInsert('services', toInsert);
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('services', {
      name: SERVICES.map(s => s.name),
    });
  },
};
