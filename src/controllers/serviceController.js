const serviceService = require('../services/serviceService');

const getServices = async (req, res, next) => {
  try {
    const services = await serviceService.getAllServices(req.query);
    // El frontend espera `{ data: [...] }` para la lista de servicios o el array directo.
    // Usaremos el estándar { success: true, data: services }
    res.json({ success: true, data: services });
  } catch (error) {
    next(error);
  }
};

const getService = async (req, res, next) => {
  try {
    const service = await serviceService.getServiceById(req.params.id);
    res.json({ success: true, data: service });
  } catch (error) {
    if (error.message === 'Servicio no encontrado') {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = {
  getServices,
  getService
};
