const { Service } = require('../models');

class ServiceService {
  async getAllServices(query = {}) {
    const where = {};
    if (query.category) {
      where.category = query.category;
    }
    where.is_active = true;

    const services = await Service.findAll({
      where,
      order: [['name', 'ASC']]
    });
    return services;
  }

  async getServiceById(id) {
    const service = await Service.findByPk(id);
    if (!service) throw new Error('Servicio no encontrado');
    return service;
  }
}

module.exports = new ServiceService();
