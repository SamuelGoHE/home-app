jest.mock('../src/models', () => ({
  Service: { findAll: jest.fn(), findByPk: jest.fn() },
}));

const serviceService = require('../src/services/serviceService');
const { Service } = require('../src/models');

describe('serviceService.getAllServices', () => {
  beforeEach(() => jest.clearAllMocks());

  test('siempre restringe a servicios activos y ordena por nombre', async () => {
    Service.findAll.mockResolvedValue([]);

    await serviceService.getAllServices();

    expect(Service.findAll).toHaveBeenCalledWith({
      where: { is_active: true },
      order: [['name', 'ASC']],
    });
  });

  test('filtra por categoría cuando se indica, manteniendo el filtro de activos', async () => {
    Service.findAll.mockResolvedValue([]);

    await serviceService.getAllServices({ category: 'pintura' });

    expect(Service.findAll).toHaveBeenCalledWith({
      where: { category: 'pintura', is_active: true },
      order: [['name', 'ASC']],
    });
  });

  test('devuelve lo que resuelve Service.findAll', async () => {
    const rows = [{ id: 's-1', name: 'Pintura' }];
    Service.findAll.mockResolvedValue(rows);

    await expect(serviceService.getAllServices()).resolves.toBe(rows);
  });
});

describe('serviceService.getServiceById', () => {
  beforeEach(() => jest.clearAllMocks());

  test('devuelve el servicio cuando existe', async () => {
    const svc = { id: 's-1', name: 'Pintura' };
    Service.findByPk.mockResolvedValue(svc);

    await expect(serviceService.getServiceById('s-1')).resolves.toBe(svc);
  });

  test('lanza error cuando el servicio no existe', async () => {
    Service.findByPk.mockResolvedValue(null);

    await expect(serviceService.getServiceById('nope')).rejects.toThrow('Servicio no encontrado');
  });
});
