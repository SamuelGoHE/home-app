jest.mock('../src/models', () => ({
  Project: { findByPk: jest.fn(), create: jest.fn() },
  Task: { findByPk: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
  Service: { findByPk: jest.fn() },
  User: { findOne: jest.fn(), findByPk: jest.fn() },
  Quote: { findByPk: jest.fn(), create: jest.fn() },
  WorkerServiceRate: { findOne: jest.fn() },
  Payment: { findOne: jest.fn() },
}));

jest.mock('sequelize', () => ({
  Op: { in: Symbol('in'), ne: Symbol('ne'), iLike: Symbol('iLike') },
}));

jest.mock('../src/services/refundService', () => ({
  createRefundRequest: jest.fn(),
}));

const svc = require('../src/services/projectService');
const { Project, Task, Service, User, Quote, WorkerServiceRate, Payment } = require('../src/models');
const refundService = require('../src/services/refundService');

describe('projectService permission checks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('denies project access to worker without assigned tasks', async () => {
    Project.findByPk.mockResolvedValue({ id: 'project-1', client_id: 'client-1' });
    Task.count.mockResolvedValue(0);

    await expect(
      svc.getProjectById('project-1', { id: 'worker-1', role: 'trabajador' })
    ).rejects.toMatchObject({ statusCode: 403, message: 'Sin acceso a este proyecto' });
  });

  test('denies task updates for non-admin non-worker users', async () => {
    Task.findByPk.mockResolvedValue({
      id: 'task-1',
      assigned_to: 'worker-1',
      project_id: 'project-1',
      update: jest.fn(),
      reload: jest.fn(),
      project: { update: jest.fn() },
    });

    await expect(
      svc.updateTask('task-1', { status: 'en_progreso' }, { id: 'client-1', role: 'cliente' })
    ).rejects.toMatchObject({ statusCode: 403, message: 'Sin acceso a esta tarea' });
  });

  test('approving quote creates a project and initial task', async () => {
    const quoteUpdate = jest.fn();
    const quoteReload = jest.fn().mockResolvedValue({ id: 'quote-1', status: 'aceptada', project_id: 'project-1' });
    Quote.findByPk.mockResolvedValue({
      id: 'quote-1',
      city: 'Medellin',
      address: 'Calle 1',
      notes: 'nota',
      sq_meters: 55,
      occupied: false,
      estimated_price: 1000000,
      start_date: null,
      end_date: null,
      client_id: 'client-1',
      service_id: 'service-1',
      project_id: null,
      service: { name: 'Pintura' },
      update: quoteUpdate,
      reload: quoteReload,
    });
    Project.create.mockResolvedValue({ id: 'project-1' });
    Task.create.mockResolvedValue({ id: 'task-1' });

    // Firma vigente: (quoteId, status, estimatedPrice, user, io)
    const result = await svc.updateQuoteStatus('quote-1', 'aceptada', null, { id: 'admin-1', role: 'admin' });

    expect(Project.create).toHaveBeenCalled();
    expect(Task.create).toHaveBeenCalledWith(expect.objectContaining({ project_id: 'project-1', created_by: 'admin-1' }));
    expect(quoteUpdate).toHaveBeenCalledWith({ status: 'aceptada', project_id: 'project-1', agreed_price: 1000000 });
    expect(result).toMatchObject({ id: 'quote-1', status: 'aceptada', project_id: 'project-1' });
  });

  test('client cannot accept or reject their own quote (worker-only action)', async () => {
    Quote.findByPk.mockResolvedValue({
      id: 'quote-1',
      worker_id: 'worker-1',
      client_id: 'client-1',
      status: 'solicitud_pendiente',
      estimated_price: 500000,
      update: jest.fn(),
    });

    await expect(
      svc.updateQuoteStatus('quote-1', 'aceptada', null, { id: 'client-1', role: 'cliente' })
    ).rejects.toMatchObject({ statusCode: 403, message: 'Sin permiso' });
  });

  test('worker accepting a quote uses its fixed price as the project budget', async () => {
    const quoteUpdate = jest.fn();
    const quoteReload = jest.fn().mockResolvedValue({ id: 'quote-1', status: 'aceptada', project_id: 'project-2' });
    Quote.findByPk.mockResolvedValue({
      id: 'quote-1',
      worker_id: 'worker-1',
      client_id: 'client-1',
      city: 'Medellin',
      address: 'Calle 1',
      sq_meters: null,
      occupied: false,
      start_date: null,
      end_date: null,
      service_id: 'service-1',
      project_id: null,
      status: 'solicitud_pendiente',
      estimated_price: 700000,
      service: { name: 'Plomería' },
      update: quoteUpdate,
      reload: quoteReload,
    });
    Project.create.mockResolvedValue({ id: 'project-2' });
    Task.create.mockResolvedValue({ id: 'task-2' });

    await svc.updateQuoteStatus('quote-1', 'aceptada', null, { id: 'worker-1', role: 'trabajador' });

    expect(Project.create).toHaveBeenCalledWith(expect.objectContaining({ budget: 700000 }));
    expect(quoteUpdate).toHaveBeenCalledWith({ status: 'aceptada', project_id: 'project-2', agreed_price: 700000 });
  });
});

describe('projectService.updateProjectStatus — cancelación y reembolsos', () => {
  beforeEach(() => jest.clearAllMocks());

  test('cancelling a project with no approved initial payment does not create a refund request', async () => {
    const update = jest.fn().mockResolvedValue();
    const reload = jest.fn().mockResolvedValue({ id: 'p1', status: 'cancelado' });
    Project.findByPk.mockResolvedValue({ id: 'p1', client_id: 'c1', update, reload });
    Payment.findOne.mockResolvedValue(null);

    await svc.updateProjectStatus('p1', 'cancelado', { id: 'c1', role: 'cliente' });

    expect(refundService.createRefundRequest).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({ status: 'cancelado' });
  });

  test('cancelling a project with an approved initial payment creates a refund request with the bank details provided', async () => {
    const update = jest.fn().mockResolvedValue();
    const reload = jest.fn().mockResolvedValue({ id: 'p1', status: 'cancelado' });
    const project = { id: 'p1', client_id: 'c1', update, reload };
    Project.findByPk.mockResolvedValue(project);
    const approvedPayment = { id: 'pay1', type: 'inicial', status: 'aprobado' };
    Payment.findOne.mockResolvedValue(approvedPayment);
    const bankDetails = { bank_name: 'Bancolombia', account_type: 'ahorros', account_number: '123', account_holder_id_number: '456' };

    await svc.updateProjectStatus('p1', 'cancelado', { id: 'c1', role: 'cliente' }, bankDetails);

    expect(refundService.createRefundRequest).toHaveBeenCalledWith(project, approvedPayment, bankDetails);
  });
});

describe('projectService.createQuote — precio tomado de la tarifa publicada', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Service.findByPk.mockResolvedValue({ id: 'srv-1', name: 'Pintura', category: 'pintura' });
    User.findOne.mockResolvedValue({ id: 'w-1', role: 'trabajador' });
    User.findByPk.mockResolvedValue({ id: 'c-1', name: 'Cliente' });
    Quote.create.mockImplementation(async (payload) => ({ id: 'q-1', ...payload }));
  });

  const baseData = { service_id: 'srv-1', worker_id: 'w-1', city: 'Medellin', address: 'Calle 1' };

  test('rechaza la solicitud si el trabajador no publicó precio para la categoría', async () => {
    WorkerServiceRate.findOne.mockResolvedValue(null);

    await expect(svc.createQuote(baseData, 'c-1'))
      .rejects.toMatchObject({ statusCode: 400, message: 'Este trabajador no tiene un precio publicado para este servicio' });
  });

  test('por_dia: congela la tarifa como estimated_price y conserva end_date', async () => {
    WorkerServiceRate.findOne.mockResolvedValue({ id: 'rate-1', price_unit: 'por_dia', amount: '80000.00' });

    const quote = await svc.createQuote({ ...baseData, end_date: '2026-09-10' }, 'c-1');

    expect(quote.pricing_type).toBe('por_dia');
    expect(quote.estimated_price).toBe(80000);
    expect(quote.end_date).toBe('2026-09-10');
    expect(quote.service_rate_id).toBe('rate-1');
  });

  test('por_m2: multiplica la tarifa por los metros e ignora end_date', async () => {
    WorkerServiceRate.findOne.mockResolvedValue({ id: 'rate-2', price_unit: 'por_m2', amount: '25000.00' });

    const quote = await svc.createQuote({ ...baseData, sq_meters: 40, end_date: '2026-09-10' }, 'c-1');

    expect(quote.estimated_price).toBe(1000000);
    expect(quote.end_date).toBeNull();
  });

  test('a_convenir: deja estimated_price en null pero registra la tarifa usada', async () => {
    WorkerServiceRate.findOne.mockResolvedValue({ id: 'rate-3', price_unit: 'a_convenir', amount: null });

    const quote = await svc.createQuote(baseData, 'c-1');

    expect(quote.estimated_price).toBeNull();
    expect(quote.service_rate_id).toBe('rate-3');
  });
});
