const { Quote, Service, Project, User } = require('../models');

class QuoteService {
  async createQuote(client_id, data) {
    const { 
      service_id, worker_id, city, address, 
      sq_meters, occupied, notes, start_date, end_date 
    } = data;
    
    // Validar existencia del servicio
    const service = await Service.findByPk(service_id);
    if (!service) throw new Error('Servicio no encontrado');

    const quote = await Quote.create({
      client_id,
      service_id,
      worker_id: worker_id || null,
      city,
      address,
      sq_meters,
      occupied,
      notes,
      start_date: start_date || null,
      end_date: end_date || null,
      status: worker_id ? 'solicitud_pendiente' : 'pendiente'
    });

    return quote;
  }

  async getMyQuotes(client_id) {
    const quotes = await Quote.findAll({
      where: { client_id },
      include: [
        { model: Service, as: 'service', attributes: ['name', 'category', 'image_url'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    return quotes;
  }

  async getWorkerQuotes(worker_id) {
    const quotes = await Quote.findAll({
      where: { worker_id },
      include: [
        { model: Service, as: 'service', attributes: ['name', 'category', 'image_url'] },
        { model: User, as: 'client', attributes: ['id', 'name', 'email', 'phone'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    return quotes;
  }

  async getAllQuotes() {
    const quotes = await Quote.findAll({
      include: [
        { model: Service, as: 'service', attributes: ['name', 'category'] },
        { model: User, as: 'client', attributes: ['id', 'name', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    return quotes;
  }
}

module.exports = new QuoteService();
